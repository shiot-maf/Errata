import { deleteDoc, doc, getDoc, runTransaction } from "firebase/firestore"
import { db } from "./client"
import { isDemo } from "../demo/store"
import { normalizeHandle } from "../handle"

/**
 * 핸들 잡기.
 *
 * Firestore에는 "이 필드는 유일해야 한다"는 제약이 없다. 그래서 이름 자체를
 * 문서 id로 쓰는 컬렉션(handles/{handle})을 두고 먼저 만든 사람이 갖는다.
 * 확인과 생성을 트랜잭션 하나로 묶으므로, 둘이 같은 순간에 같은 이름을
 * 눌러도 한 명만 갖는다.
 */

const handleRef = (handle: string) => doc(db, "handles", handle)
const userRef = (uid: string) => doc(db, "diaryUsers", uid)

export class HandleError extends Error {
  constructor(
    message: string,
    readonly kind: "taken" | "denied" | "demo" | "unknown",
  ) {
    super(message)
    this.name = "HandleError"
  }
}

/** 이 이름이 비어 있는가. 가입 화면에서 로그인 전에도 물어본다. */
export async function isHandleFree(handle: string): Promise<boolean> {
  const id = normalizeHandle(handle)
  if (!id) return false
  const snap = await getDoc(handleRef(id))
  return !snap.exists()
}

/** 이 이름은 누구인가. 나중에 친구를 찾을 때 쓴다. */
export async function uidForHandle(handle: string): Promise<string | null> {
  const snap = await getDoc(handleRef(normalizeHandle(handle)))
  return snap.exists() ? ((snap.data().uid as string) ?? null) : null
}

/**
 * 이름을 잡는다. 이미 다른 이름을 갖고 있으면 그것을 놓아준다.
 *
 * 프로필 문서의 handle 필드는 화면이 읽는 곳이고, handles 컬렉션은 유일성을
 * 지키는 곳이다. 둘이 어긋나면 곤란하므로 같은 트랜잭션에서 함께 쓴다.
 */
export async function claimHandle(
  uid: string,
  input: string,
  previous?: string | null,
): Promise<string> {
  if (isDemo()) {
    throw new HandleError("데모 모드에서는 핸들을 정할 수 없어요.", "demo")
  }

  const handle = normalizeHandle(input)
  const before = previous ? normalizeHandle(previous) : null

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(handleRef(handle))
      if (snap.exists()) {
        // 새로고침하다 두 번 눌렀을 뿐이라면 이미 내 것이다
        if (snap.data().uid === uid) return
        throw new HandleError("이미 누가 쓰고 있는 이름이에요.", "taken")
      }
      tx.set(handleRef(handle), { uid, createdAt: Date.now() })
      tx.update(userRef(uid), { handle })
    })
  } catch (e) {
    throw toHandleError(e)
  }

  // 옛 이름은 트랜잭션 밖에서 놓아준다. 여기서 실패해도 새 이름은 이미
  // 내 것이므로, 이름이 없어지는 것보다 하나 남는 편이 낫다.
  if (before && before !== handle) {
    await deleteDoc(handleRef(before)).catch(() => {})
  }

  return handle
}

function toHandleError(e: unknown): HandleError {
  if (e instanceof HandleError) return e
  const code = (e as { code?: string }).code ?? ""
  if (code === "permission-denied") {
    return new HandleError(
      "핸들을 저장할 권한이 없어요. Firestore 규칙을 아직 게시하지 않았을 수 있어요.",
      "denied",
    )
  }
  return new HandleError("핸들을 정하지 못했어요. 잠시 후 다시 시도해주세요.", "unknown")
}

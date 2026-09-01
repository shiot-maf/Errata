import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { auth } from "./client"
import { ensureProfile, setProfileName } from "./db"

const provider = new GoogleAuthProvider()

export function signInWithGoogle() {
  return signInWithPopup(auth, provider)
}

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

/**
 * 이 사이트에 직접 가입한다.
 *
 * 계정이 만들어지는 순간 onAuthStateChanged가 울리고, AuthProvider가 곧바로
 * 프로필 문서를 만든다. 그런데 그 시점의 displayName은 아직 비어 있다 —
 * 이름은 계정이 생긴 뒤에야 붙일 수 있기 때문이다. 그래서 이름을 붙이고,
 * 문서가 있는지 확인하고(없으면 여기서 만들고), 이름만 한 번 덮는다.
 * 경합을 이기려 하지 않고 마지막에 확실히 맞춘다.
 */
export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
  const displayName = name.trim()

  await updateProfile(user, { displayName })
  await ensureProfile({
    uid: user.uid,
    displayName,
    email: user.email,
    photoURL: null,
  })
  await setProfileName(user.uid, displayName)

  // 확인 메일은 보내되 막지는 않는다. 첫 일기를 쓰러 온 사람을 메일함으로
  // 돌려보내면 대부분 돌아오지 않는다.
  await sendEmailVerification(user).catch(() => {})

  return user
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim())
}

export function signOutUser() {
  return signOut(auth)
}

export function onAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb)
}

/**
 * Firebase의 오류 코드를 사람 말로.
 *
 * 코드를 그대로 흘리면 "auth/invalid-credential"이 화면에 뜬다. 무엇을
 * 해야 하는지 말해주는 편이 낫다.
 */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? ""
  switch (code) {
    case "auth/email-already-in-use":
      return "이미 가입된 이메일이에요. 로그인해주세요."
    case "auth/invalid-email":
      return "이메일 주소 형식이 아니에요."
    case "auth/weak-password":
      return "비밀번호가 너무 짧아요. 6자 이상으로 해주세요."
    case "auth/missing-password":
      return "비밀번호를 입력해주세요."
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "이메일이나 비밀번호가 맞지 않아요."
    case "auth/too-many-requests":
      return "시도가 너무 잦아요. 잠시 후 다시 해주세요."
    case "auth/network-request-failed":
      return "네트워크에 연결하지 못했어요."
    case "auth/popup-closed-by-user":
      return "로그인 창이 닫혔어요."
    case "auth/unauthorized-domain":
      return "이 도메인이 Firebase에 등록되지 않았어요. 콘솔의 승인된 도메인에 추가해주세요."
    case "auth/operation-not-allowed":
      // 콘솔에서 이메일 로그인을 켜지 않았을 때. 코드를 그대로 보여주면
      // 사용자는 자기 잘못인 줄 안다.
      return "이메일 가입이 아직 켜져 있지 않아요. (Firebase 콘솔 → Authentication → Sign-in method)"
    default:
      return "문제가 생겼어요. 잠시 후 다시 시도해주세요."
  }
}

export type { User }

/**
 * 핸들 — 이 사이트에서 나를 가리키는 하나뿐인 이름.
 *
 * 이름(displayName)은 겹쳐도 된다. 같은 이름을 쓰는 사람이 여럿 있어도
 * 아무 문제가 없다. 하지만 친구를 찾고 프로필을 가리키려면 겹치지 않는
 * 열쇠가 하나 필요하다. 그게 핸들이다.
 *
 * 규칙은 좁게 잡았다. 소문자·숫자·밑줄만 받는다 — 대소문자를 섞어 받으면
 * Errata와 errata가 다른 사람이 되고, 그건 사람을 속이기 좋은 구조다.
 * 하이픈도 뺐다. 밑줄 하나로 충분하고 둘 다 받으면 헷갈리는 짝이 늘어난다.
 */

export const HANDLE_MIN = 3
export const HANDLE_MAX = 20

/** 입력을 그대로 믿지 않고 한 번 다듬는다 — 앞의 @와 공백, 대문자를 없앤다 */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase()
}

/**
 * 주소로 쓸 수 있는 말들. 나중에 /@handle이나 /u/handle을 열 때
 * 화면 이름과 사람 이름이 부딪히면 곤란하다. 미리 비워둔다.
 */
const RESERVED = new Set([
  "admin", "administrator", "root", "system", "support", "help", "about",
  "errata", "official", "staff", "team", "api", "auth", "login", "logout",
  "signup", "signin", "register", "settings", "profile", "me", "you", "user",
  "users", "new", "edit", "delete", "search", "explore", "home", "index",
  "history", "saved", "report", "review", "friends", "friend", "demo", "test",
  "null", "undefined", "true", "false",
])

export type HandleProblem =
  | { ok: true }
  | { ok: false; reason: string }

export function checkHandle(input: string): HandleProblem {
  const handle = normalizeHandle(input)

  if (!handle) return { ok: false, reason: "핸들을 입력해주세요." }
  if (handle.length < HANDLE_MIN) {
    return { ok: false, reason: `${HANDLE_MIN}자 이상이어야 해요.` }
  }
  if (handle.length > HANDLE_MAX) {
    return { ok: false, reason: `${HANDLE_MAX}자까지 쓸 수 있어요.` }
  }
  if (!/^[a-z0-9_]+$/.test(handle)) {
    return { ok: false, reason: "영문 소문자, 숫자, 밑줄(_)만 쓸 수 있어요." }
  }
  if (!/^[a-z]/.test(handle)) {
    return { ok: false, reason: "영문자로 시작해야 해요." }
  }
  if (RESERVED.has(handle)) {
    return { ok: false, reason: "이미 쓰이는 말이라 고를 수 없어요." }
  }
  return { ok: true }
}

/** 화면에 보일 때는 늘 @를 붙인다 */
export function formatHandle(handle: string): string {
  return `@${handle}`
}

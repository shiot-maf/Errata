/**
 * 브라우저에 남기는 값들의 열쇠.
 *
 * 한곳에 모아둔 이유는 이름 때문이다. 이 앱은 EchoDiary라는 이름으로 시작해서
 * ERRATA가 됐는데, 저장 열쇠는 `echodiary.*`로 남아 있다. 바꾸면 이미 쓰고 있는
 * 사람의 API 키·초안·글자 크기가 한 번에 사라지므로 그대로 둔다. 대신 흩어져
 * 있던 문자열을 여기 모아서, 다음에 이름을 옮길 때 무엇을 옮겨야 하는지가
 * 한 화면에 보이게 했다. (테마만 나중에 추가돼서 `errata.` 접두사를 쓴다.)
 */
export const STORAGE_KEYS = {
  /** sessionStorage 또는 localStorage — 사용자가 고른다 */
  apiKey: "echodiary.anthropicKey",
  /** "이 기기에서 기억"을 켰는지 */
  rememberKey: "echodiary.rememberKey",
  model: "echodiary.model",
  /**
   * Anthropic 워크스페이스 id. 키가 아니라 어느 워크스페이스로 청구할지를
   * 가리키는 이름표라서 비밀이 아니고, 기기에 그대로 남긴다.
   */
  workspaceId: "echodiary.workspaceId",
  /** 어느 제공자로 첨삭할지 — "anthropic" | "compat" */
  provider: "echodiary.provider",
  /** OpenAI 호환 제공자의 키 (Anthropic 키와 따로 둔다) */
  compatKey: "echodiary.compatKey",
  compatBaseUrl: "echodiary.compatBaseUrl",
  compatModel: "echodiary.compatModel",
  textSize: "echodiary.textSize",
  /** 아직 저장하지 않은 일기 */
  draft: "echodiary.draft",
  /** sessionStorage — 데모 모드로 들어와 있는지 */
  demo: "echodiary.demo",
  theme: "errata.theme",
} as const

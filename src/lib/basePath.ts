/**
 * Next는 <Link>와 라우터에만 basePath를 붙인다. 생 <a>에는 붙지 않는다.
 * 그래서 하위 경로 배포(/Toothbrush/errata)에서 <a href="/?demo=1">는
 * 앱이 아니라 도메인 루트(shiot-maf.github.io)로 나가버린다.
 *
 * 데모 진입·이탈은 전체 새로고침이어야 한다 — demo/store의 state가 모듈
 * 싱글턴이라 소프트 내비게이션으로는 초기화되지 않는다. 그래서 <Link>로
 * 바꾸는 대신 <a>를 유지하고 여기서 주소를 만든다.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/** 앱 내부 절대 경로를 배포 위치에 맞는 주소로 만든다. */
export function appUrl(path: string): string {
  return `${BASE_PATH}${path}`
}

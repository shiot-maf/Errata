import type { NextConfig } from "next"

/**
 * 이 앱은 오래 서버 없이 굴러왔다 — 인증도 데이터도 AI 호출도 전부 브라우저에서
 * 일어나서, 정적으로 내보내 GitHub Pages에 올리면 그만이었다.
 *
 * 학원용 기능(학원 키로 대신 첨삭하기, 선생님이 학생 계정 발급하기)이 들어오면서
 * 서버가 필요해졌다. 그 둘은 브라우저에서 할 수 없다 — 학원 키가 브라우저에
 * 내려가면 그건 이미 학원 키가 아니고, 계정 발급은 관리자 권한이 필요하다.
 *
 * 그래서 기본값을 "서버가 있는 Next 앱"으로 바꾸고, 정적 내보내기는 옵션으로
 * 남겼다. STATIC_EXPORT=1이면 예전처럼 out/ 폴더가 나온다 — 서버가 필요한
 * 기능이 없는 동안에는 Pages 배포도 계속 돈다.
 */
const staticExport = process.env.STATIC_EXPORT === "1"

/** 하위 경로에 올릴 때만 쓴다 (GitHub Pages의 /Errata). Vercel에서는 비운다. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(staticExport ? { output: "export" as const } : {}),
  basePath,
  assetPrefix: basePath || undefined,
  // 주소 모양은 두 배포에서 같아야 한다. Pages는 /foo를 /foo/index.html로
  // 서빙하고, 그 모양에 맞춰 만든 링크가 이미 여기저기 있다.
  trailingSlash: true,
  // 프로필 사진은 구글에서 그대로 받아온다. 최적화를 켜면 호스트를
  // 따로 등록해야 하는데, 사진 한 장 때문에 그럴 이유가 없다.
  images: { unoptimized: true },
}

export default nextConfig

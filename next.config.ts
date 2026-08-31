import type { NextConfig } from "next"

/**
 * 이 앱은 서버 코드가 하나도 없다 — 인증도 데이터도 AI 호출도 전부 브라우저에서
 * 일어난다. 그래서 정적으로 내보내면 GitHub Pages든 Vercel이든 Firebase Hosting이든
 * 어디에나 그대로 올릴 수 있다.
 *
 * BASE_PATH는 하위 경로에 올릴 때 쓴다 (예: GitHub Pages의 /Toothbrush/errata).
 * 루트 도메인에 올릴 때는 비워두면 된다.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  // Pages는 /foo 를 /foo/index.html 로 서빙한다
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig

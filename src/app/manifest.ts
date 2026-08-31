import type { MetadataRoute } from "next"

/** PWA 매니페스트. 홈 화면에 추가하면 주소창 없이 앱처럼 뜬다. */
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

// 정적 내보내기에서는 매니페스트도 빌드 시점에 한 번 구워야 한다
export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ERRATA — 틀린 것을 세어 두는 일기",
    short_name: "ERRATA",
    description:
      "영어일기를 쓰고 첨삭받으며, 내가 반복해서 틀리는 지점을 데이터로 모읍니다.",
    start_url: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f1",
    theme_color: "#faf7f1",
    lang: "ko",
    icons: [
      { src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: `${base}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
  }
}

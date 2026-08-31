import type { Metadata, Viewport } from "next"
import "./fonts"
import "./globals.css"
import { AuthProvider } from "@/components/AuthProvider"
import { AppShell } from "@/components/AppShell"
import { ServiceWorker } from "@/components/ServiceWorker"
import { ToastHost } from "@/components/Toast"
import { THEME_BOOTSTRAP } from "@/lib/theme"

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export const metadata: Metadata = {
  title: {
    default: "ERRATA — 틀린 것을 세어 두는 일기",
    template: "ERRATA — %s",
  },
  description:
    "영어로 일기를 쓰면 AI가 첨삭하고, 내가 반복해서 틀리는 지점을 26개 카테고리로 분류해 데이터로 모아 보여줍니다.",
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ERRATA" },
  icons: { icon: `${base}/icon.svg`, apple: `${base}/icon.svg` },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#181614" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* React가 렌더되기 전에 테마를 박아야 밝은 화면이 번쩍이지 않는다 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <ToastHost />
        </AuthProvider>
        <ServiceWorker />
      </body>
    </html>
  )
}

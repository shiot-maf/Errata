"use client"

import { useEffect } from "react"

/** PWA 설치와 오프라인 셸을 위한 서비스 워커 등록. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {
      /* 등록 실패해도 앱은 정상 동작한다 */
    })
  }, [])
  return null
}

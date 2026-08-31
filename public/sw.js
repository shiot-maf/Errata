/*
 * 아주 얇은 서비스 워커.
 * 앱 셸만 캐시해서 오프라인이나 느린 네트워크에서 화면이 뜨게 하고,
 * 일기 데이터 자체는 절대 캐시하지 않는다 (오래된 일기를 보여주는 것보다
 * 안 보여주는 게 낫다).
 *
 * 하위 경로 배포(GitHub Pages 등)를 지원하려고 경로를 하드코딩하지 않고
 * 워커 자신의 위치에서 base를 계산한다.
 */

const BASE = new URL("./", self.location).pathname
const CACHE = `errata-shell-v3:${BASE}`
const SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icon.svg`]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {}) // 셸 하나가 실패해도 설치는 계속한다
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  // 외부 API(파이어베이스, Anthropic, 폰트)는 손대지 않는다.
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith(BASE)) return

  // 문서 요청은 네트워크 우선, 실패하면 캐시된 셸.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match(BASE))),
    )
    return
  }

  // 빌드 산출물은 해시가 붙어 있어 캐시 우선이 안전하다.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((res) => {
          if (res.ok && url.pathname.includes("/_next/")) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        }),
    ),
  )
})

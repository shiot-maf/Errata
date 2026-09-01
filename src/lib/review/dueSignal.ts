"use client"

/**
 * "오늘 밀린 복습이 몇 개인지"를 껍데기(AppShell)에 알려주는 통로.
 *
 * 껍데기는 앱을 열 때 실수를 한 번 읽어 밀린 개수를 센다. 그런데 복습을 한
 * 문제 풀 때마다 그 수가 줄어든다. 매번 2000건을 다시 읽을 수는 없고, 그렇다고
 * 안 줄이면 다 풀고 나서도 배지가 20이라고 우긴다.
 *
 * 복습 화면은 이미 정확한 목록을 손에 들고 있으므로, 셈만 넘긴다.
 * game.ts의 알림과 같은 방식이다 — 데이터가 화면을 직접 참조하지 않는다.
 */

export const DUE_EVENT = "errata:due"

export function publishDueCount(count: number): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<number>(DUE_EVENT, { detail: count }))
}

export function onDueCount(handler: (count: number) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<number>).detail)
  window.addEventListener(DUE_EVENT, listener)
  return () => window.removeEventListener(DUE_EVENT, listener)
}

"use client"

import { useSyncExternalStore } from "react"

/**
 * 브라우저에만 있는 값(localStorage, URL 질의문자열)을 읽는 통로.
 *
 * 이 앱은 정적으로 내보내지므로 첫 HTML은 빌드 시점에 만들어진다. 그때는
 * localStorage도 URL도 없다. 그래서 "저장된 값을 useState 초기값으로" 넣을
 * 수가 없고, 예전에는 전부 useEffect 안에서 setState로 채웠다. 그 방식은
 * 렌더를 한 번 더 돌리고, React가 경고하는 자리이기도 하다.
 *
 * useSyncExternalStore가 정확히 이 경우를 위한 것이다. 서버(그리고 하이드레이션)
 * 에서는 serverValue를, 그 뒤로는 read()를 쓴다.
 *
 * 주의: read()는 렌더마다 불린다. 같은 상태면 같은 값이 나와야 하므로
 * 문자열·숫자 같은 원시값만 다룬다. 객체를 새로 만들어 돌려주면 무한 렌더다.
 */

const listeners = new Set<() => void>()

/** 이 탭에서 저장값을 바꿨을 때 부른다 — storage 이벤트는 다른 탭에만 간다. */
export function notifyStoredValueChanged(): void {
  for (const listener of listeners) listener()
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

export function useBrowserValue<T extends string | number | boolean>(
  read: () => T,
  serverValue: T,
): T {
  return useSyncExternalStore(subscribe, read, () => serverValue)
}

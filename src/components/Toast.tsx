"use client"

import { useEffect, useState } from "react"
import { GAME_EVENT, type GameNotice } from "@/lib/game"

/**
 * 레벨업·퀘스트 알림.
 *
 * 데이터 레이어가 이 컴포넌트를 알지 못하도록 window CustomEvent로만 이어져 있다
 * (WriterQuest의 Toast 디커플링 방식). 덕분에 db.ts는 화면을 import하지 않는다.
 */
interface Item extends GameNotice {
  id: number
}

let nextId = 0

export function ToastHost() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const onNotice = (event: Event) => {
      const notice = (event as CustomEvent<GameNotice>).detail
      if (!notice) return
      const item = { ...notice, id: nextId++ }
      setItems((prev) => [...prev, item])
      window.setTimeout(
        () => setItems((prev) => prev.filter((i) => i.id !== item.id)),
        4000,
      )
    }
    window.addEventListener(GAME_EVENT, onNotice)
    return () => window.removeEventListener(GAME_EVENT, onNotice)
  }, [])

  // 알림이 있을 때만 이 컨테이너를 만들면 안 된다. 스크린리더는 이미
  // 문서에 있던 live region의 "변화"를 읽는 것이라, 내용과 함께 나타난
  // 영역은 대개 읽히지 않는다. 빈 채로 항상 자리를 지킨다.
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-8"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="reveal pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sheet shadow-xl shadow-ink/20"
        >
          <span aria-hidden className="text-sm">
            {item.kind === "levelup" ? "★" : item.kind === "title" ? "✦" : "✓"}
          </span>
          <span className="text-[11px] font-bold tracking-[0.16em] uppercase">
            {item.title}
          </span>
          {item.detail && (
            <span className="max-w-[16rem] truncate text-xs opacity-70">
              {item.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

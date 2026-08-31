"use client"

import { useEffect, useState } from "react"
import { useAuth } from "./AuthProvider"
import { addSaved, award, listSaved, removeSaved } from "@/lib/firebase/db"
import { EXP } from "@/lib/game"
import { Bookmark } from "./icons"
import type { SavedItem } from "@/lib/types"

/**
 * 저장함 상태를 화면 하나에서 공유하기 위한 아주 작은 스토어.
 * 교정 카드마다 각자 Firestore를 읽으면 낭비라서, 한 번 읽고 나눠 쓴다.
 */
let cache: SavedItem[] | null = null
/** 캐시가 어느 계정의 것인지. 로그아웃하거나 계정을 바꾸면 남의 목록을 보여주면 안 된다. */
let cachedUid: string | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function useSavedIndex() {
  const { user } = useAuth()
  const [, force] = useState(0)

  useEffect(() => {
    const listener = () => force((n) => n + 1)
    listeners.add(listener)

    if (user && cachedUid !== user.uid) {
      cache = null
      cachedUid = user.uid
    }

    if (cache === null && user) {
      const uid = user.uid
      void listSaved(uid)
        .then((items) => {
          // 기다리는 사이에 계정이 바뀌었으면 그 결과는 버린다.
          if (cachedUid !== uid) return
          cache = items
          notify()
        })
        .catch(() => {})
    }
    return () => {
      listeners.delete(listener)
    }
  }, [user])

  return cache ?? []
}

export function invalidateSaved() {
  cache = null
  notify()
}

export function SaveButton({
  item,
}: {
  item: Omit<SavedItem, "id" | "createdAt">
}) {
  const { user, refreshProfile } = useAuth()
  const saved = useSavedIndex()
  const [busy, setBusy] = useState(false)

  const existing = saved.find(
    (s) => s.sourceId === item.sourceId && s.front === item.front,
  )

  const toggle = async () => {
    if (!user || busy) return
    setBusy(true)
    try {
      if (existing) {
        await removeSaved(user.uid, existing.id)
        cache = (cache ?? []).filter((s) => s.id !== existing.id)
      } else {
        const id = await addSaved(user.uid, item)
        cache = [{ ...item, id, createdAt: Date.now() }, ...(cache ?? [])]
        await award(user.uid, {
          exp: EXP.saved,
          quests: [{ id: "once_saved", set: cache.length }],
        })
        await refreshProfile()
      }
    } catch (e) {
      // 오프라인이면 여기로 온다. 캐시를 버려서 다음 렌더가 진짜 상태를
      // 다시 읽게 하고, 북마크 아이콘이 저장된 척하지 않게 한다.
      console.error("저장함을 갱신하지 못했습니다:", e)
      cache = null
    } finally {
      notify()
      setBusy(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={!!existing}
      aria-label={existing ? "저장함에서 빼기" : "저장함에 담기"}
      title={existing ? "저장함에서 빼기" : "저장함에 담기"}
      className={`shrink-0 rounded-full p-1.5 transition-colors ${
        existing ? "text-ink" : "text-ink-4 hover:text-ink"
      }`}
    >
      <Bookmark className="h-4 w-4" filled={!!existing} />
    </button>
  )
}

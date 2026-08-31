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
    if (cache === null && user) {
      void listSaved(user.uid).then((items) => {
        cache = items
        notify()
      })
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
      notify()
    } finally {
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
        existing ? "text-ink" : "text-ink/25 hover:text-ink/60"
      }`}
    >
      <Bookmark className="h-4 w-4" filled={!!existing} />
    </button>
  )
}

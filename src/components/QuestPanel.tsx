"use client"

import { useAuth } from "./AuthProvider"
import { expToNext, type Quest } from "@/lib/game"

/**
 * 레벨과 퀘스트. WriterQuest의 우측 패널에 있던 것을 사이드바로 옮겼다.
 * 숫자를 크게 보여주기보다 "다음 한 걸음이 뭔지"가 보이게 두는 쪽을 택했다.
 */
export function QuestPanel() {
  const { profile } = useAuth()
  if (!profile) return null

  const level = profile.level ?? 1
  const exp = profile.exp ?? 0
  const need = expToNext(level)
  const pct = Math.min(100, Math.round((exp / need) * 100))
  const title = profile.titles?.[profile.titles.length - 1]

  const quests = (profile.quests ?? []).filter((q) => q.type !== "once" || !q.done)
  const active = quests.filter((q) => !q.done)
  const doneCount = quests.length - active.length

  return (
    <section aria-label="레벨과 퀘스트" className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="tabnum text-2xl font-medium">Lv.{level}</span>
          <span className="tabnum text-[11px] text-ink-3">
            {exp} / {need}
          </span>
        </div>
        <div className="mt-2.5 h-[3px] bg-rule">
          <div
            className="h-full bg-ink transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {title && <p className="mt-2 text-[11px] text-ink-3">{title}</p>}
      </div>

      {quests.length > 0 && (
        <ul>
          {quests.slice(0, 5).map((q) => (
            <QuestRow key={q.id} quest={q} />
          ))}
        </ul>
      )}

      {active.length === 0 && quests.length > 0 && (
        <p className="text-[11px] text-ink-3">퀘스트를 전부 끝냈어요.</p>
      )}
    </section>
  )
}

function QuestRow({ quest }: { quest: Quest }) {
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100))

  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-rule-2 py-2.5 last:border-b-0">
      <span className={`text-[13px] leading-snug ${quest.done ? "text-ink-4 line-through" : ""}`}>
        {quest.title}
      </span>
      <span className="tabnum shrink-0 text-[11px] text-ink-3">
        {quest.done ? "done" : `${quest.progress}/${quest.target}`}
      </span>
    </li>
  )
}

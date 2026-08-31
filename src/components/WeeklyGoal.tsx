"use client"

import { useState } from "react"
import { useAuth } from "./AuthProvider"
import { setWeeklyGoal } from "@/lib/firebase/db"
import { Pencil } from "./icons"

/**
 * 주간 목표. 스트릭이 "하루라도 빠지면 0"이라 부담스러운 데 비해,
 * 주 단위 목표는 하루 건너뛰어도 회복할 수 있어서 계속 쓰게 만든다.
 */
export function WeeklyGoal({
  done,
  variant,
}: {
  done: number
  variant: "sidebar" | "mobile"
}) {
  const { profile, refreshProfile, user } = useAuth()
  const [editing, setEditing] = useState(false)
  const goal = profile?.weeklyGoal ?? 3
  const remaining = Math.max(0, goal - done)
  const pct = Math.min(100, Math.round((done / goal) * 100))

  const changeGoal = async (next: number) => {
    if (!user) return
    setEditing(false)
    await setWeeklyGoal(user.uid, next)
    await refreshProfile()
  }

  if (variant === "mobile") {
    return (
      <div className="mb-6 flex items-center justify-between gap-4 border-y border-rule-2 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="label-sm">주간 목표</span>
          <span className="mt-0.5 truncate text-sm font-medium">
            {done}편 / 목표 {goal}편
          </span>
        </div>
        <div
          className="flex shrink-0 gap-1.5"
          role="progressbar"
          aria-label="주간 목표 진행"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuetext={`목표 ${goal}편 중 ${done}편`}
        >
          {Array.from({ length: goal }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 transition-colors ${i < done ? "bg-ink" : "bg-rule"}`}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <section aria-label="주간 목표" className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <span className="tabnum text-3xl font-medium">
            {done}
            <span className="text-xl opacity-40">/</span>
            {editing ? (
              <select
                autoFocus
                aria-label="한 주에 쓸 일기 편수"
                value={goal}
                onChange={(e) => void changeGoal(Number(e.target.value))}
                onBlur={() => setEditing(false)}
                className="ml-1 border border-field bg-transparent px-1 text-lg"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setEditing(true)}
                aria-label="목표 수정"
                className="group ml-0.5 inline-flex items-baseline gap-1.5 text-ink-3 transition-colors hover:text-ink"
              >
                <span className="border-b border-transparent pb-px transition-all group-hover:border-rule">
                  {goal}
                </span>
                <span className="inline-flex h-5 w-5 items-center justify-center bg-paper-2 transition-all group-hover:bg-rule">
                  <Pencil className="h-2.5 w-2.5 opacity-40 transition-opacity group-hover:opacity-100" />
                </span>
              </button>
            )}
          </span>
          <span className="label-sm">{pct}%</span>
        </div>

        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-label="주간 목표 진행"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuetext={`목표 ${goal}편 중 ${done}편`}
        >
          {Array.from({ length: goal }, (_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 transition-colors duration-500 ${
                i < done ? "bg-ink" : "bg-rule"
              }`}
              style={{ transitionDelay: `${i * 40}ms` }}
            />
          ))}
        </div>

        <p className="text-[13px] leading-relaxed text-ink-3">
          {remaining === 0
            ? "이번 주 목표를 채웠어요. 여기서 한 편 더 쓰면 그냥 이득이에요."
            : `이번 주 목표까지 ${remaining}편 남았어요.`}
        </p>

      </div>
    </section>
  )
}

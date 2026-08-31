"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { Entry } from "@/lib/types"
import { toDateKey } from "@/lib/dates"

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

/**
 * 루틴 체커 겸 캘린더.
 *
 * 리포트의 잔디는 "얼마나 많이 썼나"를 보여주는 통계고, 이건 "오늘 썼나"를
 * 매일 확인하는 용도다. 그래서 진하기 단계 없이 썼다/안 썼다만 칠하고,
 * 첨삭까지 받은 날만 한 단계 더 구분한다.
 */
export function MonthCalendar({ entries }: { entries: Entry[] }) {
  const today = toDateKey()
  const [monthOffset, setMonthOffset] = useState(0)

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of entries) map.set(e.dateKey, [...(map.get(e.dateKey) ?? []), e])
    return map
  }, [entries])

  const { cells, label, monthKey } = useMemo(() => {
    const base = new Date()
    base.setDate(1)
    base.setMonth(base.getMonth() + monthOffset)
    const year = base.getFullYear()
    const month = base.getMonth()

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const lead = new Date(year, month, 1).getDay() // 일요일 시작

    const days: (string | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        toDateKey(new Date(year, month, i + 1)),
      ),
    ]
    return {
      cells: days,
      label: `${year}. ${String(month + 1).padStart(2, "0")}`,
      monthKey: `${year}-${String(month + 1).padStart(2, "0")}`,
    }
  }, [monthOffset])

  const writtenThisMonth = useMemo(
    () => [...byDate.keys()].filter((k) => k.startsWith(monthKey)).length,
    [byDate, monthKey],
  )

  return (
    <section aria-label="작성 캘린더" className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="tabnum text-[11px] text-ink-3">{label}</span>
        <div className="flex items-center gap-1">
          <NavButton label="이전 달" onClick={() => setMonthOffset((m) => m - 1)}>
            ‹
          </NavButton>
          <span className="w-2" />
          <NavButton
            label="다음 달"
            disabled={monthOffset >= 0}
            onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
          >
            ›
          </NavButton>
        </div>
      </div>

      <div className="grid grid-cols-7 border-t border-l border-rule-2 text-center">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="border-r border-b border-rule-2 bg-paper-2 py-1.5 font-mono text-[9px] tracking-[0.06em] text-ink-4"
          >
            {d}
          </span>
        ))}

        {cells.map((dateKey, i) => {
          if (!dateKey)
            return <span key={`pad-${i}`} className="aspect-square border-r border-b border-rule-2" />
          const dayEntries = byDate.get(dateKey) ?? []
          return (
            <DayCell
              key={dateKey}
              dateKey={dateKey}
              entries={dayEntries}
              isToday={dateKey === today}
              isFuture={dateKey > today}
            />
          )
        })}
      </div>

      <p className="font-mono text-[10px] tracking-[0.06em] text-ink-3">
        {writtenThisMonth} / {cells.filter(Boolean).length} days · 채움 = 첨삭 완료
      </p>
    </section>
  )
}

function DayCell({
  dateKey,
  entries,
  isToday,
  isFuture,
}: {
  dateKey: string
  entries: Entry[]
  isToday: boolean
  isFuture: boolean
}) {
  const day = Number(dateKey.slice(8))
  const written = entries.length > 0
  const corrected = entries.some((e) => e.feedback)

  const inner = (
    <span
      className={[
        "flex aspect-square items-center justify-center border-r border-b border-rule-2 font-mono text-[11px] tabular-nums transition-colors",
        corrected
          ? "bg-ink font-medium text-sheet"
          : written
            ? "text-pen shadow-[inset_0_0_0_1px_var(--color-pen-mid)]"
            : isFuture
              ? "text-ink-4/40"
              : "text-ink-4",
        isToday && !written ? "shadow-[inset_0_0_0_1px_var(--color-ink-4)]" : "",
      ].join(" ")}
    >
      {day}
    </span>
  )

  if (!written) return inner

  // 그날 일기가 하나면 바로 그 글로, 여러 편이면 목록으로 보낸다.
  const href =
    entries.length === 1 ? `/history/entry?id=${entries[0].id}` : "/history"

  return (
    <Link
      href={href}
      title={`${dateKey} · ${entries.length}편${corrected ? " · 첨삭됨" : ""}`}
      className="block"
    >
      {inner}
    </Link>
  )
}

function NavButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-5 w-5 items-center justify-center font-mono text-ink-4 transition-colors hover:text-ink disabled:opacity-25"
    >
      {children}
    </button>
  )
}

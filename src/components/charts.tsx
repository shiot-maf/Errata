"use client"

import { CATEGORY_GROUPS, categoryColor } from "@/lib/taxonomy"
import type { CategoryStat, GroupStat } from "@/lib/analysis/aggregate"
import { formatKo } from "@/lib/dates"

/** 카테고리별 실수 빈도 가로 막대 — 대시보드의 주인공. */
export function CategoryBars({
  stats,
  max: maxOverride,
  onSelect,
  selected,
}: {
  stats: CategoryStat[]
  max?: number
  onSelect?: (slug: string) => void
  selected?: string | null
}) {
  const max = maxOverride ?? Math.max(1, ...stats.map((s) => s.count))
  return (
    <ul>
      {stats.map((s, i) => {
        const pct = (s.count / max) * 100
        const hot = i === 0
        return (
          <li
            key={s.slug}
            onClick={onSelect ? () => onSelect(s.slug) : undefined}
            className={`border-b border-rule-2 py-3 last:border-b-0 ${
              onSelect ? "cursor-pointer" : ""
            } ${selected === s.slug ? "bg-paper-2" : ""}`}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{s.ko}</span>
              <span className="font-mono text-[9px] tracking-[0.08em] text-ink-4 uppercase">
                {CATEGORY_GROUPS[s.group].ko}
              </span>
              <span className="tabnum ml-auto text-[15px] font-medium">{s.count}</span>
              <span className="w-12 text-right">
                <TrendChip trend={s.trend} />
              </span>
            </div>
            {/* 채운 막대 대신 끝에 눈금이 달린 자 — 재서 표시한 값처럼 보인다 */}
            <div className="relative mt-2 h-[10px]">
              <span className="absolute inset-x-0 top-1 h-px bg-rule" />
              <span
                className="absolute top-[3px] left-0 h-[3px]"
                style={{ width: `${pct}%`, background: hot ? "var(--color-pen)" : "var(--color-ink-2)" }}
              />
              <span
                className="absolute top-0 h-[9px] w-px"
                style={{ left: `${pct}%`, background: hot ? "var(--color-pen)" : "var(--color-ink-2)" }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** 최근 30일 vs 이전 30일, 100단어당 실수 비율 변화. 음수면 개선. */
function TrendChip({ trend }: { trend: number }) {
  if (trend === 0) return null
  const better = trend < 0
  return (
    <span
      className={`tabnum text-[11px] font-medium ${better ? "text-good" : "text-pen"}`}
      title="최근 30일 vs 그 이전 30일 · 100단어당 실수"
    >
      {better ? "▼" : "▲"}
      {Math.abs(trend).toFixed(1)}
    </span>
  )
}

/** 문법/어휘/구조/표기 비중 — 어느 영역이 약한지 한눈에. */
export function GroupSplit({ groups }: { groups: GroupStat[] }) {
  const total = groups.reduce((s, g) => s + g.count, 0)
  if (total === 0) return null
  return (
    <div>
      <div className="flex h-2">
        {groups
          .filter((g) => g.count > 0)
          .map((g) => (
            <div
              key={g.group}
              style={{ width: `${(g.count / total) * 100}%`, background: g.color }}
              title={`${g.ko} ${g.count}회`}
            />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {groups
          .filter((g) => g.count > 0)
          .map((g) => (
            <li key={g.group} className="flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ background: g.color }} aria-hidden />
              <span>{g.ko}</span>
              <span className="tabular-nums text-ink-4">
                {Math.round(g.share * 100)}%
              </span>
            </li>
          ))}
      </ul>
    </div>
  )
}

/** 작성 히트맵 — 잔디. 습관이 유지되는지 보여준다. */
export function ActivityHeatmap({
  activity,
}: {
  activity: { dateKey: string; words: number; entries: number }[]
}) {
  const maxWords = Math.max(1, ...activity.map((a) => a.words))

  // 주 단위 열로 쌓는다. 첫 열의 앞부분은 빈 칸으로 채워 요일을 맞춘다.
  const firstDay = new Date(activity[0]?.dateKey ?? Date.now()).getDay()
  const cells: (typeof activity)[number][] = [
    ...Array.from({ length: firstDay }, () => null as never),
    ...activity,
  ]
  const weeks: (typeof activity)[number][][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di]
              if (!cell) return <div key={di} className="h-3 w-3" />
              const level = cell.words === 0 ? 0 : Math.ceil((cell.words / maxWords) * 4)
              return (
                <div
                  key={di}
                  className="h-3 w-3"
                  style={{
                    background:
                      level === 0
                        ? "var(--color-rule-2)"
                        : `color-mix(in srgb, var(--color-ink) ${12 + level * 22}%, transparent)`,
                  }}
                  title={
                    cell.entries
                      ? `${formatKo(cell.dateKey)} · ${cell.words}단어`
                      : formatKo(cell.dateKey)
                  }
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/** 100단어당 실수 추이 스파크라인. */
export function Sparkline({
  points,
  height = 44,
}: {
  points: { label: string; value: number }[]
  height?: number
}) {
  if (points.length < 2) return null
  const max = Math.max(...points.map((p) => p.value), 1)
  const w = 100
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w
      const y = height - (p.value / max) * (height - 6) - 3
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="h-11 w-full"
      role="img"
      aria-label="100단어당 실수 추이"
    >
      <path
        d={`${path} L${w},${height} L0,${height} Z`}
        fill="var(--color-ink)"
        opacity="0.08"
      />
      <path
        d={path}
        fill="none"
        stroke="var(--color-ink-2)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  )
}

"use client"

import { CATEGORY_GROUPS } from "@/lib/taxonomy"
import type { CategoryStat, GroupStat } from "@/lib/analysis/aggregate"
import { formatKo, fromDateKey } from "@/lib/dates"

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

        const row = (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{s.ko}</span>
              <span className="font-mono text-[9px] tracking-[0.08em] text-ink-3 uppercase">
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
          </>
        )

        return (
          <li
            key={s.slug}
            className={`border-b border-rule-2 last:border-b-0 ${
              selected === s.slug ? "bg-paper-2" : ""
            }`}
          >
            {/* 누를 수 있는 줄은 button이어야 한다. div에 onClick만 달면
                키보드로는 아예 닿지 않는다. */}
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(s.slug)}
                aria-pressed={selected === s.slug}
                aria-label={`${s.ko} ${s.count}회${trendLabel(s.trend)} — 사례 보기`}
                className="block w-full px-1 py-3 text-left"
              >
                <div aria-hidden>{row}</div>
              </button>
            ) : (
              <div className="px-1 py-3">{row}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** 추이를 말로 옮긴 것 — 화살표만으로는 읽어주지 못한다. */
function trendLabel(trend: number): string {
  if (trend === 0) return ""
  const amount = Math.abs(trend).toFixed(1)
  return trend < 0
    ? `, 100단어당 ${amount}회 줄어드는 중`
    : `, 100단어당 ${amount}회 늘어나는 중`
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
      <span aria-hidden>{better ? "▼" : "▲"}</span>
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
      {/* 띠는 아래 목록을 그림으로 옮긴 것뿐이다. 두 번 읽어줄 이유가 없다. */}
      <div className="flex h-2" aria-hidden>
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
              <span className="tabular-nums text-ink-3">
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
  //
  // new Date("2026-08-31")은 UTC 자정으로 읽힌다. UTC보다 뒤인 시간대에서는
  // getDay()가 하루 전 요일을 돌려주고, 잔디 전체가 한 칸씩 밀린다.
  // dateKey는 로컬 날짜이므로 로컬로 읽는 fromDateKey를 쓴다.
  const firstDay = activity[0] ? fromDateKey(activity[0].dateKey).getDay() : 0
  const cells: (typeof activity)[number][] = [
    ...Array.from({ length: firstDay }, () => null as never),
    ...activity,
  ]
  const weeks: (typeof activity)[number][][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  // 칸 하나하나는 title 속성으로만 설명돼 있어서 읽어주지도, 키보드로 닿지도
  // 않는다. 잔디가 말하려는 건 결국 "얼마나 꾸준했나"이므로 그걸 한 줄로 준다.
  const activeDays = activity.filter((a) => a.entries > 0).length
  const totalWords = activity.reduce((sum, a) => sum + a.words, 0)
  const summary = `최근 ${activity.length}일 중 ${activeDays}일 작성, 모두 ${totalWords.toLocaleString()}단어`

  return (
    <div
      className="overflow-x-auto pb-1"
      role="img"
      aria-label={summary}
      tabIndex={0}
    >
      <div className="flex gap-[3px]" aria-hidden>
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

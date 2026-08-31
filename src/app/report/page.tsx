"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { PageHeader } from "@/components/AppShell"
import { Empty, Loading, Pill, SectionTitle, Segmented, Stat, Tag } from "@/components/ui"
import { ActivityHeatmap, CategoryBars, GroupSplit, Sparkline } from "@/components/charts"
import { CorrectionCard } from "@/components/CorrectionCard"
import { listEntries, listMistakes } from "@/lib/firebase/db"
import { ERROR_RATE_TREND_MIN_ENTRIES, buildOverview } from "@/lib/analysis/aggregate"
import { CATEGORY_GROUPS, categoryColor, getCategory } from "@/lib/taxonomy"
import { formatKo } from "@/lib/dates"
import type { Entry, Mistake } from "@/lib/types"

type Range = 30 | 90 | 0

export default function ReportPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [range, setRange] = useState<Range>(0)
  const [focus, setFocus] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([listEntries(user.uid, 500), listMistakes(user.uid, 2000)])
      .then(([e, m]) => {
        setEntries(e)
        setMistakes(m)
      })
      .catch(() => setEntries([]))
  }, [user])

  const scoped = useMemo(() => {
    if (!entries) return null
    if (range === 0) return { entries, mistakes }
    const cutoff = Date.now() - range * 86_400_000
    return {
      entries: entries.filter((e) => e.createdAt >= cutoff),
      mistakes: mistakes.filter((m) => m.createdAt >= cutoff),
    }
  }, [entries, mistakes, range])

  const overview = useMemo(
    () => (scoped ? buildOverview(scoped.entries, scoped.mistakes) : null),
    [scoped],
  )

  const errorRateSeries = useMemo(() => {
    if (!scoped) return []
    return [...scoped.entries]
      .filter((e) => e.feedback && e.wordCount > 0)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-20)
      .map((e) => ({
        label: e.dateKey,
        value: ((e.feedback?.correctionCount ?? 0) / e.wordCount) * 100,
      }))
  }, [scoped])

  if (!user) return null
  if (!entries || !overview) return <Loading />

  if (overview.totalMistakes === 0) {
    return (
      <div className="space-y-8">
        <PageHeader no="01" title="리포트" />
        <Empty
          title="아직 분석할 데이터가 없어요"
          action={
            <Link href="/">
              <Pill>일기 쓰러 가기</Pill>
            </Link>
          }
        >
          일기를 쓰고 첨삭을 받으면, 내가 어디서 자주 틀리는지가 여기에 쌓입니다.
        </Empty>
      </div>
    )
  }

  const top = overview.categories[0]
  const improving = overview.categories.filter((c) => c.trend < 0).slice(0, 3)
  const worsening = overview.categories.filter((c) => c.trend > 0).slice(0, 3)
  const focusMistakes = focus
    ? scoped!.mistakes.filter((m) => m.category === focus).slice(0, 12)
    : []

  return (
    <div className="space-y-12">
      <PageHeader
        no="01"
        title="리포트"
        description="무엇을 가장 많이 틀리는지, 나아지고 있는지."
        action={
          <Segmented
            label="기간"
            value={range}
            onChange={setRange}
            options={[
              { value: 30 as Range, label: "30일" },
              { value: 90 as Range, label: "90일" },
              { value: 0 as Range, label: "전체" },
            ]}
          />
        }
      />

      {/* 지금 뭘 고쳐야 하는지 한 줄로 */}
      <section className="reveal border-y border-rule py-8">
        <p className="label-sm">지금 가장 손봐야 할 것</p>
        <p className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-pen">
          {top.ko}
        </p>
        <p className="tabnum mt-3 text-sm text-ink-3">
          {top.count}회 · 전체 실수의 {Math.round(top.share * 100)}%
        </p>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-2">
          {getCategory(top.slug).hint}
        </p>
        <Link href="/review" className="mt-5 inline-block">
          <Pill variant="outline">이 실수들로 복습하기</Pill>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="총 실수" value={overview.totalMistakes} sub={`일기 ${overview.totalEntries}편`} />
        <Stat
          label="100단어당"
          value={overview.errorRate.toFixed(1)}
          sub={
            overview.errorRateTrend === null
              ? `추이는 첨삭받은 일기 ${ERROR_RATE_TREND_MIN_ENTRIES}편부터`
              : overview.errorRateTrend < 0
                ? `최근 5편 ${Math.abs(overview.errorRateTrend).toFixed(1)} 감소`
                : `최근 5편 ${overview.errorRateTrend.toFixed(1)} 증가`
          }
          tone={
            overview.errorRateTrend === null
              ? "default"
              : overview.errorRateTrend < 0
                ? "good"
                : "warn"
          }
        />
        <Stat label="쓴 단어" value={overview.totalWords.toLocaleString()} />
        <Stat
          label="반복 실수"
          value={overview.repeated.length}
          sub="2번 이상 똑같이 틀린 것"
          tone={overview.repeated.length > 0 ? "warn" : "good"}
        />
      </section>

      {errorRateSeries.length >= 2 && (
        <section>
          <SectionTitle>100단어당 실수 추이</SectionTitle>
          <div>
            <Sparkline points={errorRateSeries} />
            <div className="tabnum mt-2 flex justify-between text-[11px] text-ink-4">
              <span>{formatKo(errorRateSeries[0].label)}</span>
              <span>내려갈수록 좋아지는 중</span>
              <span>{formatKo(errorRateSeries[errorRateSeries.length - 1].label)}</span>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionTitle>영역별 비중</SectionTitle>
        <div>
          <GroupSplit groups={overview.groups} />
        </div>
      </section>

      <section>
        <SectionTitle>카테고리별 빈도 — 눌러서 실제 사례 보기</SectionTitle>
        <div>
          <CategoryBars
            stats={overview.categories}
            selected={focus}
            onSelect={(slug) => setFocus((f) => (f === slug ? null : slug))}
          />
        </div>
      </section>

      {focus && (
        <section className="reveal">
          <SectionTitle
            action={
              <button onClick={() => setFocus(null)} className="label-sm hover:text-ink">
                닫기
              </button>
            }
          >
            {getCategory(focus).ko} 사례
          </SectionTitle>
          <div className="space-y-3">
            {focusMistakes.map((m) => (
              <CorrectionCard key={m.id} mistake={m} showDate={formatKo(m.dateKey)} />
            ))}
          </div>
        </section>
      )}

      {(improving.length > 0 || worsening.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          {improving.length > 0 && (
            <div>
              <SectionTitle>나아지고 있어요 (최근 30일 vs 이전 30일)</SectionTitle>
              <ul className="space-y-2.5 text-sm">
                {improving.map((c) => (
                  <li key={c.slug} className="flex items-center gap-2">
                    <Tag color={categoryColor(c.slug)}>{c.ko}</Tag>
                    <span className="text-ink-3">
                      100단어당 {Math.abs(c.trend).toFixed(1)}회 줄었어요
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {worsening.length > 0 && (
            <div>
              <SectionTitle>늘고 있어요 (최근 30일 vs 이전 30일)</SectionTitle>
              <ul className="space-y-2.5 text-sm">
                {worsening.map((c) => (
                  <li key={c.slug} className="flex items-center gap-2">
                    <Tag color={categoryColor(c.slug)}>{c.ko}</Tag>
                    <span className="text-ink-3">
                      100단어당 {c.trend.toFixed(1)}회 늘었어요
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {overview.repeated.length > 0 && (
        <section>
          <SectionTitle>같은 실수를 반복하고 있어요</SectionTitle>
          <div className="space-y-3">
            {overview.repeated.slice(0, 8).map((r) => (
              <div key={r.key} className="border-b border-rule-2 py-5 last:border-b-0">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <Tag color={categoryColor(r.category)}>{getCategory(r.category).ko}</Tag>
                  <Tag color="var(--color-pen)">{r.count}번 반복</Tag>
                  <span className="ml-auto text-[11px] text-ink-4">
                    마지막 {formatKo(r.lastSeen)}
                  </span>
                </div>
                <p className=" text-[15px]">
                  <span className="line-through" style={{ color: "var(--color-pen)" }}>
                    {r.original}
                  </span>
                  <span className="mx-2 text-ink-4">→</span>
                  <span className="font-medium" style={{ color: "var(--color-good)" }}>
                    {r.corrected}
                  </span>
                </p>
                {r.explanation && (
                  <p className="mt-2 text-sm text-ink-2">{r.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>작성 기록</SectionTitle>
        <div>
          <ActivityHeatmap activity={overview.activity} />
          <p className="mt-4 text-xs text-ink-4">
            진할수록 그날 많이 썼어요. 최근 {overview.activity.length}일.
          </p>
        </div>
      </section>

      <details className="border-t border-rule-2 pt-6">
        <summary className="cursor-pointer text-sm font-semibold tracking-[0.18em] text-ink-2 uppercase">
          카테고리 설명
        </summary>
        <div className="mt-5 space-y-5">
          {(Object.keys(CATEGORY_GROUPS) as (keyof typeof CATEGORY_GROUPS)[]).map((group) => {
            const inGroup = overview.categories.filter((c) => c.group === group)
            if (inGroup.length === 0) return null
            return (
              <div key={group}>
                <p
                  className="label-sm mb-2"
                  style={{ color: CATEGORY_GROUPS[group].color }}
                >
                  {CATEGORY_GROUPS[group].ko}
                </p>
                <ul className="space-y-1.5 text-sm text-ink-3">
                  {inGroup.map((c) => (
                    <li key={c.slug}>
                      <strong className="font-medium text-ink">{c.ko}</strong> —{" "}
                      {getCategory(c.slug).hint}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </details>
    </div>
  )
}

"use client"

import Image from "next/image"
import { ActivityHeatmap } from "./charts"
import { expToNext } from "@/lib/game"
import { categoryColor, getCategory } from "@/lib/taxonomy"

/**
 * 프로필 화면이 쓰는 값 전부.
 *
 * 이 컴포넌트는 Firestore도 useAuth도 부르지 않는다 — 받은 것만 그린다.
 * 나중에 공개 프로필(남의 프로필)을 만들 때 데이터를 어디서 읽든 이 화면은
 * 그대로 재사용된다. 그래서 이메일처럼 남에게 보일 일이 없는 값은
 * 여기 넣지 않았다.
 */
export interface ProfileSummary {
  displayName: string | null
  photoURL: string | null
  /** 계정을 만든 시각 (ms) */
  since: number
  streak: number
  longestStreak: number
  /** 오늘 일기를 썼는지 — 스트릭이 걸려 있는지 알려준다 */
  wroteToday: boolean
  level: number
  exp: number
  titles: string[]
  entries: number
  words: number
  mistakes: number
  /** 망각곡선 마지막 칸까지 올린 항목 수 */
  graduated: number
  /** 뗀 개념 수 / 전체 개념 수 */
  concepts: { met: number; total: number }
  /** 개념별 진행 — 많이 틀린 순 */
  progress: { category: string; total: number; graduated: number; mastery: number }[]
  activity: { dateKey: string; words: number; entries: number }[]
}

export function ProfileSheet({ summary }: { summary: ProfileSummary }) {
  return (
    <div className="space-y-12">
      {/*
        1년치 잔디가 맨 위에 온다.
        
        레벨과 칭호는 앱이 매긴 값이지만 이 격자는 실제로 한 날이 그대로
        찍힌 것이다. 이 화면에서 가장 먼저 볼 것이 그거라서 주인공 자리를
        준다. 이름과 지표는 그 아래에서 격자를 설명한다.
      */}
      <YearStamp activity={summary.activity} />
      <Identity summary={summary} />
      <LevelBlock level={summary.level} exp={summary.exp} />
      <Titles titles={summary.titles} />
      <Counted summary={summary} />
      <Concepts concepts={summary.concepts} progress={summary.progress} />
    </div>
  )
}

// ── 1년의 도장 ─────────────────────────────────────────────────────

function YearStamp({ activity }: { activity: ProfileSummary["activity"] }) {
  const days = activity.filter((a) => a.entries > 0).length
  const words = activity.reduce((sum, a) => sum + a.words, 0)
  const span = activity.length >= 360 ? "최근 1년" : `최근 ${activity.length}일`

  return (
    <section>
      <div className="mb-4 flex items-baseline gap-3 border-b border-ink pb-2.5">
        <p className="label">{span}</p>
        <p className="label-sm ml-auto">
          <b className="tabnum font-semibold text-ink">{days}</b>일 작성 ·{" "}
          <b className="tabnum font-semibold text-ink">{words.toLocaleString()}</b>단어
        </p>
      </div>
      <ActivityHeatmap activity={activity} cell={10} gap={3} showMonths />
      <p className="mt-3 text-xs text-ink-3">
        하루가 한 칸이고, 그날 쓴 만큼 짙어집니다. 빈 칸도 기록이에요.
      </p>
    </section>
  )
}

// ── 이름 판 ────────────────────────────────────────────────────────

function Identity({ summary }: { summary: ProfileSummary }) {
  const name = summary.displayName?.trim() || "이름 없음"
  return (
    <section className="flex items-start gap-5">
      {summary.photoURL ? (
        <Image
          src={summary.photoURL}
          alt=""
          width={64}
          height={64}
          unoptimized
          className="h-16 w-16 shrink-0 border border-rule object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center border border-rule font-mono text-2xl text-ink-3"
        >
          {name.slice(0, 1)}
        </span>
      )}

      <div className="min-w-0">
        <h2 className="truncate text-xl font-semibold tracking-[-0.02em]">{name}</h2>
        <p className="label-sm mt-1.5">{formatSince(summary.since)}부터</p>
        <p className="mt-3 text-sm text-ink-2">
          지금{" "}
          <b className={`tabnum font-semibold ${summary.wroteToday ? "" : "text-pen"}`}>
            {summary.streak}일
          </b>{" "}
          연속 · 가장 길었을 때 <b className="tabnum font-semibold">{summary.longestStreak}일</b>
          {!summary.wroteToday && summary.streak > 0 && (
            <span className="text-pen"> · 오늘 아직 안 썼어요</span>
          )}
        </p>
      </div>
    </section>
  )
}

function formatSince(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}

// ── 레벨 ───────────────────────────────────────────────────────────

function LevelBlock({ level, exp }: { level: number; exp: number }) {
  const need = expToNext(level)
  const pct = Math.min(100, Math.round((exp / need) * 100))
  return (
    <section>
      <p className="label mb-3 border-b border-ink pb-2.5">레벨</p>
      <div className="flex items-end gap-3">
        <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-ink-3">
          LV
        </span>
        <b className="tabnum text-4xl leading-none font-medium">{level}</b>
        <span className="tabnum ml-auto text-xs text-ink-3">
          {exp.toLocaleString()} / {need.toLocaleString()} EXP
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="다음 레벨까지"
        aria-valuenow={exp}
        aria-valuemin={0}
        aria-valuemax={need}
        aria-valuetext={`${need} 중 ${exp}`}
        className="relative mt-3 block h-[3px] w-full bg-rule"
      >
        <span
          className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-ink-3">
        다음 레벨까지 {Math.max(0, need - exp).toLocaleString()} EXP. 일기를 쓰고
        복습을 맞힐 때마다 올라갑니다.
      </p>
    </section>
  )
}

// ── 칭호 ───────────────────────────────────────────────────────────

/**
 * 칭호는 배지가 아니라 도장으로 찍는다.
 *
 * 반짝이는 배지를 붙이면 이 앱이 지켜온 것(상자를 쌓지 않는다, 색은 먹과
 * 빨간펜뿐)이 한 번에 무너진다. 검인처럼 네모를 두르고 빨간펜으로 찍으면
 * 자랑은 그대로 남으면서 종이 위에 있을 수 있다.
 */
function Titles({ titles }: { titles: string[] }) {
  return (
    <section>
      <p className="label mb-3 border-b border-ink pb-2.5">
        칭호 <span className="tabnum">{titles.length}</span>
      </p>
      {titles.length === 0 ? (
        <p className="text-sm text-ink-3">
          아직 받은 도장이 없어요. 레벨 10을 넘거나 한 개념을 떼면 첫 도장이 찍힙니다.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {titles.map((t) => (
            <li key={t}>
              <Stamp>{t}</Stamp>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function Stamp({ children }: { children: string }) {
  return (
    <span className="inline-block border-2 border-pen p-[3px]">
      <span className="block border border-pen px-3 py-2 text-center text-[13px] leading-tight font-medium text-pen">
        {children}
      </span>
    </span>
  )
}

// ── 세어둔 것 ──────────────────────────────────────────────────────

function Counted({ summary }: { summary: ProfileSummary }) {
  return (
    <section>
      <p className="label mb-4 border-b border-ink pb-2.5">세어둔 것</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <Counter label="일기" value={summary.entries} unit="편" />
        <Counter label="단어" value={summary.words} unit="words" />
        <Counter label="실수" value={summary.mistakes} unit="개" />
        <Counter label="졸업" value={summary.graduated} unit="개" />
      </dl>
      <p className="mt-4 text-xs text-ink-3">
        졸업은 망각곡선의 마지막 칸까지 올린 것 — 90일 뒤에 다시 물어봅니다.
      </p>
    </section>
  )
}

function Counter({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <dt className="label-sm">{label}</dt>
      <dd className="mt-2">
        <b className="tabnum text-3xl leading-none font-medium">
          {value.toLocaleString()}
        </b>
        <span className="ml-1.5 text-xs text-ink-3">{unit}</span>
      </dd>
    </div>
  )
}

// ── 개념 진행 ──────────────────────────────────────────────────────

function Concepts({
  concepts,
  progress,
}: {
  concepts: ProfileSummary["concepts"]
  progress: ProfileSummary["progress"]
}) {
  return (
    <section>
      <p className="label mb-3 border-b border-ink pb-2.5">개념</p>
      <p className="text-sm text-ink-2">
        {concepts.total}개 중 <b className="tabnum font-semibold">{concepts.met}개</b>를
        뗐어요.
      </p>

      {progress.length === 0 ? (
        <p className="mt-3 text-xs text-ink-3">
          첨삭을 받으면 어떤 개념에서 넘어지는지 여기에 쌓입니다.
        </p>
      ) : (
        <ul className="mt-4">
          {progress.map((p) => (
            <li
              key={p.category}
              className="flex items-baseline gap-3 border-b border-rule-2 py-2.5 last:border-b-0"
            >
              <span className="w-24 shrink-0 text-sm">{getCategory(p.category).ko}</span>
              <span className="relative h-[3px] flex-1 bg-rule">
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.round(p.mastery * 100)}%`,
                    background: categoryColor(p.category),
                  }}
                />
              </span>
              <span className="tabnum w-20 shrink-0 text-right text-[11px] text-ink-3">
                {p.graduated}/{p.total} 졸업
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

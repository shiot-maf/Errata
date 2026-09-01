"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { PageHeader } from "@/components/AppShell"
import { Empty, Loading, Pill, Tag } from "@/components/ui"
import { ConceptCard } from "@/components/ConceptCard"
import { BoxTrail } from "@/components/BoxTrail"
import { award, listMistakes, recordReview } from "@/lib/firebase/db"
import { EXP, categoryTitle, reviewExp } from "@/lib/game"
import {
  DAILY_LIMIT,
  GRADUATED_BOX,
  boxOf,
  buildDeck,
  categoryProgress,
  daysUntil,
  gradeAnswer,
  questionKind,
  type Deck,
  type Grade,
  type Scheduled,
} from "@/lib/review/schedule"
import { categoryColor, getCategory } from "@/lib/taxonomy"
import { masteredCategories } from "@/lib/review/insight"
import { formatKo } from "@/lib/dates"
import type { Mistake } from "@/lib/types"

/**
 * 복습.
 *
 * 낱장 카드를 섞어 내지 않는다. 개념 하나를 펴놓고 그 규칙에서 내가 틀린
 * 문장들을 연달아 본다 — 이 앱이 실수를 26개 카테고리로 분류해 쌓아둔 이유가
 * 여기서 값을 한다. 다시 만나는 시점은 망각곡선이 정한다.
 */

interface Answered {
  mistake: Mistake
  grade: Grade
  next: Scheduled
  /** 이번에 졸업했는지 */
  graduated: boolean
}

export default function ReviewPage() {
  const { user, profile, refreshProfile } = useAuth()

  const [mistakes, setMistakes] = useState<Mistake[] | null>(null)
  const [session, setSession] = useState<{ deck: Deck; now: number } | null>(null)
  const [ahead, setAhead] = useState(false)

  // 세션 진행 — 블록(개념) 안에서 문제를 하나씩
  const [blockIndex, setBlockIndex] = useState(0)
  const [itemIndex, setItemIndex] = useState(0)
  const [showConcept, setShowConcept] = useState(true)
  const [answer, setAnswer] = useState("")
  const [grade, setGrade] = useState<Grade | null>(null)
  const [log, setLog] = useState<Answered[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listMistakes(user.uid, 2000)
      .then((all) => {
        if (cancelled) return
        const now = Date.now()
        setMistakes(all)
        setSession({ deck: buildDeck(all, { now }), now })
      })
      .catch(() => {
        if (!cancelled) setMistakes([])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const progress = useMemo(
    () => (mistakes ? categoryProgress(mistakes) : []),
    [mistakes],
  )

  const reset = useCallback(() => {
    setBlockIndex(0)
    setItemIndex(0)
    setShowConcept(true)
    setAnswer("")
    setGrade(null)
    setLog([])
  }, [])

  /** 밀린 게 없는 날 "그래도 더 풀래요" — 만기를 앞당겨 덱을 다시 만든다. */
  const startAhead = useCallback(() => {
    const at = Date.now()
    setSession({
      deck: buildDeck(mistakes ?? [], { now: at, includeUpcoming: true }),
      now: at,
    })
    setAhead(true)
    reset()
  }, [mistakes, reset])

  if (!user) return null
  if (!mistakes || !session) return <Loading />

  const { deck, now } = session
  const block = deck.blocks[blockIndex]
  const current = block?.mistakes[itemIndex]
  const finished = !block
  const answeredCount = log.length

  /** 채점하고 다음 만기를 붙인다. 화면은 결과를 보여준 뒤 사용자가 넘긴다. */
  const submit = async (given: Grade) => {
    if (!current || grade !== null) return
    setGrade(given)

    const next = await recordReview(user.uid, current, given)
    const graduated = next.box >= GRADUATED_BOX && boxOf(current) < GRADUATED_BOX

    setLog((prev) => [...prev, { mistake: current, grade: given, next, graduated }])

    const updated = mistakes.map((m) =>
      m.id === current.id
        ? { ...m, box: next.box, dueAt: next.dueAt, reviewCount: m.reviewCount + 1 }
        : m,
    )
    setMistakes(updated)

    // 개념을 뗀 순간은 졸업이 하나 늘어난 직후뿐이다. 그때만 확인한다.
    const held = profile?.titles ?? []
    const earned = graduated
      ? masteredCategories(updated)
          .map((slug) => categoryTitle(getCategory(slug).ko))
          .filter((t) => !held.includes(t))
      : []

    await award(user.uid, {
      exp: reviewExp(boxOf(current), given) + (graduated ? EXP.graduated : 0),
      quests: [
        { id: "weekly_review", add: 1 },
        { id: "daily_review", add: 1 },
        ...(graduated ? [{ id: "weekly_graduate", add: 1 }] : []),
      ],
      ...(earned.length ? { titles: earned } : {}),
    })
    await refreshProfile()
  }

  const next = () => {
    setAnswer("")
    setGrade(null)
    if (itemIndex + 1 < block.mistakes.length) {
      setItemIndex(itemIndex + 1)
    } else {
      setBlockIndex(blockIndex + 1)
      setItemIndex(0)
      setShowConcept(true)
    }
  }

  // ── 복습할 것이 아예 없음 ────────────────────────────────────
  if (mistakes.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader no="01" title="복습" />
        <Empty
          title="복습할 실수가 아직 없어요"
          action={
            <Link href="/">
              <Pill>일기 쓰러 가기</Pill>
            </Link>
          }
        >
          일기를 첨삭받으면 거기서 나온 실수로 문제가 만들어집니다.
        </Empty>
      </div>
    )
  }

  // ── 오늘 밀린 것이 없음 ──────────────────────────────────────
  if (deck.size === 0) {
    return (
      <div className="space-y-8">
        <PageHeader no="01" title="복습" description="오늘 몫은 비어 있어요." />
        <RestDay mistakes={mistakes} now={now} onAhead={startAhead} />
        <MasteryTable progress={progress} />
      </div>
    )
  }

  // ── 세션 종료 ────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="space-y-8">
        <PageHeader no="01" title="복습" meta={ahead ? "미리 보기" : undefined} />
        <SessionResult log={log} now={now} onRestart={startAhead} />
        <MasteryTable progress={progress} />
      </div>
    )
  }

  const cat = getCategory(block.category)

  // ── 개념 카드 ────────────────────────────────────────────────
  if (showConcept) {
    return (
      <div className="space-y-8">
        <PageHeader
          no="01"
          title="복습"
          meta={`${answeredCount} / ${deck.size}`}
        />
        <ConceptCard
          slug={block.category}
          mistakes={mistakes}
          count={block.mistakes.length}
        />
        <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-6">
          <Pill onClick={() => setShowConcept(false)}>
            {cat.ko} {block.mistakes.length}문제 풀기
          </Pill>
          {blockIndex + 1 < deck.blocks.length && (
            <span className="label-sm">
              다음 개념 · {getCategory(deck.blocks[blockIndex + 1].category).ko}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── 문제 ─────────────────────────────────────────────────────
  const box = boxOf(current!)
  const kind = questionKind(box)

  return (
    <div className="space-y-8">
      <PageHeader no="01" title="복습" meta={`${answeredCount} / ${deck.size}`} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-rule">
          <div
            className="h-px bg-ink transition-[width] duration-300"
            style={{ width: `${(answeredCount / deck.size) * 100}%` }}
          />
        </div>
        <span className="label-sm tabnum">
          {cat.ko} {itemIndex + 1}/{block.mistakes.length}
        </span>
      </div>

      <div key={current!.id} className="reveal space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Tag color={categoryColor(block.category)}>{cat.ko}</Tag>
          <BoxTrail box={box} />
          <span className="ml-auto text-[11px] text-ink-3">
            {formatKo(current!.dateKey)}에 쓴 일기
          </span>
        </div>

        <Question
          mistake={current!}
          kind={kind}
          answer={answer}
          onAnswer={setAnswer}
          grade={grade}
          onSubmit={submit}
        />

        {grade !== null && (
          <Result mistake={current!} grade={grade} log={log} now={now} onNext={next} />
        )}
      </div>
    </div>
  )
}

// ── 문제 ───────────────────────────────────────────────────────────

function Question({
  mistake,
  kind,
  answer,
  onAnswer,
  grade,
  onSubmit,
}: {
  mistake: Mistake
  kind: ReturnType<typeof questionKind>
  answer: string
  onAnswer: (v: string) => void
  grade: Grade | null
  onSubmit: (grade: Grade) => void
}) {
  const locked = grade !== null

  if (kind === "choice") {
    // 처음 만나는 것은 떠올리기 전에 알아보기부터. 둘 중 어느 쪽이 맞는지만
    // 고르면 되니 부담이 적고, 틀린 쪽을 눈으로 확인하는 효과도 있다.
    const wrongFirst = hash(mistake.id) % 2 === 0
    const options = wrongFirst
      ? [mistake.original, mistake.corrected]
      : [mistake.corrected, mistake.original]

    return (
      <div>
        <p className="label-sm mb-3">둘 중 맞는 쪽을 고르세요</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((text) => (
            <button
              key={text}
              type="button"
              disabled={locked}
              onClick={() => onSubmit(text === mistake.corrected ? "correct" : "wrong")}
              className={`border px-4 py-4 text-left text-[17px] transition-colors disabled:opacity-60 ${
                locked && text === mistake.corrected
                  ? "border-good text-good"
                  : "border-field hover:bg-paper-2"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="label-sm mb-2">이 표현을 고쳐보세요</p>
      <p className="text-2xl" style={{ color: "var(--color-pen)" }}>
        {mistake.original}
      </p>

      {kind === "hinted" && (
        <p className="tabnum mt-3 text-lg text-ink-3" aria-label="첫 글자 힌트">
          {firstLetterHint(mistake.corrected)}
        </p>
      )}

      <input
        value={answer}
        onChange={(e) => onAnswer(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !locked && answer.trim()) {
            onSubmit(gradeAnswer(answer, mistake.corrected))
          }
        }}
        disabled={locked}
        aria-label="고친 표현"
        placeholder="고친 표현을 입력하세요"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="mt-4 w-full border-b border-field bg-transparent pb-2 text-lg focus:border-ink disabled:opacity-70"
      />
      <p className="mt-2 text-xs text-ink-3">
        대소문자와 구두점 차이는 맞은 것으로 봐요.
      </p>

      {!locked && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Pill
            onClick={() => onSubmit(gradeAnswer(answer, mistake.corrected))}
            disabled={!answer.trim()}
          >
            확인
          </Pill>
          <Pill variant="quiet" onClick={() => onSubmit("wrong")}>
            모르겠어요
          </Pill>
        </div>
      )}
    </div>
  )
}

const GRADE_LABEL: Record<Grade, string> = {
  correct: "정답",
  close: "거의 맞았어요",
  wrong: "다시 보기",
}

function Result({
  mistake,
  grade,
  log,
  now,
  onNext,
}: {
  mistake: Mistake
  grade: Grade
  log: Answered[]
  now: number
  onNext: () => void
}) {
  const entry = log[log.length - 1]
  const days = entry ? daysUntil(entry.next.dueAt, now) : 0

  return (
    <div className="space-y-4 border-t border-rule-2 pt-5">
      <p
        role="status"
        className="text-[11px] font-bold tracking-[0.18em] uppercase"
        style={{
          color: grade === "wrong" ? "var(--color-pen)" : "var(--color-good)",
        }}
      >
        {GRADE_LABEL[grade]}
        {/* 부모의 uppercase를 물려받으면 스크린리더가 철자를 하나씩 읽는다 */}
        <span className="sr-only normal-case">
          {grade === "correct" ? "" : ` — 정답은 ${mistake.corrected}`}
        </span>
      </p>

      <div>
        <p className="label-sm mb-1.5">정답</p>
        <p className="text-lg font-medium" style={{ color: "var(--color-good)" }}>
          {mistake.corrected}
        </p>
      </div>

      {grade !== "correct" && (
        <div>
          <p className="label-sm mb-1.5">내가 쓴 것</p>
          <p className="text-sm">
            <span className="line-through" style={{ color: "var(--color-pen)" }}>
              {mistake.original}
            </span>
          </p>
        </div>
      )}

      {mistake.explanation && (
        <p className="text-sm leading-relaxed text-ink-2">{mistake.explanation}</p>
      )}
      {mistake.tip && (
        <p className="border-l-2 border-rule pl-3 text-sm text-ink-3">{mistake.tip}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule-2 pt-4">
        {entry && <BoxTrail box={entry.next.box} />}
        <span className="text-xs text-ink-3">
          {entry?.graduated
            ? "졸업했어요. 90일 뒤에 한 번만 더 확인합니다."
            : days === 0
              ? "오늘 안에 다시 물어볼게요."
              : `${days}일 뒤에 다시 나옵니다.`}
        </span>
        <span className="ml-auto">
          <Pill onClick={onNext}>다음</Pill>
        </span>
      </div>
    </div>
  )
}

// ── 세션 결과 ──────────────────────────────────────────────────────

function SessionResult({
  log,
  now,
  onRestart,
}: {
  log: Answered[]
  now: number
  onRestart: () => void
}) {
  const right = log.filter((l) => l.grade === "correct").length
  const close = log.filter((l) => l.grade === "close").length
  const graduated = log.filter((l) => l.graduated)

  // 다음 만남을 카테고리·날짜로 묶어서 알려준다. 이 한 줄이 있어야 "랜덤
  // 퀴즈"가 아니라 "일정이 잡힌 복습"으로 읽힌다.
  const upcoming = new Map<number, string[]>()
  for (const l of log) {
    if (l.graduated) continue
    const days = daysUntil(l.next.dueAt, now)
    upcoming.set(days, [...(upcoming.get(days) ?? []), getCategory(l.mistake.category).ko])
  }
  const schedule = [...upcoming.entries()].sort((a, b) => a[0] - b[0])

  return (
    <section className="reveal space-y-8">
      <div className="border-y border-rule py-10 text-center">
        <p className="label-sm">오늘의 복습</p>
        <p className="tabnum mt-4 text-5xl font-medium">
          {right}
          <span className="text-3xl opacity-40">/{log.length}</span>
        </p>
        {close > 0 && (
          <p className="mt-2 text-sm text-ink-3">{close}개는 한 단어 차이였어요.</p>
        )}
      </div>

      {graduated.length > 0 && (
        <div className="border-b border-rule-2 pb-6">
          <p className="label-sm mb-3">졸업</p>
          <ul className="space-y-2">
            {graduated.map((l) => (
              <li key={l.mistake.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                <Tag color={categoryColor(l.mistake.category)}>
                  {getCategory(l.mistake.category).ko}
                </Tag>
                <span className="font-medium">{l.mistake.corrected}</span>
                <span className="text-ink-3">— 이제 이 표현은 놓아줘도 되겠어요.</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {schedule.length > 0 && (
        <div>
          <p className="label-sm mb-3">다음 복습</p>
          <ul className="space-y-1.5">
            {schedule.map(([days, categories]) => (
              <li key={days} className="flex items-baseline gap-3 text-sm">
                <span className="tabnum w-16 shrink-0 text-ink-3">
                  {days === 0 ? "오늘" : `${days}일 뒤`}
                </span>
                <span>{summarize(categories)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink-3">
            맞힐 때마다 다음 만남이 멀어집니다. 1일 → 3일 → 7일 → 16일 → 35일을
            모두 통과하면 졸업이에요.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-rule pt-6">
        <Pill variant="outline" onClick={onRestart}>
          더 풀기
        </Pill>
        <Link href="/report">
          <Pill variant="quiet">리포트 보기</Pill>
        </Link>
      </div>
    </section>
  )
}

function RestDay({
  mistakes,
  now,
  onAhead,
}: {
  mistakes: Mistake[]
  now: number
  onAhead: () => void
}) {
  const soonest = mistakes
    .filter((m) => (m.box ?? 0) < GRADUATED_BOX && (m.dueAt ?? 0) > now)
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))[0]

  return (
    <section className="border-y border-rule py-10 text-center">
      <p className="text-lg font-medium text-ink-2">오늘 밀린 복습이 없어요</p>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-3">
        {soonest
          ? `다음 복습은 ${daysUntil(soonest.dueAt ?? 0, now)}일 뒤예요. 그때 잊어갈 무렵에 다시 불러올게요.`
          : "쌓인 실수를 전부 졸업시켰어요."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Pill>일기 쓰러 가기</Pill>
        </Link>
        <Pill variant="quiet" onClick={onAhead}>
          그래도 미리 풀기
        </Pill>
      </div>
    </section>
  )
}

// ── 개념별 진행 ────────────────────────────────────────────────────

function MasteryTable({
  progress,
}: {
  progress: ReturnType<typeof categoryProgress>
}) {
  if (progress.length === 0) return null

  return (
    <section>
      <p className="label mb-3 border-b border-ink pb-2.5">개념별 진행</p>
      <ul>
        {progress.map((p) => {
          const cat = getCategory(p.category)
          const done = p.total ? Math.round(p.mastery * 100) : 0
          return (
            <li
              key={p.category}
              className="flex items-baseline gap-3 border-b border-rule-2 py-2.5 last:border-b-0"
            >
              <span className="w-24 shrink-0 text-sm">{cat.ko}</span>
              <span className="relative h-[3px] flex-1 bg-rule">
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${done}%`,
                    background: categoryColor(p.category),
                  }}
                />
              </span>
              <span className="tabnum w-20 shrink-0 text-right text-[11px] text-ink-3">
                {p.graduated}/{p.total} 졸업
              </span>
              {p.due > 0 && (
                <span className="tabnum w-10 shrink-0 text-right text-[11px] text-pen">
                  {p.due}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-3">
        빨간 숫자는 오늘 밀린 문제 수예요. 하루 최대 {DAILY_LIMIT}문제까지 냅니다.
      </p>
    </section>
  )
}

// ── 잡다한 것 ──────────────────────────────────────────────────────

/** 같은 문제에서 선택지 순서가 매번 바뀌지 않도록 id로 고정한다. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** "arrived in Seoul" → "a______ i_ S____" */
function firstLetterHint(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) =>
      /^\s+$/.test(part) ? part : part[0] + "_".repeat(Math.max(0, part.length - 1)),
    )
    .join("")
}

function summarize(categories: string[]): string {
  const counts = new Map<string, number>()
  for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1)
  return [...counts.entries()]
    .map(([ko, n]) => (n > 1 ? `${ko} ${n}개` : ko))
    .join(", ")
}

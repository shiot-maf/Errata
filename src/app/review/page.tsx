"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { PageHeader } from "@/components/AppShell"
import { Empty, Loading, Pill, Tag } from "@/components/ui"
import { award, listMistakes, markReviewed } from "@/lib/firebase/db"
import { EXP } from "@/lib/game"
import { prioritizeForReview } from "@/lib/analysis/aggregate"
import { answersMatch, diffWords } from "@/lib/analysis/diff"
import { categoryColor, getCategory } from "@/lib/taxonomy"
import { formatKo } from "@/lib/dates"
import type { Mistake } from "@/lib/types"

/**
 * 복습은 내가 실제로 틀린 문장으로만 낸다. 시중 문제집이 아니라
 * 내 일기에서 나온 것이라 "왜 이걸 풀어야 하는지"가 자명하다.
 */
export default function ReviewPage() {
  const { user, refreshProfile } = useAuth()
  const [deck, setDeck] = useState<Mistake[] | null>(null)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState("")
  const [checked, setChecked] = useState<null | boolean>(null)
  const [score, setScore] = useState({ right: 0, wrong: 0 })

  useEffect(() => {
    if (!user) return
    listMistakes(user.uid, 2000)
      .then((all) => setDeck(prioritizeForReview(all, 15)))
      .catch(() => setDeck([]))
  }, [user])

  const current = deck?.[index]
  const finished = deck !== null && index >= deck.length

  /**
   * 채점하고 결과를 남긴다.
   *
   * "모르겠어요"도 여기를 지나야 한다. 틀린 것으로 기록되지 않으면
   * lastReviewCorrect가 비어서 다음 복습 우선순위에 반영되지 않고,
   * 주간 퀘스트도 오르지 않는다 — 푼 건 푼 것이다.
   */
  const grade = async (correct: boolean) => {
    if (!current || !user || checked !== null) return
    setChecked(correct)
    setScore((s) => ({
      right: s.right + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }))
    await markReviewed(user.uid, current.id, correct, current.reviewCount)

    // 문제를 푼 것 자체가 주간 퀘스트 진행이고, 맞히면 EXP가 붙는다.
    await award(user.uid, {
      exp: correct ? EXP.reviewCorrect : 0,
      quests: [{ id: "weekly_review", add: 1 }],
    })
    await refreshProfile()
  }

  const check = async () => {
    if (!current) return
    await grade(answersMatch(answer, current.corrected))
  }
  const giveUp = () => void grade(false)

  const next = () => {
    setIndex((i) => i + 1)
    setAnswer("")
    setChecked(null)
  }

  const restart = () => {
    setIndex(0)
    setAnswer("")
    setChecked(null)
    setScore({ right: 0, wrong: 0 })
  }

  if (!user) return null
  if (!deck) return <Loading />

  if (deck.length === 0) {
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

  if (finished) {
    const total = score.right + score.wrong
    return (
      <div className="space-y-8">
        <PageHeader no="01" title="복습" />
        <section className="reveal border-y border-rule py-12 text-center">
          <p className="label-sm">오늘의 복습</p>
          <p className="tabnum mt-4 text-5xl font-medium">
            {score.right}
            <span className="text-3xl opacity-40">/{total}</span>
          </p>
          <p className="mt-4 text-sm text-ink-2">
            {score.wrong === 0
              ? "전부 맞혔어요. 이 표현들은 이제 몸에 붙었네요."
              : `${score.wrong}개는 아직 헷갈려요. 다음 복습에 다시 나옵니다.`}
          </p>
          <div className="mt-8 flex justify-center gap-2">
            <Pill onClick={restart}>다시 풀기</Pill>
            <Link href="/report">
              <Pill variant="outline">리포트 보기</Pill>
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const cat = getCategory(current!.category)

  return (
    <div className="space-y-8">
      <PageHeader
        no="01"
        title="복습"
        description="내가 실제로 틀렸던 표현을 다시 고쳐보세요."
      />

      {/* 진행 */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-rule">
          <div
            className="h-px bg-ink transition-[width] duration-300"
            style={{ width: `${(index / deck.length) * 100}%` }}
          />
        </div>
        <span className="label-sm tabnum">
          {index + 1} / {deck.length}
        </span>
      </div>

      <div key={current!.id} className="reveal space-y-5">
        <div className="flex items-center gap-2">
          <Tag color={categoryColor(current!.category)}>{cat.ko}</Tag>
          <span className="ml-auto text-[11px] text-ink-3">
            {formatKo(current!.dateKey)}에 쓴 일기
          </span>
        </div>

        <div>
          <p className="label-sm mb-2">이 표현을 고쳐보세요</p>
          <p className=" text-2xl" style={{ color: "var(--color-pen)" }}>
            {current!.original}
          </p>
        </div>

        <div>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              if (checked === null) void check()
              else next()
            }}
            disabled={checked !== null}
            aria-label="고친 표현"
            placeholder="고친 표현을 입력하세요"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className=" w-full border-b border-field bg-transparent pb-2 text-lg focus:border-ink disabled:opacity-70"
          />
          <p className="mt-2 text-xs text-ink-3">
            대소문자와 구두점 차이는 맞은 것으로 봐요.
          </p>
        </div>

        {checked === null ? (
          <div className="flex flex-wrap gap-2">
            <Pill onClick={check} disabled={!answer.trim()}>
              확인
            </Pill>
            <Pill variant="quiet" onClick={giveUp}>
              모르겠어요
            </Pill>
          </div>
        ) : (
          <div className="space-y-4 border-t border-rule-2 pt-5">
            {/* 채점 결과는 색으로만 알려주면 안 된다 — 글로도, 소리로도 */}
            <p
              role="status"
              className="text-[11px] font-bold tracking-[0.18em] uppercase"
              style={{ color: checked ? "var(--color-good)" : "var(--color-pen)" }}
            >
              {checked ? "정답" : "다시 보기"}
              <span className="sr-only">
                {checked ? "" : ` — 정답은 ${current!.corrected}`}
              </span>
            </p>

            <div>
              <p className="label-sm mb-1.5">정답</p>
              <p className=" text-lg font-medium" style={{ color: "var(--color-good)" }}>
                {current!.corrected}
              </p>
            </div>

            {!checked && answer.trim() && (
              <div>
                <p className="label-sm mb-1.5">내 답과의 차이</p>
                <p className=" text-sm">
                  {diffWords(answer, current!.corrected).map((t, i) =>
                    t.op === "same" ? (
                      <span key={i}>{t.text}</span>
                    ) : t.op === "remove" ? (
                      <span key={i} className="line-through" style={{ color: "var(--color-pen)" }}>
                        {t.text}
                      </span>
                    ) : (
                      <span key={i} className="font-medium" style={{ color: "var(--color-good)" }}>
                        {t.text}
                      </span>
                    ),
                  )}
                </p>
              </div>
            )}

            {current!.explanation && (
              <p className="text-sm leading-relaxed text-ink-2">{current!.explanation}</p>
            )}
            {current!.tip && (
              <p className="border-l-2 border-rule pl-3 text-sm text-ink-3">
                {current!.tip}
              </p>
            )}

            <Pill onClick={next}>
              {index + 1 === deck.length ? "결과 보기" : "다음"}
            </Pill>
          </div>
        )}
      </div>
    </div>
  )
}

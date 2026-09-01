"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { ErrorNote, Loading, Pill } from "@/components/ui"
import { PageHeader } from "@/components/AppShell"
import { ApiKeyPrompt } from "@/components/ApiKeyPrompt"
import { FeedbackView } from "@/components/FeedbackView"
import { TextSizeControl, useTextSize } from "@/components/TextSizeControl"
import { needsApiKey, requestFeedback, FeedbackError } from "@/lib/ai/client"
import {
  award,
  countWords,
  getEntry,
  listEntries,
  listMistakes,
  saveEntry,
  saveFeedback,
} from "@/lib/firebase/db"
import { EXP } from "@/lib/game"
import { currentWeekKeys } from "@/lib/dates"
import { entryHref } from "@/lib/basePath"
import { toDateKey, formatKoFull } from "@/lib/dates"
import { STORAGE_KEYS } from "@/lib/storageKeys"
import { notifyStoredValueChanged, useBrowserValue } from "@/lib/browserStore"
import type { Entry, Mistake, RawCorrection } from "@/lib/types"

const DRAFT_KEY = STORAGE_KEYS.draft

const readDraft = () => window.localStorage.getItem(DRAFT_KEY) ?? ""

function clearDraft() {
  window.localStorage.removeItem(DRAFT_KEY)
  notifyStoredValueChanged()
}

/**
 * 이번 주에 일기를 쓴 "날"의 수. 하루에 두 편을 써도 하루로 센다 —
 * 주 5일 퀘스트는 습관을 재는 것이지 분량을 재는 게 아니다.
 */
async function countWeekDays(uid: string): Promise<number> {
  const week = new Set(currentWeekKeys())
  const recent = await listEntries(uid, 40)
  return new Set(recent.filter((e) => week.has(e.dateKey)).map((e) => e.dateKey)).size
}

const NUDGES = [
  "What was the best part of today?",
  "Something small that annoyed you today.",
  "Describe someone you talked to today.",
  "What did you eat, and was it any good?",
  "One thing you're looking forward to.",
  "A decision you made today, and why.",
  "What would you do differently if today repeated?",
  "Something you noticed on your way somewhere.",
]

export default function WritePage() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const { size, index: sizeIndex, set: setSize } = useTextSize()

  const [dateKey, setDateKey] = useState(() => toDateKey())

  /*
   * 쓰던 글.
   *
   * 초안은 localStorage에 있고, 정적 HTML을 구울 때는 그 값을 알 수 없다.
   * 예전에는 빈 문자열로 시작해 효과 안에서 setText로 채웠는데, 그러면 렌더가
   * 한 번 더 돌고 빈 입력칸이 잠깐 스친다. 대신 "아직 아무것도 안 친 상태"를
   * null로 두고, 그때는 저장된 초안을 그대로 보여준다.
   */
  const savedDraft = useBrowserValue(readDraft, "")
  const [typed, setTyped] = useState<string | null>(null)
  const text = typed ?? savedDraft
  const setText = setTyped
  const [entryId, setEntryId] = useState<string | null>(null)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [corrections, setCorrections] = useState<RawCorrection[]>([])

  const [analyzing, setAnalyzing] = useState(false)
  const [needsKey, setNeedsKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const words = useMemo(() => countWords(text), [text])
  const nudge = useMemo(() => NUDGES[new Date().getDate() % NUDGES.length], [])

  // 새로고침하거나 실수로 탭을 닫아도 쓰던 글이 남도록 초안을 로컬에 둔다.
  // 글자마다 쓰면 긴 글에서 버벅이므로 잠깐 멈췄을 때만 쓴다.
  useEffect(() => {
    if (entry) return
    const id = window.setTimeout(() => window.localStorage.setItem(DRAFT_KEY, text), 400)
    return () => window.clearTimeout(id)
  }, [text, entry])

  useEffect(() => () => abortRef.current?.abort(), [])

  // 스크롤바 대신 입력창 자체가 자라게 한다 — 글이 길어져도 시야가 끊기지 않는다.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.max(el.scrollHeight, 256)}px`
  }, [text, size])

  if (!user) return null

  const analyze = async () => {
    if (words < 5) return
    if (needsApiKey()) {
      setNeedsKey(true)
      return
    }

    setAnalyzing(true)
    setError(null)
    setNeedsKey(false)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      // 지난 실수를 같이 넘겨서 "이거 저번에도 틀렸어요"를 짚어줄 수 있게 한다.
      const history = await listMistakes(user.uid, 60)
      const id = await saveEntry(user.uid, { id: entryId ?? undefined, dateKey, text })
      if (!entryId) setEntryId(id)

      const { feedback, model } = await requestFeedback({
        text,
        dateKey,
        recentMistakes: history,
        signal: controller.signal,
      })
      await saveFeedback(user.uid, id, dateKey, feedback, model)

      setEntry(await getEntry(user.uid, id))
      setCorrections(feedback.corrections)
      clearDraft()

      await award(user.uid, {
        exp:
          EXP.entry +
          Math.min(EXP.maxWordBonus, Math.floor(words / 10) * EXP.perTenWords) +
          EXP.corrected +
          (feedback.corrections.length === 0 ? EXP.flawless : 0),
        quests: [
          { id: "daily_entry", add: 1 },
          { id: "daily_words", set: words },
          { id: "weekly_days", set: await countWeekDays(user.uid) },
          ...(feedback.corrections.length === 0
            ? [{ id: "once_flawless", add: 1 }]
            : []),
        ],
      })
      await refreshProfile()
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      if (e instanceof FeedbackError) {
        if (e.kind === "no_key") setNeedsKey(true)
        else setError(e.message)
      } else {
        console.error(e)
        setError("첨삭 중 문제가 생겼어요. 일기는 저장돼 있으니 다시 시도해보세요.")
      }
    } finally {
      setAnalyzing(false)
      abortRef.current = null
    }
  }

  const saveOnly = async () => {
    if (!text.trim()) return
    const id = await saveEntry(user.uid, { id: entryId ?? undefined, dateKey, text })
    clearDraft()

    await award(user.uid, {
      exp: EXP.entry + Math.min(EXP.maxWordBonus, Math.floor(words / 10) * EXP.perTenWords),
      quests: [
        { id: "daily_entry", add: 1 },
        { id: "daily_words", set: words },
        { id: "weekly_days", set: await countWeekDays(user.uid) },
      ],
    })
    await refreshProfile()
    router.push(entryHref(id))
  }

  const startNew = () => {
    setEntry(null)
    setCorrections([])
    setEntryId(null)
    setText("")
    setDateKey(toDateKey())
  }

  // ── 첨삭 결과 ────────────────────────────────────────────────
  const feedback = entry?.feedback
  if (entry && feedback) {
    const asMistakes = corrections.map(
      (c, i) =>
        ({
          ...c,
          id: `local-${i}`,
          entryId: entryId ?? "",
          dateKey,
          // 화면에 쓰이진 않지만, 렌더 중 Date.now()는 부를 때마다 값이 달라진다.
          // 이 실수들이 나온 시각은 첨삭이 끝난 시각이다.
          createdAt: feedback.analyzedAt,
          reviewCount: 0,
        }) satisfies Mistake,
    )
    return (
      <div className="reveal">
        <PageHeader no="01" title="첨삭 결과" meta={formatKoFull(dateKey)} />

        <FeedbackView entry={entry} mistakes={asMistakes} entryId={entryId ?? ""} />

        <div className="mt-8 flex flex-wrap gap-3 border-t border-rule pt-8">
          <Pill variant="outline" onClick={startNew}>
            새 일기
          </Pill>
          <Pill variant="quiet" onClick={() => router.push("/report")}>
            리포트 보기
          </Pill>
          <Pill variant="quiet" onClick={() => router.push("/review")}>
            복습하기
          </Pill>
        </div>
      </div>
    )
  }

  // ── 작성 ─────────────────────────────────────────────────────
  return (
    <div className="reveal">
      <PageHeader
        no="01"
        title="오늘의 기록"
        meta={
          <input
            type="date"
            value={dateKey}
            max={toDateKey()}
            onChange={(e) => e.target.value && setDateKey(e.target.value)}
            aria-label="일기 날짜"
            className="label-sm bg-transparent"
          />
        }
      />

      <div>
        <h2 className="text-xl font-semibold tracking-[-0.02em] md:text-2xl">
          고치려고 멈추지 마세요.
        </h2>
        <p className="mt-2 max-w-prose text-sm text-ink-2">
          틀린 채로 끝까지 쓴 문장이 가장 좋은 데이터가 됩니다. 지운 문장은 세어지지
          않습니다.
        </p>

        {/* 글자 수는 아래 Count 블록에서 한 번만 보여준다 */}
        <div className="mt-5 flex items-center justify-end">
          <TextSizeControl index={sizeIndex} onChange={setSize} />
        </div>

        <div className="mt-2 border-y border-rule py-4">
          {/* 괘선은 안쪽에 — 바깥 여백이 줄을 밀면 글자가 줄 위에 앉지 않는다 */}
          <div className="ruled">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="오늘의 영어 일기"
              placeholder={`Today…\n\n${nudge}`}
              rows={6}
              spellCheck={false}
              autoCapitalize="sentences"
              style={{ fontSize: size, lineHeight: "32px", maxWidth: "62ch" }}
              className="min-h-[12rem] w-full resize-none overflow-hidden bg-transparent text-ink caret-pen placeholder:text-ink-3"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex gap-6">
            <Count value={words} unit="words" />
            <Count value={text.length} unit="chars" />
          </div>
          <div className="flex flex-col gap-1 sm:ml-auto sm:flex-row sm:items-center sm:gap-4">
            <Pill onClick={analyze} disabled={words < 5} busy={analyzing} block>
              {analyzing ? "첨삭 중" : "첨삭 실행"}
            </Pill>
            <Pill variant="quiet" onClick={saveOnly} disabled={!text.trim() || analyzing}>
              첨삭 없이 저장
            </Pill>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {needsKey && <ApiKeyPrompt onSaved={() => void analyze()} />}
        {error && <ErrorNote>{error}</ErrorNote>}
        {analyzing && <Loading label="첨삭하는 중… 20초쯤 걸려요" />}
      </div>

      <p className="mt-8 border-t border-rule-2 pt-6 text-xs text-ink-3">
        지난 일기는{" "}
        <Link href="/history" className="underline underline-offset-4 hover:text-ink">
          기록
        </Link>
        에, 누적 취약점은{" "}
        <Link href="/report" className="underline underline-offset-4 hover:text-ink">
          리포트
        </Link>
        에 있어요.
      </p>
    </div>
  )
}

function Count({ value, unit }: { value: number; unit: string }) {
  return (
    <div>
      <b className="tabnum block text-xl leading-tight font-medium">{value}</b>
      <span className="label-sm">{unit}</span>
    </div>
  )
}

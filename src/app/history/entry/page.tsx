"use client"

import { Suspense, useEffect, useReducer, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { Empty, ErrorNote, Loading, Pill } from "@/components/ui"
import { FeedbackView } from "@/components/FeedbackView"
import { ApiKeyPrompt } from "@/components/ApiKeyPrompt"
import { deleteEntry, getEntry, listMistakes, saveFeedback } from "@/lib/firebase/db"
import { FeedbackError, needsApiKey, requestFeedback } from "@/lib/ai/client"
import { formatKoFull } from "@/lib/dates"
import type { Entry, Mistake } from "@/lib/types"

export default function EntryDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EntryDetail />
    </Suspense>
  )
}

function EntryDetail() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const id = useSearchParams().get("id") ?? ""

  const [entry, setEntry] = useState<Entry | null | "missing">(null)
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [needsKey, setNeedsKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  /*
   * 다시 읽기.
   *
   * 재첨삭이 끝나면 같은 일기를 다시 불러와야 한다. 예전에는 load()를
   * useCallback으로 만들어 효과와 재첨삭이 함께 불렀는데, 그러면 효과가
   * "언제 무엇을 불러오는지"를 콜백에게 넘겨버려서 취소 처리가 끼어들 자리가
   * 없었다. 이제 불러오기는 효과 하나가 전담하고, 재첨삭은 reload()로
   * "다시 읽어라"고만 말한다.
   */
  const [reloadToken, reload] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (!user || !id) return
    let cancelled = false

    void (async () => {
      const e = await getEntry(user.uid, id)
      if (cancelled) return
      if (!e) {
        setEntry("missing")
        return
      }
      setEntry(e)

      const all = await listMistakes(user.uid, 2000)
      if (!cancelled) setMistakes(all.filter((m) => m.entryId === id))
    })()

    return () => {
      cancelled = true
    }
  }, [user, id, reloadToken])

  if (!user) return null
  if (!id) {
    return (
      <Empty
        title="어떤 일기인지 알 수 없어요"
        action={
          <Link href="/history">
            <Pill variant="outline">기록으로</Pill>
          </Link>
        }
      >
        주소에 일기 번호가 빠져 있습니다.
      </Empty>
    )
  }
  if (entry === null) return <Loading />
  if (entry === "missing") {
    return (
      <Empty
        title="일기를 찾을 수 없어요"
        action={
          <Link href="/history">
            <Pill variant="outline">기록으로</Pill>
          </Link>
        }
      >
        삭제되었거나 주소가 잘못되었습니다.
      </Empty>
    )
  }

  const analyze = async () => {
    if (needsApiKey()) {
      setNeedsKey(true)
      return
    }
    setAnalyzing(true)
    setError(null)
    setNeedsKey(false)
    try {
      // 이 일기 자신의 실수는 이력에서 빼야 같은 지적을 되풀이하지 않는다.
      const history = (await listMistakes(user.uid, 80)).filter((m) => m.entryId !== id)
      const { feedback, model } = await requestFeedback({
        text: entry.text,
        dateKey: entry.dateKey,
        recentMistakes: history,
      })
      await saveFeedback(user.uid, id, entry.dateKey, feedback, model)
      reload()
      await refreshProfile()
    } catch (e) {
      if (e instanceof FeedbackError && e.kind === "no_key") setNeedsKey(true)
      else setError(e instanceof FeedbackError ? e.message : "첨삭에 실패했어요.")
    } finally {
      setAnalyzing(false)
    }
  }

  const remove = async () => {
    if (!window.confirm("이 일기와 여기서 나온 실수 기록을 함께 삭제할까요?")) return
    await deleteEntry(user.uid, id)
    router.push("/history")
  }

  return (
    <div className="reveal">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-3">
        <div>
          <Link href="/history" className="label-sm hover:text-ink">
            ← History
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            {formatKoFull(entry.dateKey)}
          </h1>
          <p className="tabnum mt-2 text-sm text-ink-3">{entry.wordCount} words</p>
        </div>
        <button
          onClick={remove}
          className="text-[11px] font-bold tracking-[0.18em] uppercase transition-colors hover:opacity-80"
          style={{ color: "var(--color-pen)" }}
        >
          삭제
        </button>
      </header>

      {entry.feedback ? (
        <>
          <section>
            <button
              onClick={() => setShowOriginal((v) => !v)}
              className="label-sm mb-3 hover:text-ink"
            >
              내가 쓴 원문 {showOriginal ? "접기 ▲" : "펼치기 ▼"}
            </button>
            {showOriginal && (
              <div>
                <p className=" text-[16px] whitespace-pre-wrap text-ink-2">
                  {entry.text}
                </p>
              </div>
            )}
          </section>

          <FeedbackView entry={entry} mistakes={mistakes} entryId={id} />

          <div className="border-t border-rule-2 pt-8">
            <Pill variant="outline" onClick={analyze} busy={analyzing}>
              {analyzing ? "다시 첨삭 중" : "다시 첨삭 받기"}
            </Pill>
            <p className="mt-3 text-xs text-ink-3">
              다시 첨삭하면 이 일기의 기존 실수 기록은 새 결과로 교체됩니다.
            </p>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className=" text-[17px] whitespace-pre-wrap">{entry.text}</p>
          </div>

          {needsKey && <ApiKeyPrompt onSaved={() => void analyze()} />}
          {error && <ErrorNote>{error}</ErrorNote>}

          {analyzing ? (
            <Loading label="첨삭하는 중…" />
          ) : (
            <Pill onClick={analyze}>Correct</Pill>
          )}
        </>
      )}
    </div>
  )
}

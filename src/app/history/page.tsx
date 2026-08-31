"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { PageHeader } from "@/components/AppShell"
import { Empty, Loading, Pill, Segmented, Tag } from "@/components/ui"
import { listEntries } from "@/lib/firebase/db"
import { formatKo } from "@/lib/dates"
import { entryHref } from "@/lib/basePath"
import { DiffText } from "@/components/DiffText"
import type { Entry } from "@/lib/types"

type Filter = "all" | "corrected" | "pending"

export default function HistoryPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  useEffect(() => {
    if (!user) return
    listEntries(user.uid, 300)
      .then(setEntries)
      .catch(() => setEntries([]))
  }, [user])

  const filtered = useMemo(() => {
    if (!entries) return null
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (filter === "corrected" && !e.feedback) return false
      if (filter === "pending" && e.feedback) return false
      if (!q) return true
      return (
        e.text.toLowerCase().includes(q) ||
        (e.feedback?.correctedText.toLowerCase().includes(q) ?? false)
      )
    })
  }, [entries, query, filter])

  // 월 단위로 묶어야 일기가 쌓여도 스크롤이 막막하지 않다.
  const grouped = useMemo(() => {
    if (!filtered) return []
    const map = new Map<string, Entry[]>()
    for (const e of filtered) {
      const month = e.dateKey.slice(0, 7)
      map.set(month, [...(map.get(month) ?? []), e])
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  if (!user) return null

  return (
    <div className="space-y-8">
      <PageHeader
        no="01"
        title="기록"
        description="지금까지 쓴 일기를 날짜순으로 모아뒀어요."
        action={
          <Link href="/">
            <Pill variant="outline">새 일기</Pill>
          </Link>
        }
      />

      {!entries ? (
        <Loading />
      ) : entries.length === 0 ? (
        <Empty
          title="아직 일기가 없어요"
          action={
            <Link href="/">
              <Pill>첫 일기 쓰기</Pill>
            </Link>
          }
        >
          세 문장이어도 충분해요. 쓰기 시작하면 여기에 쌓입니다.
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="일기 내용 검색"
              type="search"
              placeholder="내용으로 검색"
              className="min-w-0 flex-1 rounded-full border border-field bg-transparent px-4 py-2 text-sm"
            />
            <Segmented
              label="첨삭 여부"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "전체" },
                { value: "corrected", label: "첨삭됨" },
                { value: "pending", label: "대기" },
              ]}
            />
          </div>

          {filtered?.length === 0 ? (
            <Empty title="찾는 일기가 없어요">
              검색어나 필터를 바꿔보세요.
            </Empty>
          ) : (
            grouped.map(([month, list]) => (
              <section key={month} className="space-y-3">
                <h2 className="label-sm border-t border-rule-2 pt-5">
                  {month.slice(0, 4)}. {month.slice(5, 7)} — {list.length}편
                </h2>
                {list.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    open={openIds.has(e.id)}
                    onToggle={() => toggle(e.id)}
                  />
                ))}
              </section>
            ))
          )}
        </>
      )}
    </div>
  )
}

/**
 * 목록에서 바로 읽을 수 있게 펼쳐진다.
 * 예전에는 행을 누르면 상세 페이지로 넘어갔는데, 지난 일기를 훑어볼 때
 * 매번 들어갔다 나오는 게 번거로웠다. 이제 내용은 여기서 읽고,
 * 교정 하나하나를 볼 때만 상세로 간다.
 */
function EntryRow({
  entry,
  open,
  onToggle,
}: {
  entry: Entry
  open: boolean
  onToggle: () => void
}) {
  const [showCorrected, setShowCorrected] = useState(false)
  const preview = entry.text.replace(/\s+/g, " ").slice(0, 120)
  const clean = entry.feedback?.correctionCount === 0

  return (
    <div className="border-b border-rule-2 last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="block w-full px-5 py-4 text-left"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{formatKo(entry.dateKey)}</span>
          <span className="tabnum text-xs text-ink-3">{entry.wordCount} words</span>
          <span className="ml-auto flex items-center gap-2">
            {entry.feedback ? (
              <Tag color={clean ? "var(--color-good)" : undefined}>
                {clean ? "무결점" : `교정 ${entry.feedback.correctionCount}`}
              </Tag>
            ) : (
              <Tag>첨삭 대기</Tag>
            )}
            <span
              aria-hidden
              className={`text-ink-4 transition-transform ${open ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </span>
        </div>
        {!open && (
          <p className=" line-clamp-2 text-sm text-ink-3">
            {preview}
            {entry.text.length > 120 && "…"}
          </p>
        )}
      </button>

      {open && (
        <div className="reveal border-t border-rule-2 px-5 py-5">
          {entry.feedback && (
            <div className="mb-4 flex gap-1 rounded-full border border-rule-2 p-0.5 text-[10px] font-bold tracking-[0.14em] uppercase">
              <Toggle active={!showCorrected} onClick={() => setShowCorrected(false)}>
                원문
              </Toggle>
              <Toggle active={showCorrected} onClick={() => setShowCorrected(true)}>
                교정본
              </Toggle>
            </div>
          )}

          <p className=" text-[16px] whitespace-pre-wrap">
            {entry.feedback && showCorrected ? (
              <DiffText before={entry.text} after={entry.feedback.correctedText} />
            ) : (
              entry.text
            )}
          </p>

          {entry.feedback?.overallComment && (
            <p className="mt-4 border-l-2 border-rule pl-3 text-sm leading-relaxed text-ink-2">
              {entry.feedback.overallComment}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              href={entryHref(entry.id)}
              className="text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase underline-offset-4 hover:text-ink hover:underline"
            >
              {entry.feedback ? "교정 하나씩 보기 →" : "첨삭 받기 →"}
            </Link>
            {entry.feedback && (
              <span className="tabnum text-[11px] text-ink-3">
                {entry.feedback.level} · 문법 {entry.feedback.scores.grammar} · 어휘{" "}
                {entry.feedback.scores.vocabulary}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Toggle({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 transition-colors ${
        active ? "bg-ink text-sheet" : "text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  )
}

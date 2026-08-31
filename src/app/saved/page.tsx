"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { PageHeader } from "@/components/AppShell"
import { Empty, Loading, Pill, Segmented, Tag } from "@/components/ui"
import { listSaved, removeSaved } from "@/lib/firebase/db"
import { categoryColor, getCategory } from "@/lib/taxonomy"
import { formatKo } from "@/lib/dates"
import { invalidateSaved } from "@/components/SaveButton"
import type { SavedItem } from "@/lib/types"

type Filter = "all" | "correction" | "phrase"

/** 저장함 필터: "표현"은 제안(phrase)과 발췌(selection)를 함께 담는다. */
const matchesFilter = (kind: string, filter: Filter) =>
  filter === "all" ||
  (filter === "correction" ? kind === "correction" : kind !== "correction")

export default function SavedPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<SavedItem[] | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    listSaved(user.uid)
      .then(setItems)
      .catch(() => setItems([]))
  }, [user])

  const filtered = useMemo(
    () => items?.filter((i) => matchesFilter(i.kind, filter)) ?? null,
    [items, filter],
  )

  const drop = async (id: string) => {
    if (!user) return
    await removeSaved(user.uid, id)
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? null)
    invalidateSaved()
  }

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (!user) return null

  return (
    <div className="space-y-8">
      <PageHeader
        no="01"
        title="저장함"
        description="교정된 일기에서 긁어 담은 표현과, 북마크한 교정들. 정답이 있는 항목은 가려놓고 떠올려볼 수 있어요."
        action={
          items && items.length > 0 ? (
            <Segmented
              label="종류"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "전체" },
                { value: "correction", label: "교정" },
                { value: "phrase", label: "표현" },
              ]}
            />
          ) : undefined
        }
      />

      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty
          title="저장함이 비어 있어요"
          action={
            <Link href="/history">
              <Pill variant="outline">기록 보기</Pill>
            </Link>
          }
        >
          교정된 일기에서 마음에 드는 표현을 드래그하거나, 교정 카드의 북마크 아이콘을
          누르면 여기에 담깁니다.
        </Empty>
      ) : filtered?.length === 0 ? (
        <Empty title="이 종류로 담아둔 게 없어요" />
      ) : (
        <div className="space-y-3">
          {filtered?.map((item) => {
            const open = revealed.has(item.id)
            return (
              <div key={item.id} className="border-b border-rule-2 py-5 last:border-b-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {item.category ? (
                    <Tag color={categoryColor(item.category)}>
                      {getCategory(item.category).ko}
                    </Tag>
                  ) : (
                    <Tag>{item.kind === "selection" ? "발췌" : "표현"}</Tag>
                  )}
                  <span className="ml-auto text-[11px] text-ink-3">
                    {item.dateKey && formatKo(item.dateKey)}
                  </span>
                  <button
                    onClick={() => drop(item.id)}
                    aria-label="저장함에서 빼기"
                    className="text-[11px] font-bold tracking-[0.14em] text-ink-3 uppercase hover:text-ink"
                  >
                    빼기
                  </button>
                </div>

                {item.back ? (
                  <>
                    <p className=" text-[15px] text-ink-2">{item.front}</p>
                    <button
                      onClick={() => toggleReveal(item.id)}
                      className="mt-3 block w-full text-left"
                      aria-expanded={open}
                    >
                      {open ? (
                        <p
                          className=" text-[15px] font-medium"
                          style={{ color: "var(--color-good)" }}
                        >
                          {item.back}
                        </p>
                      ) : (
                        <p className="label-sm border border-rule px-3 py-2 text-center">
                          눌러서 정답 보기
                        </p>
                      )}
                    </button>
                    {open && item.note && (
                      <p className="mt-3 text-sm leading-relaxed text-ink-2">{item.note}</p>
                    )}
                  </>
                ) : (
                  /* 드래그해서 담은 발췌 — 맞힐 정답이 없으니 그냥 보여준다 */
                  <>
                    <p className=" text-[17px] leading-relaxed">
                      &ldquo;{item.front}&rdquo;
                    </p>
                    {item.note && (
                      <p className=" mt-3 border-l-2 border-rule pl-3 text-sm leading-relaxed text-ink-3">
                        {item.note}
                      </p>
                    )}
                  </>
                )}

                {item.entryId && (
                  <Link
                    href={`/history/entry?id=${item.entryId}`}
                    className="mt-3 inline-block text-[11px] text-ink-3 underline underline-offset-2 hover:text-ink"
                  >
                    원래 일기 보기
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

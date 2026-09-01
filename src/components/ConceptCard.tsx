"use client"

import { getCategory, categoryColor, CATEGORY_GROUPS } from "@/lib/taxonomy"
import { categoryInsight } from "@/lib/review/insight"
import { Tag } from "./ui"
import type { Mistake } from "@/lib/types"

/**
 * 개념 카드 — 복습 묶음이 시작될 때 한 번 펴는 지면.
 *
 * 위쪽은 문법책에도 있는 규칙이고, 아래쪽은 이 앱에만 있는 것이다:
 * 그 규칙 아래에서 내가 실제로 무엇을 몇 번 틀렸는지. 낱장 카드를 섞어
 * 내는 대신 이 한 장을 먼저 보여주는 게 이 복습의 전부라고 해도 된다.
 */
export function ConceptCard({
  slug,
  mistakes,
  count,
}: {
  slug: string
  mistakes: Mistake[]
  /** 이번 묶음에서 풀 문제 수 */
  count?: number
}) {
  const cat = getCategory(slug)
  const insight = categoryInsight(mistakes, slug)
  const group = CATEGORY_GROUPS[cat.group]

  return (
    <article className="reveal">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-2.5">
        <span
          className="font-mono text-[11px] font-semibold tracking-[0.1em]"
          style={{ color: categoryColor(slug) }}
        >
          {group.ko}
        </span>
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{cat.ko}</h2>
        <span className="label-sm">{cat.en}</span>
        {count !== undefined && (
          <span className="label-sm ml-auto">{count}문제</span>
        )}
      </div>

      <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-ink-2">
        {cat.concept}
      </p>

      {insight.total > 0 && (
        <div className="mt-6 border-t border-rule-2 pt-5">
          <p className="label-sm mb-2">내 기록</p>
          <p className="max-w-prose text-[15px] leading-relaxed">
            {insight.sentence}
          </p>

          {insight.repeated.length > 0 && (
            <ul className="mt-4 space-y-2">
              {insight.repeated.slice(0, 3).map((r) => (
                <li key={r.original} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <Tag quiet>{r.count}번</Tag>
                  <span className="line-through" style={{ color: "var(--color-pen)" }}>
                    {r.original}
                  </span>
                  <span aria-hidden className="font-mono text-ink-3">
                    →
                  </span>
                  <span className="font-medium" style={{ color: "var(--color-good)" }}>
                    {r.corrected}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}

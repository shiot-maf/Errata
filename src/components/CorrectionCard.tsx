"use client"

import { getCategory } from "@/lib/taxonomy"
import type { Mistake } from "@/lib/types"
import { Tag } from "./ui"
import { SaveButton } from "./SaveButton"

/** 정오표의 한 항목. 상자 대신 괘선으로 끊는다. */
export function CorrectionCard({
  mistake,
  showDate,
  entryId,
  index,
}: {
  mistake: Mistake
  showDate?: string
  entryId?: string
  index?: number
}) {
  const cat = getCategory(mistake.category)

  return (
    <article className="grid grid-cols-[28px_1fr] gap-3 border-b border-rule-2 py-5 last:border-b-0">
      <span className="pt-1 font-mono text-[11px] tracking-[0.06em] text-pen">
        {index !== undefined ? String(index + 1).padStart(2, "0") : "·"}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-y-1">
          <Tag quiet>{cat.ko}</Tag>
          {mistake.severity === "major" && <Tag>중요</Tag>}
          {showDate && <span className="ml-auto text-[11px] text-ink-4">{showDate}</span>}
          <span className={showDate ? "" : "ml-auto"}>
            <SaveButton
              item={{
                kind: "correction",
                sourceId: mistake.id,
                entryId: entryId ?? mistake.entryId,
                dateKey: mistake.dateKey,
                front: mistake.original,
                back: mistake.corrected,
                note: mistake.explanation,
                category: mistake.category,
              }}
            />
          </span>
        </div>

        <p className="mt-2.5 text-[17px] leading-relaxed">
          <del className="text-ink-4 decoration-pen decoration-2">{mistake.original}</del>
          <span className="mx-2 font-mono text-ink-4">→</span>
          <span className="font-semibold shadow-[inset_0_-8px_0_var(--color-pen-soft)]">
            {mistake.corrected}
          </span>
        </p>

        {mistake.explanation && (
          <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-ink-2">
            {mistake.explanation}
          </p>
        )}
        {mistake.tip && (
          <p className="mt-2.5 border-l-2 border-rule pl-3 text-sm text-ink-3">
            {mistake.tip}
          </p>
        )}
      </div>
    </article>
  )
}

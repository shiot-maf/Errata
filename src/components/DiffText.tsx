"use client"

import { diffWords } from "@/lib/analysis/diff"

/**
 * 원문 → 교정본의 변화를 한 덩어리 안에서 보여준다.
 * 지운 부분은 취소선, 더한 부분은 강조. 색만으로 구분하지 않도록
 * 취소선/밑줄을 같이 준다.
 */
export function DiffText({
  before,
  after,
  className = "",
}: {
  before: string
  after: string
  className?: string
}) {
  const tokens = diffWords(before, after)
  return (
    <span className={className}>
      {tokens.map((t, i) => {
        if (t.op === "same") return <span key={i}>{t.text}</span>
        if (t.op === "remove")
          return (
            <span
              key={i}
              // 드래그 저장이 삭제된 단어를 집어가지 않도록 표시해 둔다.
              data-diff="remove"
              className="line-through decoration-2"
              style={{
                color: "color-mix(in srgb, var(--color-bad) 70%, transparent)",
                textDecorationColor: "currentColor",
              }}
            >
              {t.text}
            </span>
          )
        return (
          <span
            key={i}
            className="rounded font-medium underline underline-offset-2"
            style={{
              color: "var(--color-good)",
              background: "color-mix(in srgb, var(--color-good) 10%, transparent)",
              textDecorationColor: "color-mix(in srgb, var(--color-good) 45%, transparent)",
            }}
          >
            {t.text}
          </span>
        )
      })}
    </span>
  )
}

/** 짧은 구 단위 비교 — 교정 카드 안에서 쓴다. */
export function InlineFix({ before, after }: { before: string; after: string }) {
  return (
    <p className="text-[15px] leading-relaxed">
      <span className="line-through" style={{ color: "var(--color-bad)" }}>
        {before}
      </span>
      <span className="mx-2 text-ink/30">→</span>
      <span className="font-medium" style={{ color: "var(--color-good)" }}>
        {after}
      </span>
    </p>
  )
}

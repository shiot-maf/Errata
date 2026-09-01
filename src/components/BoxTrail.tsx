"use client"

import { GRADUATED_BOX } from "@/lib/review/schedule"

/**
 * 이 실수가 망각곡선의 어디쯤 와 있는지.
 *
 * 눈금 여섯 개짜리 자다. 채워진 만큼이 통과한 간격이고, 끝까지 가면 졸업이다.
 * 숫자로 "상자 3"이라고 적으면 아무 뜻도 전해지지 않지만, 남은 눈금이 보이면
 * "두 번만 더 맞히면 된다"가 한눈에 읽힌다.
 */
const INTERVAL_LABELS = ["처음", "1일", "3일", "7일", "16일", "35일"]

export function BoxTrail({ box }: { box: number }) {
  const graduated = box >= GRADUATED_BOX
  const label = graduated
    ? `복습 ${GRADUATED_BOX}칸을 모두 통과해 졸업`
    : `복습 ${GRADUATED_BOX}칸 중 ${box}칸 통과, ${GRADUATED_BOX - box}칸 남음`

  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={label}
    >
      <span aria-hidden className="flex items-center gap-[3px]">
        {Array.from({ length: GRADUATED_BOX }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] w-3 ${i < box ? "bg-ink" : "bg-rule"}`}
          />
        ))}
      </span>
      <span
        aria-hidden
        className={`font-mono text-[10px] tracking-[0.08em] uppercase ${
          graduated ? "text-good" : "text-ink-3"
        }`}
      >
        {graduated ? "졸업" : INTERVAL_LABELS[box]}
      </span>
    </span>
  )
}

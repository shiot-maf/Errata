"use client"

import { useEffect, useRef, useState } from "react"
import { useRadioGroupKeys } from "@/lib/a11y"

/**
 * 본문 글자 크기 조절. 일기는 오래 들여다보는 화면이라
 * 사람마다 편한 크기가 꽤 다르다. 고른 값은 기기에 남는다.
 */
export const TEXT_SIZES = [19, 24, 30, 38, 47] as const
const STORAGE = "echodiary.textSize"
const DEFAULT_INDEX = 2

export function useTextSize() {
  const [index, setIndex] = useState(DEFAULT_INDEX)

  useEffect(() => {
    // 저장값이 없으면 getItem은 null인데 Number(null)은 0이다. 그대로 두면
    // 처음 온 사람에게 기본값 대신 가장 작은 글씨가 걸린다.
    const raw = window.localStorage.getItem(STORAGE)
    if (raw === null) return
    const stored = Number(raw)
    if (Number.isInteger(stored) && stored >= 0 && stored < TEXT_SIZES.length) {
      setIndex(stored)
    }
  }, [])

  const set = (i: number) => {
    setIndex(i)
    window.localStorage.setItem(STORAGE, String(i))
  }

  return { size: TEXT_SIZES[index], index, set }
}

export function TextSizeControl({
  index,
  onChange,
}: {
  index: number
  onChange: (i: number) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [bar, setBar] = useState({ x: 0, w: 0 })
  const onKeyDown = useRadioGroupKeys(TEXT_SIZES.length, index, onChange)

  // 선택된 버튼 아래로 미끄러지는 표시선. 버튼마다 폭이 달라서 실제 위치를 잰다.
  useEffect(() => {
    const wrap = wrapRef.current
    const btn = wrap?.children[index + 1] as HTMLElement | undefined
    if (!wrap || !btn) return
    setBar({ x: btn.offsetLeft, w: btn.offsetWidth })
  }, [index])

  return (
    <div
      ref={wrapRef}
      role="radiogroup"
      aria-label="본문 크기"
      onKeyDown={onKeyDown}
      className="relative flex items-baseline gap-0.5 pb-1.5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-ink transition-[transform,width] duration-300"
        style={{ width: bar.w, transform: `translateX(${bar.x}px)` }}
      />
      {TEXT_SIZES.map((px, i) => (
        <button
          key={px}
          type="button"
          role="radio"
          aria-checked={i === index}
          aria-label={`${px}px`}
          tabIndex={i === index ? 0 : -1}
          onClick={() => onChange(i)}
          data-checked={i === index}
          style={{ fontSize: 11 + i * 2.75 }}
          className="rounded-md px-2 py-1 leading-none text-ink/45 transition-colors hover:bg-ink/[0.07] hover:text-ink data-[checked=true]:text-ink"
        >
          <span style={{ fontFamily: "var(--font-content)" }}>A</span>
        </button>
      ))}
    </div>
  )
}

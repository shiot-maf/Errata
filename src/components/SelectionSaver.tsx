"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "./AuthProvider"
import { addSaved, award, listSaved } from "@/lib/firebase/db"
import { EXP } from "@/lib/game"
import { invalidateSaved } from "./SaveButton"
import { Bookmark } from "./icons"

/**
 * 교정된 일기를 읽다가 마음에 드는 표현을 드래그하면 그 자리에 저장 팝업이 뜬다.
 *
 * 교정 카드의 북마크 버튼은 "지적당한 것"을 담는 통로고, 이쪽은 "읽다가 좋았던 것"을
 * 담는 통로다. 후자가 훨씬 자주 일어나는데 버튼으로는 잡아낼 수가 없다.
 */
export function SelectionSaver({
  children,
  entryId,
  dateKey,
  /** 문맥 문장을 찾기 위한 원본 전체 텍스트 */
  sourceText,
}: {
  children: ReactNode
  entryId: string
  dateKey: string
  sourceText: string
}) {
  const { user, refreshProfile } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [popup, setPopup] = useState<{
    text: string
    x: number
    y: number
    yBottom: number
  } | null>(null)
  const [saved, setSaved] = useState(false)

  /**
   * 팝업은 document.body로 포털해서 띄운다.
   *
   * fixed는 조상에 transform이 있으면 뷰포트가 아니라 그 조상을 기준으로 잡힌다.
   * 이 앱의 .reveal 등장 애니메이션은 animation-fill-mode가 both라 끝난 뒤에도
   * transform(항등행렬)이 남고, 그게 곧 containing block이 된다. 실제로 교정 화면은
   * .reveal 안에 들어 있어서 팝업이 커서에서 한참 떨어진 자리에 떴다.
   *
   * 좌표 계산을 그 조상에 맞춰 보정하는 대신 body로 빼낸다. 나중에 어떤 래퍼가
   * 생기든 영향을 받지 않는다.
   */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const dismiss = useCallback(() => {
    setPopup(null)
    setSaved(false)
  }, [])

  const readSelection = useCallback(
    (pointer?: { x: number; y: number }) => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return dismiss()

      const range = sel.getRangeAt(0)
      const container = containerRef.current
      // 이 블록 밖(다른 문단, 사이드바 등)의 선택은 무시한다.
      if (!container || !container.contains(range.commonAncestorContainer)) return dismiss()

      const text = correctedTextIn(range)
      if (text.length < 2) return dismiss()

      const anchor = anchorFor(range, pointer)
      if (!anchor) return dismiss()

      setSaved(false)
      setPopup({ text, ...anchor })
    },
    [dismiss],
  )

  useEffect(() => {
    // 마우스는 놓는 순간, 터치는 선택 핸들을 놓는 순간이 확정 시점이다.
    // 놓은 자리를 넘겨 팝업이 커서를 따라오게 한다.
    // 팝업 자체를 누른 건 새 선택이 아니다. 저장을 누르면 save()가 선택을 지우는데,
    // 그 사이 이 핸들러가 돌면 "선택이 없다"고 보고 팝업을 즉시 닫아버려서
    // "저장됨" 표시를 볼 수가 없었다.
    const insidePopup = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("[data-selection-popup]")

    const onMouseUp = (e: MouseEvent) => {
      if (insidePopup(e.target)) return
      const x = e.clientX
      const y = e.clientY
      window.setTimeout(() => readSelection({ x, y }), 10)
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (insidePopup(e.target)) return
      const t = e.changedTouches[0]
      const point = t ? { x: t.clientX, y: t.clientY } : undefined
      window.setTimeout(() => readSelection(point), 10)
    }
    document.addEventListener("mouseup", onMouseUp)
    document.addEventListener("touchend", onTouchEnd)

    // 스크롤하면 팝업이 선택 영역에서 떨어져 나가므로 그냥 닫는다.
    const onScroll = () => dismiss()
    window.addEventListener("scroll", onScroll, true)

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss()
    document.addEventListener("keydown", onKey)

    return () => {
      document.removeEventListener("mouseup", onMouseUp)
      document.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("scroll", onScroll, true)
      document.removeEventListener("keydown", onKey)
    }
  }, [readSelection, dismiss])

  const save = async () => {
    if (!user || !popup || saved) return
    await addSaved(user.uid, {
      kind: "selection",
      sourceId: `${entryId}-sel-${popup.text.slice(0, 40)}`,
      entryId,
      dateKey,
      front: popup.text,
      back: "",
      note: findSentence(sourceText, popup.text),
    })
    invalidateSaved()

    // 북마크 버튼으로 담을 때와 같은 보상을 준다.
    await award(user.uid, {
      exp: EXP.saved,
      quests: [{ id: "once_saved", set: (await listSaved(user.uid)).length }],
    })
    await refreshProfile()

    setSaved(true)
    window.setTimeout(dismiss, 900)
    window.getSelection()?.removeAllRanges()
  }

  return (
    <>
      <div ref={containerRef}>{children}</div>
      {popup &&
        mounted &&
        createPortal(
          <SelectionPopup
            x={popup.x}
            y={popup.y}
            yBottom={popup.yBottom}
            text={popup.text}
            saved={saved}
            onSave={save}
          />,
          document.body,
        )}
    </>
  )
}

function SelectionPopup({
  x,
  y,
  yBottom,
  text,
  saved,
  onSave,
}: {
  x: number
  y: number
  yBottom: number
  text: string
  saved: boolean
  onSave: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ tx: number; ty: number; tail: number; below: boolean } | null>(
    null,
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const GAP = 10
    const EDGE = 8

    // 화면 가장자리에서는 팝업이 잘리므로 실제 폭을 재서 안으로 밀어 넣는다.
    const half = w / 2
    const cx = Math.min(Math.max(x, half + EDGE), window.innerWidth - half - EDGE)

    // 위에 자리가 없으면 아래로 뒤집는다. 커서를 따라다니다 보면 화면 맨 윗줄을
    // 고르는 일이 흔한데, 그때 팝업이 화면 밖으로 나가버린다.
    const below = y - GAP - h < EDGE

    // 가장자리에서 팝업이 밀렸어도 꼬리는 커서를 계속 가리켜야 한다.
    const tail = Math.min(Math.max(x - (cx - half), 10), w - 10)

    setPlace({ tx: cx - half, ty: below ? yBottom + GAP : y - GAP - h, tail, below })
  }, [x, y, yBottom, text])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="선택한 표현 저장"
      data-selection-popup=""
      // 팝업을 누르는 동안 선택이 풀리면 저장할 게 사라진다.
      onMouseDown={(e) => e.preventDefault()}
      /**
       * left/top이 아니라 transform으로 옮긴다. left에 좌표를 주면 요소가 그 지점부터
       * 남은 폭 안에서 줄어들어서, 화면 오른쪽 끝에서 버튼 글자가 두 줄로 접혔다.
       * 원점에 두고 배치하면 항상 전체 폭을 기준으로 재고 접히지 않는다.
       */
      className="fixed top-0 left-0 z-50"
      style={
        place
          ? { transform: `translate(${place.tx}px, ${place.ty}px)` }
          : { visibility: "hidden" }
      }
    >
      {/*
       * 등장 애니메이션은 안쪽에 건다. .reveal의 마지막 키프레임이 transform: none이고
       * fill-mode가 both라, 바깥에 걸면 위치를 잡는 transform을 영구히 덮어쓴다
       * (CSS 애니메이션은 인라인 스타일보다 우선한다).
       */}
      <div className="reveal">
        <button
          onClick={onSave}
          disabled={saved}
          className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[11px] font-bold tracking-[0.16em] whitespace-nowrap text-sheet uppercase shadow-xl shadow-ink/20 transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:hover:scale-100"
        >
          <Bookmark className="h-3.5 w-3.5" filled={saved} />
          {saved ? "저장됨" : "저장함에 담기"}
        </button>
        {/* 커서를 가리키는 꼬리 */}
        {place && (
          <span
            aria-hidden
            className="absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-ink"
            style={place.below ? { top: -3, left: place.tail } : { bottom: -3, left: place.tail }}
          />
        )}
      </div>
    </div>
  )
}

/**
 * 팝업이 붙을 자리를 고른다.
 *
 * 예전에는 range.getBoundingClientRect()의 가운데를 썼는데, 여러 줄에 걸친 선택에서는
 * 그게 모든 줄을 감싸는 상자라 가로는 문단 한가운데, 세로는 첫 줄 위가 된다. 3번째 줄
 * 중간에서 5번째 줄 중간까지 끌면 팝업이 엉뚱한 데 떴다.
 *
 * 그래서 손을 놓은 자리를 기준으로 잡는다. 가로는 커서 위치 그대로, 세로는 커서가 놓인
 * 줄의 윗변이다 — 커서 y를 그대로 쓰면 팝업 아래가 그 줄 글자를 반쯤 덮는다.
 */
function anchorFor(
  range: Range,
  pointer?: { x: number; y: number },
): { x: number; y: number; yBottom: number } | null {
  // 줄 단위 사각형. 여러 줄 선택이면 줄 수만큼 들어 있다.
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 || r.height > 0)
  if (rects.length === 0) {
    const box = range.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) return null
    return { x: box.left + box.width / 2, y: box.top, yBottom: box.bottom }
  }

  if (!pointer) {
    // 키보드로 선택한 경우엔 커서가 없다. 선택이 끝나는 줄에 붙인다.
    const last = rects[rects.length - 1]
    return { x: last.right, y: last.top, yBottom: last.bottom }
  }

  // 커서가 놓인 줄을 찾는다. 줄 사이 여백에서 놓았을 수 있으니 못 찾으면 가장 가까운 줄.
  const onLine =
    rects.find((r) => pointer.y >= r.top && pointer.y <= r.bottom) ??
    rects.reduce((best, r) =>
      Math.abs(pointer.y - (r.top + r.bottom) / 2) < Math.abs(pointer.y - (best.top + best.bottom) / 2)
        ? r
        : best,
    )

  return { x: pointer.x, y: onLine.top, yBottom: onLine.bottom }
}

/**
 * 교정본은 삭제된 원문 단어(취소선)와 섞여서 렌더링된다.
 * 그대로 selection.toString()을 쓰면 이미 지워진 단어까지 딸려 와서
 * "좋은 표현"으로 저장돼 버리므로, 선택 범위를 복제해 삭제 표시된 노드를 걷어낸다.
 */
function correctedTextIn(range: Range): string {
  const fragment = range.cloneContents()
  fragment.querySelectorAll('[data-diff="remove"]').forEach((el) => el.remove())
  return (fragment.textContent ?? "").replace(/\s+/g, " ").trim()
}

/**
 * 담아둔 표현이 나중에 봤을 때 무슨 맥락이었는지 알 수 있도록
 * 그 표현이 들어 있던 문장을 같이 저장한다.
 */
function findSentence(source: string, phrase: string): string {
  // 선택한 문자열은 공백이 정규화된 상태라 원문과 바로 대조되지 않는다.
  const flat = source.replace(/\s+/g, " ").trim()
  const index = flat.indexOf(phrase)
  if (index === -1) return ""

  const sentences = flat.split(/(?<=[.!?])\s+/)
  let cursor = 0
  for (const sentence of sentences) {
    const end = cursor + sentence.length
    if (index < end) return sentence.trim()
    cursor = end + 1 // 문장을 가른 공백 한 칸
  }
  return ""
}

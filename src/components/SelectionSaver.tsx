"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
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
  } | null>(null)
  const [saved, setSaved] = useState(false)

  const dismiss = useCallback(() => {
    setPopup(null)
    setSaved(false)
  }, [])

  const readSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return dismiss()

    const range = sel.getRangeAt(0)
    const container = containerRef.current
    // 이 블록 밖(다른 문단, 사이드바 등)의 선택은 무시한다.
    if (!container || !container.contains(range.commonAncestorContainer)) return dismiss()

    const text = correctedTextIn(range)
    if (text.length < 2) return dismiss()

    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return dismiss()

    setSaved(false)
    setPopup({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }, [dismiss])

  useEffect(() => {
    // 마우스는 놓는 순간, 터치는 선택 핸들을 놓는 순간이 확정 시점이다.
    const onPointerUp = () => window.setTimeout(readSelection, 10)
    document.addEventListener("mouseup", onPointerUp)
    document.addEventListener("touchend", onPointerUp)

    // 스크롤하면 팝업이 선택 영역에서 떨어져 나가므로 그냥 닫는다.
    const onScroll = () => dismiss()
    window.addEventListener("scroll", onScroll, true)

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss()
    document.addEventListener("keydown", onKey)

    return () => {
      document.removeEventListener("mouseup", onPointerUp)
      document.removeEventListener("touchend", onPointerUp)
      window.removeEventListener("scroll", onScroll, true)
      document.removeEventListener("keydown", onKey)
    }
  }, [readSelection, dismiss])

  const save = async () => {
    if (!user || !popup || saved) return
    try {
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
    } catch (e) {
      // 담기지 않았는데 "저장됨"이 뜨면 안 된다. 팝업을 닫지 않고 남겨서
      // 다시 눌러볼 수 있게 둔다.
      console.error("표현을 담지 못했습니다:", e)
      return
    }

    setSaved(true)
    window.setTimeout(dismiss, 900)
    window.getSelection()?.removeAllRanges()
  }

  return (
    <>
      <div ref={containerRef}>{children}</div>
      {popup && (
        <SelectionPopup
          x={popup.x}
          y={popup.y}
          text={popup.text}
          saved={saved}
          onSave={save}
        />
      )}
    </>
  )
}

function SelectionPopup({
  x,
  y,
  text,
  saved,
  onSave,
}: {
  x: number
  y: number
  text: string
  saved: boolean
  onSave: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState(x)

  // 선택 영역이 화면 가장자리에 붙어 있으면 팝업이 잘린다. 실제 폭을 재서 밀어 넣는다.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const half = el.offsetWidth / 2
    setLeft(Math.min(Math.max(x, half + 8), window.innerWidth - half - 8))
  }, [x, text])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="선택한 표현 저장"
      // 팝업을 누르는 동안 선택이 풀리면 저장할 게 사라진다.
      onMouseDown={(e) => e.preventDefault()}
      className="reveal fixed z-50 -translate-x-1/2 -translate-y-full"
      style={{ left, top: y - 10 }}
    >
      <button
        onClick={onSave}
        disabled={saved}
        className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[11px] font-bold tracking-[0.16em] text-sheet uppercase shadow-xl shadow-ink/20 transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:hover:scale-100"
      >
        <Bookmark className="h-3.5 w-3.5" filled={saved} />
        {saved ? "저장됨" : "저장함에 담기"}
      </button>
      {/* 선택 영역을 가리키는 꼬리 */}
      <span
        aria-hidden
        className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink"
        style={{ bottom: -3 }}
      />
    </div>
  )
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

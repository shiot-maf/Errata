"use client"

import { useEffect, useState } from "react"
import { checkHandle, normalizeHandle } from "@/lib/handle"
import { isHandleFree } from "@/lib/firebase/handles"

/**
 * 핸들 입력칸.
 *
 * 가입 화면과 프로필에서 같은 것을 쓴다. 형식은 그 자리에서 보고, 비어
 * 있는지는 잠깐 멈췄을 때 물어본다 — 글자마다 물으면 요청만 늘고 답은
 * 어차피 마지막 것만 쓸모가 있다.
 */

export type HandleState = "empty" | "invalid" | "checking" | "free" | "taken" | "same"

export interface HandleCheck {
  handle: string
  state: HandleState
  reason: string
}

/**
 * 형식은 렌더 중에 그냥 안다. 비어 있는지는 서버에 물어야 알고, 그건
 * 잠깐 멈췄을 때만 묻는다 — 글자마다 물으면 요청만 늘고 답은 어차피
 * 마지막 것만 쓸모가 있다.
 */
export function useHandleCheck(input: string, current?: string | null): HandleCheck {
  const handle = normalizeHandle(input)
  const mine = current ? normalizeHandle(current) : null

  // 물어보지 않고도 알 수 있는 것들
  const local: Omit<HandleCheck, "handle"> | null = !handle
    ? { state: "empty", reason: "" }
    : mine && handle === mine
      ? { state: "same", reason: "지금 쓰고 있는 이름이에요." }
      : verdictOf(handle)

  const needsLookup = local === null
  const [answer, setAnswer] = useState<{
    handle: string
    state: HandleState
    reason: string
  } | null>(null)

  useEffect(() => {
    if (!needsLookup) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      isHandleFree(handle)
        .then((free) => {
          if (cancelled) return
          setAnswer({
            handle,
            state: free ? "free" : "taken",
            reason: free ? "쓸 수 있어요." : "이미 누가 쓰고 있어요.",
          })
        })
        .catch(() => {
          if (cancelled) return
          // 못 물어봤다고 막지는 않는다. 진짜 판정은 잡을 때 한 번 더 한다.
          setAnswer({
            handle,
            state: "free",
            reason: "확인하지 못했어요. 눌러보면 알 수 있어요.",
          })
        })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [handle, needsLookup])

  if (local) return { handle, ...local }
  // 답이 지금 치고 있는 이름의 것일 때만 쓴다 — 뒤늦게 온 답은 버린다
  if (answer && answer.handle === handle) {
    return { handle, state: answer.state, reason: answer.reason }
  }
  return { handle, state: "checking", reason: "" }
}

function verdictOf(handle: string): Omit<HandleCheck, "handle"> | null {
  const verdict = checkHandle(handle)
  return verdict.ok ? null : { state: "invalid", reason: verdict.reason }
}

export function HandleInput({
  value,
  onChange,
  state,
  reason,
  id = "handle",
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  state: HandleState
  reason: string
  id?: string
  autoFocus?: boolean
}) {
  const tone =
    state === "taken" || state === "invalid"
      ? "text-pen"
      : state === "free"
        ? "text-good"
        : "text-ink-3"

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span aria-hidden className="font-mono text-sm text-ink-3">
          @
        </span>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          aria-describedby={`${id}-note`}
          placeholder="my_handle"
          className="w-full max-w-xs rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
        />
      </div>
      <p id={`${id}-note`} role="status" className={`mt-1.5 text-xs ${tone}`}>
        {reason ||
          (state === "checking"
            ? "확인하는 중…"
            : "영문 소문자·숫자·밑줄, 3~20자. 나중에 바꿀 수 있어요.")}
      </p>
    </div>
  )
}

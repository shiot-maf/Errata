"use client"

import { useState } from "react"
import { HandleError, claimHandle } from "@/lib/firebase/handles"
import { HandleInput, useHandleCheck } from "./HandleField"
import { Pill } from "./ui"

/**
 * 프로필에서 핸들을 정하거나 바꾼다.
 *
 * 이름 바로 아래에 둔다 — 여기 말고 찾아갈 자리가 없다. 아직 안 정한
 * 사람에게는 왜 필요한지 한 줄로 말해준다.
 */
export function HandleEditor({
  uid,
  current,
  onDone,
}: {
  uid: string | null
  current: string | null
  onDone: () => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const check = useHandleCheck(value, current)

  const save = async () => {
    if (!uid || busy) return
    setBusy(true)
    setError(null)
    try {
      await claimHandle(uid, check.handle, current)
      await onDone()
      setOpen(false)
      setValue("")
    } catch (e) {
      setError(e instanceof HandleError ? e.message : "핸들을 정하지 못했어요.")
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-2">
        {!current && (
          <p className="mb-1.5 text-sm text-ink-3">
            핸들을 정하면 친구가 나를 찾을 수 있어요.
          </p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase underline underline-offset-4 hover:text-ink"
        >
          {current ? "핸들 바꾸기" : "핸들 정하기"}
        </button>
      </div>
    )
  }

  const ready = check.state === "free" && !busy

  return (
    <div className="mt-3 border-l-2 border-rule pl-4">
      <HandleInput
        value={value}
        onChange={setValue}
        state={check.state}
        reason={check.reason}
        id="profile-handle"
        autoFocus
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-pen">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Pill variant="outline" onClick={() => void save()} disabled={!ready} busy={busy}>
          {current ? "바꾸기" : "정하기"}
        </Pill>
        <Pill
          variant="quiet"
          onClick={() => {
            setOpen(false)
            setValue("")
            setError(null)
          }}
        >
          취소
        </Pill>
      </div>
      {current && (
        <p className="mt-2 text-xs text-ink-3">
          바꾸면 옛 이름(@{current})은 다른 사람이 가져갈 수 있어요.
        </p>
      )}
    </div>
  )
}

"use client"

import type { ReactNode } from "react"
import { Spinner as SpinnerIcon } from "./icons"
import { useRadioGroupKeys } from "@/lib/a11y"

/** 구획 머리말 */
export function SectionTitle({
  children,
  no,
  action,
}: {
  children: ReactNode
  no?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-baseline gap-3 border-b border-ink pb-2.5">
      {no && (
        <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-pen">
          {no}
        </span>
      )}
      <h2 className="text-[15px] font-semibold">{children}</h2>
      {action && <span className="label-sm ml-auto">{action}</span>}
    </div>
  )
}

/** 설정 화면 등에서 쓰는 제목 + 설명 묶음 */
export function Section({
  title,
  description,
  children,
  className = "",
}: {
  title: string
  description?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`mb-8 border-b border-rule-2 pb-8 last:border-b-0 ${className}`}>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-prose text-sm text-ink-3">{description}</p>
      )}
      {children && <div className="mt-4 space-y-3">{children}</div>}
    </section>
  )
}

/** 지표 — 라벨은 작게, 숫자가 주인공 */
export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: "default" | "good" | "warn"
}) {
  const color =
    tone === "good" ? "text-good" : tone === "warn" ? "text-pen" : ""
  return (
    <div>
      <p className="label-sm">{label}</p>
      <p className={`tabnum mt-2 text-3xl leading-none font-medium ${color}`}>{value}</p>
      {sub && <p className="mt-2 text-xs leading-relaxed text-ink-3">{sub}</p>}
    </div>
  )
}

export function Empty({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="border-y border-rule-2 px-4 py-16 text-center">
      <p className="text-lg font-medium text-ink-2">{title}</p>
      {children && (
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-3">
          {children}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Loading({ label = "…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-16 font-mono text-xs tracking-[0.08em] text-ink-3 uppercase"
    >
      <SpinnerIcon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  )
}

/**
 * 계층대로 세 단계.
 * solid = 주 동작, outline = 보조, quiet = 3차(링크)
 */
export function Pill({
  children,
  onClick,
  disabled,
  variant = "solid",
  type = "button",
  className = "",
  busy,
  block,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "solid" | "outline" | "quiet"
  type?: "button" | "submit"
  className?: string
  busy?: boolean
  block?: boolean
}) {
  const styles = {
    solid: "bg-ink text-sheet hover:opacity-90",
    outline: "border border-rule text-ink hover:bg-paper-2",
    quiet:
      "text-ink-3 underline underline-offset-4 decoration-rule hover:text-ink px-0",
  }[variant]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-xs font-semibold tracking-[0.14em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === "quiet" ? "py-3" : "px-6 py-3.5"
      } ${block ? "w-full sm:w-auto" : ""} ${styles} ${className}`}
    >
      {busy && <SpinnerIcon className="h-3.5 w-3.5" />}
      {children}
    </button>
  )
}

/** 얇은 테두리 표식 — 배지보다 조용하다 */
export function Tag({
  children,
  color,
  quiet,
}: {
  children: ReactNode
  color?: string
  quiet?: boolean
}) {
  return (
    <span
      className="mr-1.5 inline-block border px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-[0.1em] uppercase"
      style={
        quiet
          ? { borderColor: "var(--color-rule)", color: "var(--color-ink-3)" }
          : {
              borderColor: color
                ? `color-mix(in srgb, ${color} 40%, transparent)`
                : "var(--color-pen-mid)",
              color: color ?? "var(--color-pen)",
            }
      }
    >
      {children}
    </span>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const onKeyDown = useRadioGroupKeys(options.length, index, (next) =>
    onChange(options[next].value),
  )

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex border border-field"
    >
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            // 라디오 그룹은 통째로 탭 정지점 하나다. 안에서는 화살표로 움직인다.
            tabIndex={i === index ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.1em] uppercase transition-colors ${
              i > 0 ? "border-l border-field" : ""
            } ${active ? "bg-ink text-sheet" : "text-ink-3 hover:text-ink"}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="border-l-2 border-pen bg-pen-soft px-4 py-3 text-sm text-pen">
      {children}
    </p>
  )
}

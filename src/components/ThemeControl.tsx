"use client"

import { useEffect, useState } from "react"
import { getTheme, setTheme, type Theme } from "@/lib/theme"
import { useRadioGroupKeys } from "@/lib/a11y"

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "기기 설정" },
  { value: "light", label: "종이" },
  { value: "dark", label: "먹지" },
]

export function ThemeControl() {
  const [theme, setLocal] = useState<Theme>("system")

  useEffect(() => setLocal(getTheme()), [])

  const pick = (t: Theme) => {
    setLocal(t)
    setTheme(t)
  }

  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === theme))
  const onKeyDown = useRadioGroupKeys(OPTIONS.length, index, (next) =>
    pick(OPTIONS[next].value),
  )

  return (
    <div
      role="radiogroup"
      aria-label="테마"
      onKeyDown={onKeyDown}
      className="inline-flex border border-field"
    >
      {OPTIONS.map((o, i) => {
        const active = o.value === theme
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={i === index ? 0 : -1}
            onClick={() => pick(o.value)}
            className={`px-4 py-2 font-mono text-[10px] font-medium tracking-[0.1em] uppercase transition-colors ${
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

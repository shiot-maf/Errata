"use client"

import { useEffect, useState } from "react"
import { getTheme, setTheme, type Theme } from "@/lib/theme"

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

  return (
    <div role="radiogroup" aria-label="테마" className="inline-flex border border-rule">
      {OPTIONS.map((o, i) => {
        const active = o.value === theme
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => pick(o.value)}
            className={`px-4 py-2 font-mono text-[10px] font-medium tracking-[0.1em] uppercase transition-colors ${
              i > 0 ? "border-l border-rule" : ""
            } ${active ? "bg-ink text-sheet" : "text-ink-3 hover:text-ink"}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

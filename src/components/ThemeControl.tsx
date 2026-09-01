"use client"

import { getTheme, setTheme, type Theme } from "@/lib/theme"
import { useRadioGroupKeys } from "@/lib/a11y"
import { useBrowserValue } from "@/lib/browserStore"

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "기기 설정" },
  { value: "light", label: "종이" },
  { value: "dark", label: "먹지" },
]

export function ThemeControl() {
  // 고른 테마는 localStorage에 있다. 정적 HTML에는 없으므로 "system"으로
  // 시작해서 브라우저에서 읽는다(첫 페인트의 색은 THEME_BOOTSTRAP이 맡는다).
  const theme = useBrowserValue<Theme>(getTheme, "system")

  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === theme))
  const onKeyDown = useRadioGroupKeys(OPTIONS.length, index, (next) =>
    setTheme(OPTIONS[next].value),
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
            onClick={() => setTheme(o.value)}
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

"use client"

import { useState } from "react"
import { setApiKey } from "@/lib/ai/client"
import { Pill, Section } from "./ui"

/** 첨삭을 처음 누를 때 뜨는 키 입력. 설정 화면도 같은 저장 함수를 쓴다. */
export function ApiKeyPrompt({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState("")
  const [remember, setRemember] = useState(false)

  const save = () => {
    if (!value.trim()) return
    setApiKey(value, remember)
    setValue("")
    onSaved()
  }

  return (
    <Section
      title="API 키가 필요해요"
      description="첨삭은 브라우저에서 Anthropic으로 직접 요청합니다. 키는 서버로 전송되거나 저장되지 않습니다."
    >
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="sk-ant-..."
        autoComplete="off"
        spellCheck={false}
        className="w-full max-w-md rounded-xl border border-ink/15 bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-ink/40"
      />
      <label className="flex items-center gap-2 text-sm text-ink/60">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="accent-ink"
        />
        이 기기에서 기억하기 (끄면 탭을 닫을 때 지워집니다)
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Pill onClick={save} disabled={!value.trim()}>
          저장하고 첨삭
        </Pill>
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-ink/40 underline underline-offset-2 hover:text-ink"
        >
          키 발급받기
        </a>
      </div>
    </Section>
  )
}

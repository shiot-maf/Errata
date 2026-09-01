"use client"

import { useState } from "react"
import Link from "next/link"
import { setApiKey } from "@/lib/ai/client"
import { COMPAT_PRESETS, getProvider, getCompatBaseUrl, presetFor } from "@/lib/ai/provider"
import { useBrowserValue } from "@/lib/browserStore"
import { Pill, Section } from "./ui"

/** 첨삭을 처음 누를 때 뜨는 키 입력. 설정 화면도 같은 저장 함수를 쓴다. */
export function ApiKeyPrompt({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState("")
  const [remember, setRemember] = useState(false)
  // 어느 제공자를 쓰는지에 따라 키를 받는 곳도, 키 모양도 다르다
  const provider = useBrowserValue(getProvider, "anthropic")
  const baseUrl = useBrowserValue(getCompatBaseUrl, "")
  const compat = provider === "compat"
  const preset = compat ? presetFor(baseUrl) : null
  const keyUrl = preset?.keyUrl ?? "https://console.anthropic.com/settings/keys"

  const save = () => {
    if (!value.trim()) return
    setApiKey(value, remember)
    setValue("")
    onSaved()
  }

  return (
    <Section
      title="API 키가 필요해요"
      description={
        compat
          ? `첨삭은 브라우저에서 ${preset?.label ?? "고른 제공자"}로 직접 갑니다. 키는 서버로 전송되거나 저장되지 않습니다.`
          : "첨삭은 브라우저에서 Anthropic으로 직접 요청합니다. 키는 서버로 전송되거나 저장되지 않습니다."
      }
    >
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        aria-label={compat ? "제공자 API 키" : "Anthropic API 키"}
        placeholder={compat ? "제공자에서 받은 키" : "sk-ant-..."}
        autoComplete="off"
        spellCheck={false}
        className="w-full max-w-md rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-ink-2">
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
          href={keyUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-ink-3 underline underline-offset-2 hover:text-ink"
        >
          키 발급받기
        </a>
      </div>
      {!compat && (
        <p className="text-xs text-ink-3">
          Anthropic은 크레딧을 충전해야 해요. 무료로 써보려면{" "}
          <Link href="/settings" className="underline underline-offset-2 hover:text-ink">
            설정
          </Link>
          에서 제공자를 “OpenAI 호환”으로 바꾸면 {COMPAT_PRESETS[0].label} 같은 무료
          티어를 쓸 수 있어요.
        </p>
      )}
    </Section>
  )
}

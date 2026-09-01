"use client"

import { STORAGE_KEYS } from "../storageKeys"
import { notifyStoredValueChanged } from "../browserStore"

/**
 * 첨삭을 어디에 부탁할지.
 *
 * 이 앱은 사용자의 키로 브라우저에서 직접 부른다. 그런데 Anthropic에는
 * 무료 티어가 없어서, 그냥 둘러보려던 사람이 결제 화면에서 멈춘다.
 *
 * 그래서 "OpenAI 호환" 한 벌을 더 만들었다. 제공자마다 따로 붙이지 않은
 * 이유는, Gemini(AI Studio)·Groq·OpenRouter·Cerebras·Ollama가 모두
 * /chat/completions 같은 모양을 쓰기 때문이다. 하나를 지원하면 전부 열린다.
 *
 * Anthropic 쪽을 OpenAI 호환으로 흡수하지 않은 이유도 있다. 이 앱은 tool
 * 스키마를 강제해서 26개 카테고리를 받아내는데, 그 부분은 Anthropic 쪽이
 * 더 단단하다. 기본값은 그대로 두고 선택지를 늘린다.
 */

export type ProviderId = "anthropic" | "compat"

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  compat: "OpenAI 호환",
}

export interface CompatPreset {
  id: string
  label: string
  /** /chat/completions 앞까지 */
  baseUrl: string
  /** 처음 채워둘 모델 이름 — 목록에서 바꿀 수 있다 */
  model: string
  /** 키를 받는 곳 */
  keyUrl: string
  note: string
}

/*
 * 미리 채워두는 곳들.
 *
 * 모델 이름은 여기 적힌 순간부터 낡기 시작한다. 실제로 처음 붙였을 때
 * 적어둔 gemini-2.5-flash는 배포하자마자 404가 났다. 그래서 이 값은
 * "처음 채워두는 값"일 뿐이고, 진짜 이름은 설정 화면이 제공자의 /models에
 * 직접 물어본다. 키를 넣고 제공자를 고르면 그 목록을 바로 불러온다.
 */
export const COMPAT_PRESETS: CompatPreset[] = [
  {
    id: "gemini",
    label: "Google Gemini (AI Studio)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-3-flash-preview",
    keyUrl: "https://aistudio.google.com/apikey",
    note: "구글 계정이면 무료 티어가 있어요. Google One 구독과는 별개로, 키는 AI Studio에서 따로 받습니다.",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
    note: "무료 티어가 있고 응답이 아주 빠릅니다. 오픈 모델을 씁니다.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.5-flash",
    keyUrl: "https://openrouter.ai/keys",
    note: "여러 제공자를 한 키로 씁니다. 이름이 :free로 끝나는 모델은 무료예요.",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    model: "llama-3.3-70b",
    keyUrl: "https://cloud.cerebras.ai",
    note: "무료 티어가 있습니다.",
  },
  {
    id: "ollama",
    label: "Ollama (내 컴퓨터)",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1",
    keyUrl: "https://ollama.com/download",
    note: "내 컴퓨터에서 돌리므로 완전히 무료입니다. 키는 아무 값이나 넣으면 되고, 이 페이지가 https라면 브라우저가 http 요청을 막을 수 있어요.",
  },
]

export function presetFor(baseUrl: string): CompatPreset | null {
  const normalized = trimSlash(baseUrl)
  return COMPAT_PRESETS.find((p) => trimSlash(p.baseUrl) === normalized) ?? null
}

export function trimSlash(url: string): string {
  return url.trim().replace(/\/+$/, "")
}

// ── 저장 ──────────────────────────────────────────────────────────

export function getProvider(): ProviderId {
  if (typeof window === "undefined") return "anthropic"
  return window.localStorage.getItem(STORAGE_KEYS.provider) === "compat"
    ? "compat"
    : "anthropic"
}

export function setProvider(provider: ProviderId): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEYS.provider, provider)
  notifyStoredValueChanged()
}

export function getCompatBaseUrl(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(STORAGE_KEYS.compatBaseUrl) ?? ""
}

export function getCompatModel(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(STORAGE_KEYS.compatModel) ?? ""
}

export function setCompatEndpoint(baseUrl: string, model: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEYS.compatBaseUrl, trimSlash(baseUrl))
  window.localStorage.setItem(STORAGE_KEYS.compatModel, model.trim())
  notifyStoredValueChanged()
}

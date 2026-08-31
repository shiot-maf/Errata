"use client"

import { FEEDBACK_TOOL } from "./schema"
import { buildSystemPrompt, buildUserMessage } from "./prompt"
import type { Mistake, RawFeedback } from "../types"
import { CATEGORY_SLUGS, SEVERITIES, type Severity } from "../taxonomy"
import { demoFeedback, isDemo } from "../demo/store"

/**
 * BYO(Bring Your Own) 키 방식.
 *
 * 사용자의 Anthropic 키는 브라우저 밖으로 나가지 않는다 — 우리 서버를
 * 거치지 않고 브라우저에서 api.anthropic.com으로 바로 간다. 그래서 서버에
 * 키를 저장할 일도, 유출될 일도 없다.
 *
 * 나중에 서버 프록시로 바꾸고 싶으면 이 파일의 requestFeedback 하나만
 * /api/feedback 호출로 갈아끼우면 된다. 나머지 코드는 손댈 게 없다.
 */

/**
 * 모델.
 *
 * 날짜 접미사가 붙지 않은 id를 쓴다 — 이쪽이 현재 세대를 가리킨다.
 * 첨삭은 하루 한 번, 200단어 남짓을 보는 일이라 요청 수가 적다. 그래서
 * 기본값을 가장 싼 쪽이 아니라 가장 꼼꼼한 쪽에 둔다. 문법을 잘못 짚으면
 * 그게 그대로 통계에 쌓여서 없는 약점을 만들어내기 때문이다.
 */
export const DEFAULT_MODEL = "claude-opus-5"

export const MODELS = [
  { id: "claude-opus-5", label: "Opus 5 — 가장 꼼꼼함 (추천)" },
  { id: "claude-sonnet-5", label: "Sonnet 5 — 균형" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5 — 빠르고 저렴" },
]

const KEY_STORAGE = "echodiary.anthropicKey"
const MODEL_STORAGE = "echodiary.model"
const REMEMBER_STORAGE = "echodiary.rememberKey"

// ── 키 보관 ───────────────────────────────────────────────────────
// 기본값은 sessionStorage(탭 닫으면 사라짐). 사용자가 "이 기기에서 기억"을
// 켜면 localStorage로 옮긴다. 본인 기기에서의 편의와 안전 사이 선택은
// 사용자가 하게 둔다.

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null
  return (
    window.sessionStorage.getItem(KEY_STORAGE) ??
    window.localStorage.getItem(KEY_STORAGE)
  )
}

export function setApiKey(key: string, remember: boolean): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(KEY_STORAGE)
  window.localStorage.removeItem(KEY_STORAGE)
  const store = remember ? window.localStorage : window.sessionStorage
  store.setItem(KEY_STORAGE, key.trim())
  window.localStorage.setItem(REMEMBER_STORAGE, remember ? "1" : "0")
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(KEY_STORAGE)
  window.localStorage.removeItem(KEY_STORAGE)
}

export function isKeyRemembered(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(REMEMBER_STORAGE) === "1"
}

export function getModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL
  const stored = window.localStorage.getItem(MODEL_STORAGE)
  // 예전에 고른 모델이 목록에서 빠졌을 수 있다(세대 교체). 그대로 보내면
  // 첨삭이 404로 죽으므로, 모르는 값이면 기본값으로 돌아간다.
  return MODELS.some((m) => m.id === stored) ? stored! : DEFAULT_MODEL
}

export function setModel(model: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(MODEL_STORAGE, model)
}

// ── 호출 ──────────────────────────────────────────────────────────

export class FeedbackError extends Error {
  constructor(
    message: string,
    readonly kind: "no_key" | "auth" | "rate_limit" | "network" | "malformed" | "server",
  ) {
    super(message)
    this.name = "FeedbackError"
  }
}

interface AnthropicContentBlock {
  type: string
  name?: string
  input?: unknown
}

export async function requestFeedback(args: {
  text: string
  dateKey: string
  recentMistakes: Mistake[]
  signal?: AbortSignal
}): Promise<{ feedback: RawFeedback; model: string }> {
  if (isDemo()) {
    // 첨삭이 도는 느낌은 살리되 실제 요청은 보내지 않는다.
    await new Promise((r) => setTimeout(r, 900))
    return { feedback: demoFeedback(args.text), model: "demo" }
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    throw new FeedbackError("Anthropic API 키가 설정되지 않았어요.", "no_key")
  }

  const model = getModel()

  let res: Response
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: args.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // 브라우저에서 직접 호출하려면 이 헤더가 필요하다.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        // 교정본 전체 + 교정 항목 + 한국어 설명이 한 번에 나온다. 게다가
        // 요즘 모델은 생각하는 토큰도 이 한도를 함께 쓴다. 4000으로는 긴
        // 일기에서 결과가 중간에 잘린다.
        max_tokens: 16000,
        system: buildSystemPrompt(args.recentMistakes),
        messages: [{ role: "user", content: buildUserMessage(args.text, args.dateKey) }],
        tools: [FEEDBACK_TOOL],
        tool_choice: { type: "tool", name: FEEDBACK_TOOL.name },
      }),
    })
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e
    throw new FeedbackError(
      "Anthropic API에 연결하지 못했어요. 네트워크를 확인해주세요.",
      "network",
    )
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    if (res.status === 401 || res.status === 403) {
      throw new FeedbackError("API 키가 올바르지 않거나 권한이 없어요.", "auth")
    }
    if (res.status === 429) {
      throw new FeedbackError("요청이 너무 잦아요. 잠시 후 다시 시도해주세요.", "rate_limit")
    }
    throw new FeedbackError(
      `Anthropic API 오류 (${res.status}). ${body.slice(0, 200)}`,
      "server",
    )
  }

  const data = (await res.json()) as {
    content?: AnthropicContentBlock[]
    stop_reason?: string
  }
  const block = data.content?.find(
    (c) => c.type === "tool_use" && c.name === FEEDBACK_TOOL.name,
  )
  if (!block?.input) {
    // 한도에 걸려 잘린 것이면 다시 눌러도 같은 자리에서 잘린다.
    // 무엇을 해야 하는지 말해주는 편이 낫다.
    throw new FeedbackError(
      data.stop_reason === "max_tokens"
        ? "일기가 길어서 첨삭이 중간에 잘렸어요. 조금 나눠서 써보세요."
        : "첨삭 결과를 읽지 못했어요. 다시 시도해주세요.",
      "malformed",
    )
  }

  return { feedback: normalize(block.input, args.text), model }
}

/**
 * 모델 출력은 스키마를 따르지만, 저장 전에 한 번 더 조인다.
 * 특히 category가 택소노미 밖으로 나가면 통계가 조용히 망가지므로
 * 여기서 반드시 걸러낸다.
 */
function normalize(input: unknown, originalText: string): RawFeedback {
  const raw = input as Record<string, unknown>
  const scores = (raw.scores ?? {}) as Record<string, unknown>

  const corrections = Array.isArray(raw.corrections) ? raw.corrections : []
  const upgrades = Array.isArray(raw.upgrades) ? raw.upgrades : []

  return {
    correctedText: str(raw.correctedText) || originalText,
    overallComment: str(raw.overallComment),
    praise: Array.isArray(raw.praise) ? raw.praise.map(str).filter(Boolean) : [],
    level: str(raw.level) || "B1",
    scores: {
      grammar: clampScore(scores.grammar),
      vocabulary: clampScore(scores.vocabulary),
      fluency: clampScore(scores.fluency),
    },
    corrections: corrections
      .map((c) => {
        const item = c as Record<string, unknown>
        const original = str(item.original)
        const corrected = str(item.corrected)
        if (!original || !corrected) return null
        return {
          original,
          corrected,
          category: CATEGORY_SLUGS.includes(str(item.category))
            ? str(item.category)
            : "word-choice",
          severity: (SEVERITIES as readonly string[]).includes(str(item.severity))
            ? (str(item.severity) as Severity)
            : "moderate",
          explanation: str(item.explanation),
          ...(str(item.tip) ? { tip: str(item.tip) } : {}),
        }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null),
    upgrades: upgrades
      .map((u) => {
        const item = u as Record<string, unknown>
        return {
          original: str(item.original),
          better: str(item.better),
          note: str(item.note),
        }
      })
      .filter((u) => u.original && u.better),
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

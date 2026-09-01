"use client"

import { FEEDBACK_TOOL } from "./schema"
import { buildSystemPrompt, buildUserMessage } from "./prompt"
import type { Mistake, RawFeedback } from "../types"
import { CATEGORY_SLUGS, SEVERITIES, type Severity } from "../taxonomy"
import { demoFeedback, isDemo } from "../demo/store"
import { STORAGE_KEYS } from "../storageKeys"
import { notifyStoredValueChanged } from "../browserStore"

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

const KEY_STORAGE = STORAGE_KEYS.apiKey
const MODEL_STORAGE = STORAGE_KEYS.model
const REMEMBER_STORAGE = STORAGE_KEYS.rememberKey
const WORKSPACE_STORAGE = STORAGE_KEYS.workspaceId

// ── 키 보관 ───────────────────────────────────────────────────────
// 기본값은 sessionStorage(탭 닫으면 사라짐). 사용자가 "이 기기에서 기억"을
// 켜면 localStorage로 옮긴다. 본인 기기에서의 편의와 안전 사이 선택은
// 사용자가 하게 둔다.

/** 키가 들어 있는지만 알려준다 — 화면은 값 자체를 다시 보여줄 일이 없다. */
export function hasApiKey(): boolean {
  return getApiKey() !== null
}

/**
 * 첨삭을 하려면 키를 먼저 받아야 하는 상태인가.
 *
 * 데모 모드는 모델을 부르지 않으므로 키가 필요 없다. 화면 쪽에서
 * `!getApiKey()`만 보고 판단하면, 데모로 둘러보는 사람이 "첨삭 실행"을
 * 눌렀을 때 있지도 않은 키를 내놓으라는 화면을 만난다.
 */
export function needsApiKey(): boolean {
  return !isDemo() && !hasApiKey()
}

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
  notifyStoredValueChanged()
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(KEY_STORAGE)
  window.localStorage.removeItem(KEY_STORAGE)
  notifyStoredValueChanged()
}

/**
 * "이 기기에서 기억"을 켜고 끈다.
 * 예전에는 이 체크박스가 저장 버튼을 누를 때까지 아무 일도 하지 않아서,
 * 이미 키를 넣어둔 사람이 껐다 켜도 키는 원래 자리에 그대로 있었다.
 * 이제 켜는 즉시 키를 옮긴다.
 */
export function rememberKeyOnThisDevice(remember: boolean): void {
  if (typeof window === "undefined") return
  const key = getApiKey()
  if (key) {
    setApiKey(key, remember)
    return
  }
  window.localStorage.setItem(REMEMBER_STORAGE, remember ? "1" : "0")
  notifyStoredValueChanged()
}

export function isKeyRemembered(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(REMEMBER_STORAGE) === "1"
}

// ── 워크스페이스 ──────────────────────────────────────────────────
/*
 * 콘솔에서 발급하는 키에는 두 종류가 있다.
 *
 * 워크스페이스에 매인 키는 어디로 청구할지가 키 자체에 적혀 있어서 그냥
 * 쓰면 된다. 반면 사람 계정에 매인 키(identity-linked)는 여러 워크스페이스에
 * 걸쳐 있어서, 이번 요청이 어느 워크스페이스의 몫인지 헤더로 알려줘야 한다.
 * 안 보내면 400과 함께 "anthropic-workspace-id is required"가 돌아온다.
 *
 * 값은 비밀이 아니다 — 키가 없으면 아무것도 못 한다. 그래서 기기에 그냥 둔다.
 */

export function getWorkspaceId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(WORKSPACE_STORAGE)?.trim() || null
}

export function setWorkspaceId(id: string): void {
  if (typeof window === "undefined") return
  const value = id.trim()
  if (value) window.localStorage.setItem(WORKSPACE_STORAGE, value)
  else window.localStorage.removeItem(WORKSPACE_STORAGE)
  notifyStoredValueChanged()
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
  notifyStoredValueChanged()
}

// ── 호출 ──────────────────────────────────────────────────────────

export class FeedbackError extends Error {
  constructor(
    message: string,
    readonly kind:
      | "no_key"
      | "auth"
      | "workspace"
      | "billing"
      | "rate_limit"
      | "network"
      | "malformed"
      | "server",
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
  const workspaceId = getWorkspaceId()

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
        // 사람 계정에 매인 키만 이게 필요하다. 워크스페이스 키에 붙이면
        // 거절당할 수 있으므로 사용자가 넣어둔 경우에만 보낸다.
        ...(workspaceId ? { "anthropic-workspace-id": workspaceId } : {}),
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
    // 크레딧이 없다. 코드로 고칠 수 없는 것이므로 어디로 가야 하는지만
    // 정확히 말해준다. 구독료와 API 크레딧은 지갑이 다르다.
    if (body.includes("credit balance")) {
      throw new FeedbackError(
        "이 계정의 API 크레딧이 부족해요. 콘솔에서 충전하면 바로 됩니다. (Claude 구독료와 API 크레딧은 별개예요.)",
        "billing",
      )
    }
    // 키는 멀쩡한데 워크스페이스를 안 정한 경우. 400 본문에만 적혀 오므로
    // 여기서 가려내지 않으면 "Anthropic API 오류 (400)"이라는, 무엇을 해야
    // 하는지 알 수 없는 말만 남는다.
    if (body.includes("anthropic-workspace-id")) {
      throw new FeedbackError(
        workspaceId
          ? `워크스페이스 ID(${workspaceId})를 이 키로는 쓸 수 없어요. 설정에서 다시 확인해주세요.`
          : "이 키는 계정에 매인 키라서 어느 워크스페이스로 쓸지 함께 알려줘야 해요. 설정 → Anthropic API 키에서 워크스페이스 ID를 넣어주세요.",
        "workspace",
      )
    }
    if (res.status === 401 || res.status === 403) {
      throw new FeedbackError("API 키가 올바르지 않거나 권한이 없어요.", "auth")
    }
    if (res.status === 429) {
      throw new FeedbackError("요청이 너무 잦아요. 잠시 후 다시 시도해주세요.", "rate_limit")
    }
    /*
     * 남은 것들. 예전에는 응답 본문을 통째로 붙여서 JSON 덩어리가 그대로
     * 화면에 나왔다. 안에 사람이 읽을 문장이 이미 들어 있으므로 그것만
     * 꺼내 쓴다. 모양이 다르면 그때만 원문 앞부분을 보여준다.
     */
    throw new FeedbackError(
      `Anthropic API 오류 (${res.status}). ${apiMessage(body) ?? body.slice(0, 200)}`,
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

/** 오류 본문에서 사람이 읽을 문장만 꺼낸다 */
function apiMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: unknown } }
    const message = parsed.error?.message
    return typeof message === "string" && message ? message : null
  } catch {
    return null
  }
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

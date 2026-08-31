"use client"

import { demoData } from "./data"
import type { Entry, Mistake, RawFeedback, SavedItem, UserProfile } from "../types"

/**
 * 데모 모드.
 *
 * ?demo=1 로 들어오면 Firebase도 API 키도 없이 앱 전체가 돈다.
 * 데이터는 메모리에만 있고 새로고침하면 처음 상태로 돌아간다 —
 * 남의 기기에 흔적을 남기지 않으려는 의도적인 선택이다.
 *
 * 나가려면 ?demo=0 이거나 세션을 닫으면 된다.
 */

const FLAG = "echodiary.demo"

export function isDemo(): boolean {
  if (typeof window === "undefined") return false
  const param = new URLSearchParams(window.location.search).get("demo")
  if (param === "1") {
    window.sessionStorage.setItem(FLAG, "1")
    return true
  }
  if (param === "0") {
    window.sessionStorage.removeItem(FLAG)
    return false
  }
  return window.sessionStorage.getItem(FLAG) === "1"
}

/** Date.now()만으로 id를 만들면 같은 밀리초에 두 번 저장할 때 겹친다. */
let seq = 0
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`

/** 데모 중 만들어진 변경은 이 세션 안에서만 유지된다. */
let state: {
  profile: UserProfile
  entries: Entry[]
  mistakes: Mistake[]
  saved: SavedItem[]
} | null = null

function store() {
  if (!state) {
    const seed = demoData()
    state = {
      profile: { ...seed.profile },
      entries: [...seed.entries],
      mistakes: [...seed.mistakes],
      saved: [...seed.saved],
    }
  }
  return state
}

export const demoStore = {
  profile: () => ({ ...store().profile }),
  entries: () => [...store().entries],
  mistakes: () => [...store().mistakes],
  saved: () => [...store().saved],

  setWeeklyGoal(goal: number) {
    store().profile.weeklyGoal = goal
  },

  setGame(patch: Partial<Pick<UserProfile, "level" | "exp" | "titles" | "quests">>) {
    Object.assign(store().profile, patch)
  },

  saveEntry(input: { id?: string; dateKey: string; text: string }): string {
    const s = store()
    const words = input.text.trim() ? input.text.trim().split(/\s+/).length : 0
    if (input.id) {
      const found = s.entries.find((e) => e.id === input.id)
      if (found) {
        found.text = input.text
        found.wordCount = words
        found.updatedAt = Date.now()
        return found.id
      }
    }
    const id = nextId("demo-new")
    s.entries.unshift({
      id,
      dateKey: input.dateKey,
      text: input.text,
      wordCount: words,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      feedback: null,
    })
    s.profile.totalEntries += 1
    s.profile.totalWords += words
    return id
  },

  getEntry: (id: string) => store().entries.find((e) => e.id === id) ?? null,

  deleteEntry(id: string) {
    const s = store()
    s.entries = s.entries.filter((e) => e.id !== id)
    s.mistakes = s.mistakes.filter((m) => m.entryId !== id)
  },

  saveFeedback(entryId: string, dateKey: string, raw: RawFeedback) {
    const s = store()
    const entry = s.entries.find((e) => e.id === entryId)
    if (!entry) return
    s.mistakes = s.mistakes.filter((m) => m.entryId !== entryId)
    const now = Date.now()
    raw.corrections.forEach((c, i) => {
      s.mistakes.unshift({
        id: `demo-m-${entryId}-${i}`,
        entryId,
        dateKey,
        category: c.category,
        severity: c.severity,
        original: c.original,
        corrected: c.corrected,
        explanation: c.explanation,
        ...(c.tip ? { tip: c.tip } : {}),
        createdAt: now,
        reviewCount: 0,
      })
    })
    entry.feedback = {
      correctedText: raw.correctedText,
      overallComment: raw.overallComment,
      praise: raw.praise,
      level: raw.level,
      scores: raw.scores,
      upgrades: raw.upgrades,
      correctionCount: raw.corrections.length,
      analyzedAt: now,
      model: "demo",
    }
  },

  markReviewed(id: string, correct: boolean) {
    const m = store().mistakes.find((x) => x.id === id)
    if (!m) return
    m.reviewCount += 1
    m.lastReviewedAt = Date.now()
    m.lastReviewCorrect = correct
  },

  addSaved(item: Omit<SavedItem, "id" | "createdAt">): string {
    const id = nextId("demo-saved")
    store().saved.unshift({ ...item, id, createdAt: Date.now() })
    return id
  },

  removeSaved(id: string) {
    const s = store()
    s.saved = s.saved.filter((x) => x.id !== id)
  },
}

/**
 * 데모에서 "첨삭 받기"를 눌렀을 때 돌려줄 결과.
 * 진짜 모델을 부르지 않으므로, 실제로 자주 나오는 오류 몇 가지를 규칙으로만
 * 잡아낸다. 데모 이상의 용도로 쓸 물건은 아니다.
 */
export function demoFeedback(text: string): RawFeedback {
  const corrections: RawFeedback["corrections"] = []

  const rules: {
    re: RegExp
    fix: (m: RegExpMatchArray) => string
    category: string
    severity: "minor" | "moderate" | "major"
    explanation: string
  }[] = [
    {
      re: /\buntil (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|tomorrow|summer|next week)\b/i,
      fix: (m) => `by ${m[1]}`,
      category: "preposition",
      severity: "major",
      explanation:
        "until은 '그때까지 계속'이고 by는 '그때까지 완료'입니다. 마감 시점에는 by를 씁니다.",
    },
    {
      re: /\ba ([aeiou]\w+)/,
      fix: (m) => `an ${m[1]}`,
      category: "article",
      severity: "minor",
      explanation: "모음 소리로 시작하는 단어 앞에는 a 대신 an을 씁니다.",
    },
    {
      re: /\bmany works\b/i,
      fix: () => "a lot of work",
      category: "plural",
      severity: "moderate",
      explanation: "work는 '일'이라는 뜻일 때 셀 수 없는 명사입니다.",
    },
    {
      re: /\bsaid me\b/i,
      fix: () => "told me",
      category: "word-choice",
      severity: "major",
      explanation: "say는 사람을 바로 목적어로 받지 못합니다. tell을 씁니다.",
    },
    {
      // "for improve my career"처럼 목적을 for + 동사원형으로 쓰는 흔한 실수
      re: /\bfor (improve|study|learn|get|make|buy|meet|practice|prepare)\b/i,
      fix: (m) => `to ${m[1]}`,
      category: "verb-form",
      severity: "major",
      explanation: "목적을 말할 때는 for가 아니라 to + 동사원형을 씁니다.",
    },
  ]

  for (const rule of rules) {
    const m = text.match(rule.re)
    if (!m) continue
    const corrected = rule.fix(m)
    if (corrected === m[0]) continue
    corrections.push({
      original: m[0],
      corrected,
      category: rule.category,
      severity: rule.severity,
      explanation: rule.explanation,
    })
  }

  let correctedText = text
  for (const c of corrections) {
    correctedText = correctedText.replace(c.original, c.corrected)
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return {
    correctedText,
    overallComment:
      corrections.length === 0
        ? "데모 모드에서는 간단한 규칙 몇 개만 검사합니다. 잡힌 문제가 없네요 — 실제 첨삭은 설정에서 API 키를 넣으면 Claude가 문장 전체를 훨씬 꼼꼼하게 봐줍니다."
        : "데모 모드라 규칙 기반으로만 몇 가지를 잡았어요. 실제 첨삭은 설정에서 API 키를 넣으면 Claude가 문맥까지 보고 훨씬 자세히 짚어줍니다.",
    praise: ["끝까지 쓴 것만으로도 오늘 몫은 했어요."],
    level: words > 60 ? "B1" : "A2",
    scores: {
      grammar: Math.max(40, 92 - corrections.length * 8),
      vocabulary: 74,
      fluency: 78,
    },
    corrections,
    upgrades: [],
  }
}

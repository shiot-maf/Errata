import type { Quest } from "./game"
import type { Severity } from "./taxonomy"

/** AI가 짚어낸 실수 하나. Firestore에는 이 형태로 평평하게 저장된다. */
export interface Mistake {
  id: string
  entryId: string
  /** "YYYY-MM-DD" — 일기가 다룬 날짜 */
  dateKey: string
  /** taxonomy.ts의 slug */
  category: string
  severity: Severity
  /** 사용자가 실제로 쓴 표현 */
  original: string
  /** 고친 표현 */
  corrected: string
  /** 한국어 설명 */
  explanation: string
  /** 다음에 안 틀리기 위한 한 줄 팁 (선택) */
  tip?: string
  createdAt: number
  /** 복습 화면에서 몇 번 다시 봤는지 */
  reviewCount: number
  lastReviewedAt?: number
  /** 마지막 복습에서 맞혔는지 */
  lastReviewCorrect?: boolean

  /**
   * 망각곡선 상자 (0~6). 맞힐 때마다 한 칸 오르고 다음 만남이 멀어진다.
   * 마지막 칸이 졸업이다. 이 기능 전에 쌓인 문서에는 없으므로 선택 항목이다.
   */
  box?: number
  /** 다음 복습 시각. 없으면 지금 만기로 본다. */
  dueAt?: number
}

/** 첨삭 전에도 저장되는 일기 한 편 */
export interface Entry {
  id: string
  dateKey: string
  /** 사용자가 쓴 원문 */
  text: string
  wordCount: number
  createdAt: number
  updatedAt: number
  /** 첨삭 결과 — 아직 첨삭 전이면 null */
  feedback: Feedback | null
}

/** AI 첨삭 결과 (일기 문서 안에 통째로 들어간다) */
export interface Feedback {
  /** 전체를 자연스럽게 다시 쓴 버전 */
  correctedText: string
  /** 한국어 총평 */
  overallComment: string
  /** 잘한 점 */
  praise: string[]
  /** 추정 CEFR 레벨 */
  level: string
  scores: {
    grammar: number
    vocabulary: number
    fluency: number
  }
  /** 더 나은 표현 제안 (실수는 아니지만 업그레이드 가능한 것) */
  upgrades: Upgrade[]
  correctionCount: number
  analyzedAt: number
  model: string
}

export interface Upgrade {
  original: string
  better: string
  note: string
}

/** 첨삭 API가 돌려주는 원본 형태 (아직 Firestore용으로 나뉘기 전) */
export interface RawFeedback {
  correctedText: string
  overallComment: string
  praise: string[]
  level: string
  scores: { grammar: number; vocabulary: number; fluency: number }
  corrections: RawCorrection[]
  upgrades: Upgrade[]
}

export interface RawCorrection {
  original: string
  corrected: string
  category: string
  severity: Severity
  explanation: string
  tip?: string
}

export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt: number
  /** 연속 작성 일수 */
  streak: number
  longestStreak: number
  lastEntryDate: string | null
  totalEntries: number
  totalWords: number
  /** 한 주에 목표로 하는 일기 편수 */
  weeklyGoal: number

  // ── 게이미피케이션 (WriterQuest의 체계를 가져옴) ──
  level: number
  exp: number
  /** 마일스톤 레벨에서 얻은 칭호 */
  titles: string[]
  quests: Quest[]
}

/** 저장함에 담아둔 표현 */
export interface SavedItem {
  id: string
  /**
   * correction — 교정 카드에서 담은 것 (내가 쓴 표현 ↔ 고친 표현)
   * phrase     — "더 자연스럽게" 제안에서 담은 것
   * selection  — 교정된 일기를 읽다가 드래그해서 담은 것 (정답 짝이 없다)
   */
  kind: "correction" | "phrase" | "selection"
  /** 원본 mistake의 id 또는 upgrade 인덱스 — 같은 걸 두 번 담지 않으려고 쓴다 */
  sourceId: string
  entryId: string
  dateKey: string
  /** 내가 쓴 표현. selection이면 긁어서 담은 표현 그 자체 */
  front: string
  /** 고친 / 더 나은 표현. selection은 짝이 없어서 빈 문자열이다 */
  back: string
  note: string
  category?: string
  createdAt: number
}

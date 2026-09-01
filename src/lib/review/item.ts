import type { Mistake, SavedItem } from "../types"
import { EXPRESSION_CATEGORY, type Severity } from "../taxonomy"

/**
 * 복습이 다루는 한 장.
 *
 * 예전에는 덱이 곧 Mistake 목록이었다. 그런데 복습할 만한 것이 실수만은
 * 아니다 — 첨삭이 "이렇게 쓰면 더 자연스러워요"라고 알려준 표현을 저장함에
 * 담아두면, 그건 틀린 적이 없어서 mistakes에 들어가지 않고 따라서 여태 한
 * 번도 복습되지 않았다. 담아두기만 하고 다시 안 보는 것이다.
 *
 * 그래서 덱을 "물어볼 수 있는 것"이라는 한 겹 위의 개념으로 올린다.
 * 어디서 왔는지는 source가 들고 있고, 일정과 채점은 둘을 구별하지 않는다.
 */
export interface ReviewItem {
  id: string
  source: "mistake" | "saved"
  /** 택소노미 slug. 담아둔 표현처럼 분류가 없는 것은 EXPRESSION_SLUG */
  category: string
  /** 물어볼 쪽 — 내가 쓴 표현 */
  front: string
  /** 정답 쪽 — 고친 표현이나 더 나은 표현 */
  back: string
  explanation: string
  tip?: string
  dateKey: string
  severity: Severity
  box: number
  dueAt: number
  reviewCount: number
  lastReviewCorrect?: boolean
  /** 저장함에 따로 담아둔 것 — 본인이 중요하다고 표시한 셈이다 */
  starred: boolean
}

/** 택소노미에 없는 자리. 담아둔 표현들이 여기로 모인다. */
export const EXPRESSION_SLUG = EXPRESSION_CATEGORY.slug

function fromMistake(mistake: Mistake, starred: boolean): ReviewItem {
  return {
    id: mistake.id,
    source: "mistake",
    category: mistake.category,
    front: mistake.original,
    back: mistake.corrected,
    explanation: mistake.explanation,
    tip: mistake.tip,
    dateKey: mistake.dateKey,
    severity: mistake.severity,
    box: mistake.box ?? 0,
    dueAt: mistake.dueAt ?? 0,
    reviewCount: mistake.reviewCount ?? 0,
    lastReviewCorrect: mistake.lastReviewCorrect,
    starred,
  }
}

function fromSaved(saved: SavedItem): ReviewItem {
  return {
    id: saved.id,
    source: "saved",
    category: saved.category ?? EXPRESSION_SLUG,
    front: saved.front,
    back: saved.back,
    explanation: saved.note,
    dateKey: saved.dateKey,
    // 담아둔 표현은 틀린 게 아니라 더 나아질 수 있는 것이다. 심각도로 치면
    // 가장 낮은 자리에 두고, 실수보다 뒤에 물어본다.
    severity: "minor",
    box: saved.box ?? 0,
    dueAt: saved.dueAt ?? 0,
    reviewCount: saved.reviewCount ?? 0,
    lastReviewCorrect: saved.lastReviewCorrect,
    starred: true,
  }
}

/**
 * 실수와 저장함을 합쳐 복습 대상을 만든다.
 *
 * 저장함의 세 종류를 다르게 다룬다.
 * - phrase(더 자연스럽게)  → 넣는다. 실수가 아니라서 여태 복습된 적이 없다.
 * - correction(교정 북마크) → 같은 실수가 이미 덱에 있으므로 다시 넣지 않고,
 *   대신 그 실수에 별표를 달아 순서를 앞당긴다. 다만 일기를 지워서 원본
 *   실수가 사라졌으면 저장함 쪽이 유일한 사본이므로 그때는 넣는다.
 * - selection(드래그 발췌) → back이 비어 있어 물어볼 정답이 없다. 뺀다.
 */
export function collectReviewItems(
  mistakes: Mistake[],
  saved: SavedItem[],
): ReviewItem[] {
  const starredMistakeIds = new Set(
    saved.filter((s) => s.kind === "correction").map((s) => s.sourceId),
  )
  const mistakeIds = new Set(mistakes.map((m) => m.id))

  const fromMistakes = mistakes.map((m) => fromMistake(m, starredMistakeIds.has(m.id)))

  const fromSavedItems = saved
    .filter((s) => s.back.trim().length > 0)
    .filter((s) => s.kind !== "correction" || !mistakeIds.has(s.sourceId))
    .map(fromSaved)

  return [...fromMistakes, ...fromSavedItems]
}

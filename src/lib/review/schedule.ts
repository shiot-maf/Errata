import { SEVERITY_WEIGHT } from "../taxonomy"
import { answersMatch, diffWords } from "../analysis/diff"
import { EXPRESSION_SLUG, type ReviewItem } from "./item"

/**
 * 복습 주기 — 망각곡선.
 *
 * 에빙하우스가 보여준 건 "한 번 본 것은 하루 만에 대부분 새어 나가고, 새기
 * 전에 다시 보면 다음번엔 더 오래 붙어 있는다"는 것이다. 그래서 간격을
 * 고정해두지 않고, 맞힐 때마다 다음 만남을 점점 뒤로 미룬다.
 *
 * 안키가 쓰는 SM-2나 요즘의 FSRS를 그대로 옮길 수도 있지만 여기서는 상자
 * 방식(Leitner)을 쓴다. 이유는 두 가지다.
 *
 * 1. 설명할 수 있다. "3번 맞히면 일주일 뒤에 다시 나옵니다"는 화면에 적을 수
 *    있지만, "안이도 2.5, 간격 계수 1.3"은 적을 수가 없다.
 * 2. 규모가 다르다. SM-2의 파라미터 학습은 하루 수백 장을 도는 사람을 위한
 *    것이다. 하루 한 편 일기에서 나오는 실수 몇 개로는 그 정교함이 드러날
 *    자리가 없다.
 */

/** 상자별 다음 만남까지의 날수. 마지막 칸이 졸업이다. */
const INTERVALS = [0, 1, 3, 7, 16, 35, 90] as const

/** 이 상자에 오르면 졸업 — 사실상 목록에서 사라진다. */
export const GRADUATED_BOX = INTERVALS.length - 1

/** 졸업한 것을 또 맞히면 이만큼 더 미룬다. */
const BEYOND_GRADUATION_DAYS = 180

const DAY = 86_400_000

export type Grade = "correct" | "close" | "wrong"

/** 상자에 따라 묻는 방식이 달라진다 — 알아보기에서 떠올리기로. */
export type QuestionKind = "choice" | "hinted" | "recall"

export function questionKind(box: number): QuestionKind {
  if (box <= 1) return "choice"
  if (box <= 3) return "hinted"
  return "recall"
}

export function boxOf(item: ReviewItem): number {
  return Math.min(GRADUATED_BOX, Math.max(0, item.box ?? 0))
}

export function isGraduated(item: ReviewItem): boolean {
  return boxOf(item) >= GRADUATED_BOX
}

/** 아직 한 번도 안 물어본 것 */
export function isNew(item: ReviewItem): boolean {
  return (item.reviewCount ?? 0) === 0
}

export function isDue(item: ReviewItem, now = Date.now()): boolean {
  if (isGraduated(item)) return false
  // dueAt이 없는 건 이 기능이 생기기 전에 쌓인 것들이다. 지금 만기로 본다.
  return (item.dueAt ?? 0) <= now
}

/**
 * 채점.
 *
 * 대소문자와 구두점은 원래 봐주고 있었다. 여기에 "거의 맞음"을 하나 더 둔다 —
 * 한 단어 차이로 틀린 것과 아예 다른 문장을 쓴 것을 같이 취급하면, 다 왔던
 * 사람을 맨 처음으로 돌려보내게 된다.
 */
export function gradeAnswer(answer: string, corrected: string): Grade {
  if (answersMatch(answer, corrected)) return "correct"
  if (!answer.trim()) return "wrong"

  const off = diffWords(answer, corrected)
    .filter((t) => t.op !== "same")
    .reduce((sum, t) => sum + (t.text.trim().split(/\s+/).filter(Boolean).length || 0), 0)

  return off <= 1 ? "close" : "wrong"
}

export interface Scheduled {
  box: number
  dueAt: number
}

/**
 * 채점 결과로 다음 상자와 만기를 정한다.
 *
 * 맞히면 한 칸 위로, 거의 맞으면 제자리에서 한 번 더, 틀리면 처음으로.
 * 졸업한 것을 틀렸을 때만 예외를 둔다 — 한 번 몸에 붙었던 것이라 맨 밑까지
 * 떨어뜨릴 이유가 없다.
 */
export function nextSchedule(current: number, grade: Grade, now = Date.now()): Scheduled {
  const box = Math.min(GRADUATED_BOX, Math.max(0, current))

  if (grade === "wrong") {
    const next = box >= GRADUATED_BOX ? 2 : 0
    return { box: next, dueAt: now + INTERVALS[next] * DAY }
  }

  if (grade === "close") {
    return { box, dueAt: now + Math.max(1, INTERVALS[box]) * DAY }
  }

  if (box >= GRADUATED_BOX) {
    return { box, dueAt: now + BEYOND_GRADUATION_DAYS * DAY }
  }

  const next = box + 1
  return { box: next, dueAt: now + INTERVALS[next] * DAY }
}

/** 다음 복습까지 며칠인지 — 세션 끝에 보여준다. */
export function daysUntil(dueAt: number, now = Date.now()): number {
  return Math.max(0, Math.round((dueAt - now) / DAY))
}

// ── 오늘의 덱 ──────────────────────────────────────────────────────

export interface ReviewBlock {
  /** 택소노미 slug, 또는 담아둔 표현 자리 */
  category: string
  items: ReviewItem[]
}

export interface Deck {
  blocks: ReviewBlock[]
  /** 덱에 담긴 문제 수 */
  size: number
  /** 상한에 걸려 오늘 못 담은 밀린 문제 수 */
  waiting: number
}

/** 하루에 이 이상 물어보면, 오래 쉬었다 온 사람은 다시 안 온다. */
export const DAILY_LIMIT = 20
/** 한 개념을 연달아 이만큼까지만 — 그 이상은 지겹다. */
const PER_CATEGORY = 5
/**
 * 담아둔 표현에 떼어주는 자리.
 *
 * 표현은 틀린 적이 없어서 심각도가 가장 낮고, 그래서 순서를 심각도로만 매기면
 * 밀린 실수가 몇 개만 있어도 영영 차례가 오지 않는다. 담아두기만 하고 다시 안
 * 보는 목록이 되지 않도록 하루 몫의 일부를 미리 떼어둔다.
 */
const RESERVED_FOR_EXPRESSIONS = 3

/**
 * 오늘 볼 것을 고른다.
 *
 * 낱개로 섞어서 내지 않고 카테고리로 묶는 게 이 앱의 복습이다. 같은 규칙에서
 * 나온 내 문장 서너 개를 연달아 보면 규칙이 보이지만, 전치사 하나 관사 하나
 * 시제 하나를 번갈아 보면 그냥 낱장 카드가 된다.
 */
export function buildDeck(
  items: ReviewItem[],
  options: { now?: number; limit?: number; includeUpcoming?: boolean } = {},
): Deck {
  const now = options.now ?? Date.now()
  const limit = options.limit ?? DAILY_LIMIT

  // 밀린 게 없는 날에도 "그냥 좀 더 보고 싶다"는 사람이 있다. 그때는 만기를
  // 무시하고 아직 졸업하지 않은 것들로 덱을 만든다. 일정은 그대로 갱신된다.
  const due = options.includeUpcoming
    ? items.filter((m) => !isGraduated(m))
    : items.filter((m) => isDue(m, now))

  // 담아둔 표현은 따로 떼어 마지막에 붙인다. 실수를 다 본 뒤에 보는 게
  // 순서로도 맞다 — 안 틀리려고 외우는 것이 먼저고, 쓰려고 외우는 것이 다음이다.
  const expressions = due.filter((m) => m.category === EXPRESSION_SLUG)
  const rest = due.filter((m) => m.category !== EXPRESSION_SLUG)
  const expressionTake = Math.min(RESERVED_FOR_EXPRESSIONS, expressions.length, limit)

  // 카테고리별로 모아서, 급한 것부터. 급하다 = 밀린 게 많고 심각하다.
  const byCategory = new Map<string, ReviewItem[]>()
  for (const m of rest) {
    byCategory.set(m.category, [...(byCategory.get(m.category) ?? []), m])
  }

  const ranked = [...byCategory.entries()]
    .map(([category, list]) => ({
      category,
      list: [...list].sort(itemPriority(now)),
      weight: list.reduce((sum, m) => sum + (SEVERITY_WEIGHT[m.severity] ?? 1), 0),
    }))
    .sort((a, b) => b.weight - a.weight || b.list.length - a.list.length)

  const blocks: ReviewBlock[] = []
  let size = 0
  const roomForMistakes = limit - expressionTake

  for (const { category, list } of ranked) {
    if (size >= roomForMistakes) break
    const take = list.slice(0, Math.min(PER_CATEGORY, roomForMistakes - size))
    blocks.push({ category, items: take })
    size += take.length
  }

  if (expressionTake > 0) {
    blocks.push({
      category: EXPRESSION_SLUG,
      items: [...expressions].sort(itemPriority(now)).slice(0, expressionTake),
    })
    size += expressionTake
  }

  return { blocks, size, waiting: Math.max(0, due.length - size) }
}

/**
 * 같은 카테고리 안에서의 순서.
 * 오래 밀린 것, 심각한 것, 아직 한 번도 안 본 것을 앞으로.
 */
function itemPriority(now: number) {
  return (a: ReviewItem, b: ReviewItem) => score(b) - score(a)

  function score(m: ReviewItem): number {
    const overdueDays = Math.max(0, (now - (m.dueAt ?? 0)) / DAY)
    return (
      Math.min(30, overdueDays) +
      (SEVERITY_WEIGHT[m.severity] ?? 1) * 2 +
      (isNew(m) ? 3 : 0) +
      (m.lastReviewCorrect === false ? 3 : 0) +
      // 저장함에 따로 담아뒀다는 건 본인이 중요하다고 표시한 것이다
      (m.starred ? 2 : 0)
    )
  }
}

/** 오늘 밀린 개수 — 하단 탭 배지와 쓰기 화면의 안내에 쓴다. */
export function dueCount(items: ReviewItem[], now = Date.now()): number {
  return items.reduce((n, m) => n + (isDue(m, now) ? 1 : 0), 0)
}

// ── 개념별 진행 ────────────────────────────────────────────────────

export interface CategoryProgress {
  category: string
  total: number
  graduated: number
  due: number
  /** 0~1. 졸업한 비율 */
  mastery: number
}

export function categoryProgress(
  items: ReviewItem[],
  now = Date.now(),
): CategoryProgress[] {
  const map = new Map<string, CategoryProgress>()

  for (const m of items) {
    const p =
      map.get(m.category) ??
      { category: m.category, total: 0, graduated: 0, due: 0, mastery: 0 }
    p.total++
    if (isGraduated(m)) p.graduated++
    if (isDue(m, now)) p.due++
    map.set(m.category, p)
  }

  for (const p of map.values()) p.mastery = p.total ? p.graduated / p.total : 0

  return [...map.values()].sort((a, b) => b.total - a.total)
}

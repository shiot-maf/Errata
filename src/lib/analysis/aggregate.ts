import type { Entry, Mistake } from "../types"
import {
  CATEGORY_GROUPS,
  SEVERITY_WEIGHT,
  getCategory,
  type CategoryGroup,
} from "../taxonomy"
import { daysBetween, recentDateKeys, toDateKey } from "../dates"

/*
 * "내가 어디서 많이 틀리는지"를 실제 숫자로 만드는 곳.
 * 전부 클라이언트에서 계산한다 — 개인 일기 규모(수천 건)에서는 충분히 빠르고,
 * Firestore 집계 인덱스를 따로 관리하지 않아도 된다.
 */

export interface CategoryStat {
  slug: string
  ko: string
  group: CategoryGroup
  count: number
  /** 심각도 가중 합 — 취약도 랭킹에 쓴다 */
  weight: number
  /** 전체 실수 중 비중 (0-1) */
  share: number
  /**
   * 최근 30일 vs 그 이전 30일의 **100단어당 실수 비율** 변화 (음수 = 개선).
   * 두 구간의 글 양이 크게 다르면 개수 비교는 거짓말이 되므로 비율로 잰다.
   * 비교할 만큼 쓰지 않은 구간이 있으면 0으로 둔다(= 추이를 말하지 않는다).
   */
  trend: number
  lastSeen: string | null
}

export interface GroupStat {
  group: CategoryGroup
  ko: string
  color: string
  count: number
  share: number
}

export interface RepeatedMistake {
  key: string
  original: string
  corrected: string
  category: string
  count: number
  lastSeen: string
  explanation: string
}

export interface Overview {
  totalMistakes: number
  totalEntries: number
  totalWords: number
  /** 100단어당 실수 개수 — 글이 길어져도 비교 가능한 지표 */
  errorRate: number
  /** 최근 5편 vs 그 이전 5편의 100단어당 실수 변화 */
  errorRateTrend: number | null
  categories: CategoryStat[]
  groups: GroupStat[]
  repeated: RepeatedMistake[]
  /** 최근 N일 히트맵용: dateKey → 그날 쓴 단어 수 */
  activity: { dateKey: string; words: number; entries: number; mistakes: number }[]
}

export function buildOverview(entries: Entry[], mistakes: Mistake[], days = 120): Overview {
  const totalWords = entries.reduce((s, e) => s + e.wordCount, 0)
  const analyzed = entries.filter((e) => e.feedback)
  const analyzedWords = analyzed.reduce((s, e) => s + e.wordCount, 0)

  return {
    totalMistakes: mistakes.length,
    totalEntries: entries.length,
    totalWords,
    errorRate: analyzedWords > 0 ? (mistakes.length / analyzedWords) * 100 : 0,
    errorRateTrend: computeErrorRateTrend(analyzed),
    categories: computeCategoryStats(mistakes, entries),
    groups: computeGroupStats(mistakes),
    repeated: computeRepeated(mistakes),
    activity: computeActivity(entries, mistakes, days),
  }
}

/** 비교가 의미를 가지려면 각 구간에 이만큼은 써야 한다 */
const TREND_MIN_WORDS = 100

function computeCategoryStats(mistakes: Mistake[], entries: Entry[]): CategoryStat[] {
  const today = toDateKey()

  // 최근 30일에 10편, 이전 30일에 1편을 썼다면 실수 "개수"는 당연히 늘어난다.
  // 그건 실력이 나빠진 게 아니라 글을 더 썼다는 뜻이다. 그래서 각 구간의
  // 단어 수로 나눠 100단어당 비율로 비교하고, 한쪽이 너무 적으면 아예 말을 아낀다.
  const analyzed = entries.filter((e) => e.feedback)
  const wordsBetween = (from: number, to: number) =>
    analyzed
      .filter((e) => {
        const age = daysBetween(e.dateKey, today)
        return age >= from && age <= to
      })
      .reduce((sum, e) => sum + e.wordCount, 0)

  const recentWords = wordsBetween(0, 30)
  const priorWords = wordsBetween(31, 60)
  const comparable = recentWords >= TREND_MIN_WORDS && priorWords >= TREND_MIN_WORDS
  const map = new Map<
    string,
    { count: number; weight: number; recent: number; prior: number; lastSeen: string | null }
  >()

  for (const m of mistakes) {
    const e = map.get(m.category) ?? {
      count: 0,
      weight: 0,
      recent: 0,
      prior: 0,
      lastSeen: null,
    }
    e.count++
    e.weight += SEVERITY_WEIGHT[m.severity] ?? 1
    const age = daysBetween(m.dateKey, today)
    if (age <= 30) e.recent++
    else if (age <= 60) e.prior++
    if (!e.lastSeen || m.dateKey > e.lastSeen) e.lastSeen = m.dateKey
    map.set(m.category, e)
  }

  const total = mistakes.length || 1
  return [...map.entries()]
    .map(([slug, e]) => {
      const cat = getCategory(slug)
      return {
        slug,
        ko: cat.ko,
        group: cat.group,
        count: e.count,
        weight: e.weight,
        share: e.count / total,
        trend: comparable
          ? round1((e.recent / recentWords - e.prior / priorWords) * 100)
          : 0,
        lastSeen: e.lastSeen,
      }
    })
    .sort((a, b) => b.weight - a.weight || b.count - a.count)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function computeGroupStats(mistakes: Mistake[]): GroupStat[] {
  const counts = new Map<CategoryGroup, number>()
  for (const m of mistakes) {
    const g = getCategory(m.category).group
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  const total = mistakes.length || 1
  return (Object.keys(CATEGORY_GROUPS) as CategoryGroup[])
    .map((group) => ({
      group,
      ko: CATEGORY_GROUPS[group].ko,
      color: CATEGORY_GROUPS[group].color,
      count: counts.get(group) ?? 0,
      share: (counts.get(group) ?? 0) / total,
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * 같은 실수를 반복하는지 찾는다. 표현이 완전히 같지 않아도 잡히도록
 * 소문자 + 구두점 제거로 정규화해서 묶는다.
 */
function computeRepeated(mistakes: Mistake[]): RepeatedMistake[] {
  const map = new Map<string, RepeatedMistake>()
  for (const m of mistakes) {
    const key = `${m.category}::${normalize(m.original)}`
    const existing = map.get(key)
    if (existing) {
      existing.count++
      if (m.dateKey > existing.lastSeen) existing.lastSeen = m.dateKey
    } else {
      map.set(key, {
        key,
        original: m.original,
        corrected: m.corrected,
        category: m.category,
        count: 1,
        lastSeen: m.dateKey,
        explanation: m.explanation,
      })
    }
  }
  return [...map.values()]
    .filter((r) => r.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * 최근 5편과 그 이전 5편의 100단어당 실수 수를 비교한다.
 * 이전 구간이 2편은 돼야 비교가 의미를 갖는다 = 첨삭받은 일기 7편부터.
 */
export const ERROR_RATE_TREND_MIN_ENTRIES = 7

function computeErrorRateTrend(analyzed: Entry[]): number | null {
  if (analyzed.length < ERROR_RATE_TREND_MIN_ENTRIES) return null
  const sorted = [...analyzed].sort((a, b) => b.createdAt - a.createdAt)
  const recent = sorted.slice(0, 5)
  const prior = sorted.slice(5, 10)

  const rate = (list: Entry[]) => {
    const words = list.reduce((s, e) => s + e.wordCount, 0)
    const errs = list.reduce((s, e) => s + (e.feedback?.correctionCount ?? 0), 0)
    return words > 0 ? (errs / words) * 100 : 0
  }
  return rate(recent) - rate(prior)
}

function computeActivity(entries: Entry[], mistakes: Mistake[], days: number) {
  const words = new Map<string, number>()
  const counts = new Map<string, number>()
  for (const e of entries) {
    words.set(e.dateKey, (words.get(e.dateKey) ?? 0) + e.wordCount)
    counts.set(e.dateKey, (counts.get(e.dateKey) ?? 0) + 1)
  }
  const errs = new Map<string, number>()
  for (const m of mistakes) errs.set(m.dateKey, (errs.get(m.dateKey) ?? 0) + 1)

  return recentDateKeys(days).map((dateKey) => ({
    dateKey,
    words: words.get(dateKey) ?? 0,
    entries: counts.get(dateKey) ?? 0,
    mistakes: errs.get(dateKey) ?? 0,
  }))
}

/**
 * 복습 우선순위. 자주 틀리고, 심각하고, 최근이고, 아직 덜 복습한 것부터.
 */
export function prioritizeForReview(mistakes: Mistake[], take = 20): Mistake[] {
  const today = toDateKey()
  const freq = new Map<string, number>()
  for (const m of mistakes) {
    const k = `${m.category}::${normalize(m.original)}`
    freq.set(k, (freq.get(k) ?? 0) + 1)
  }

  return [...mistakes]
    .map((m) => {
      const repeats = freq.get(`${m.category}::${normalize(m.original)}`) ?? 1
      const ageDays = Math.max(0, daysBetween(m.dateKey, today))
      const recency = Math.max(0, 1 - ageDays / 90)
      const score =
        repeats * 2 +
        (SEVERITY_WEIGHT[m.severity] ?? 1) +
        recency * 2 -
        m.reviewCount * 1.5 +
        (m.lastReviewCorrect === false ? 2 : 0)
      return { m, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((x) => x.m)
}

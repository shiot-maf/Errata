import type { Mistake } from "../types"
import { daysBetween, toDateKey } from "../dates"
import { GRADUATED_BOX } from "./schedule"

/**
 * 개념 카드의 아래쪽 절반 — "너는 이 안에서도 특히 여기서 넘어진다".
 *
 * 규칙 설명은 문법책에도 있다. 이 앱만 할 수 있는 말은 그 규칙 아래에서
 * 내가 실제로 무엇을 몇 번 틀렸는지다. 실수를 일기 문서 안에 묻어두지 않고
 * 평평한 컬렉션으로 쌓아둔 이유가 여기서 값을 한다.
 *
 * AI를 부르지 않는다. 집계만으로 나오는 문장이라 키가 없어도, 데모에서도
 * 그대로 뜬다.
 */

export interface CategoryInsight {
  /** 이 카테고리에서 틀린 총 횟수 */
  total: number
  /** 최근 30일 */
  recent: number
  /** 두 번 이상 되풀이한 표현 — 가장 잦은 것부터 */
  repeated: { original: string; corrected: string; count: number }[]
  /** 마지막으로 틀린 날 */
  lastSeen: string | null
  /** 위 숫자를 사람 말로 옮긴 한 문단 */
  sentence: string
}

export function categoryInsight(
  mistakes: Mistake[],
  category: string,
  today = toDateKey(),
): CategoryInsight {
  const mine = mistakes.filter((m) => m.category === category)

  const recent = mine.filter((m) => daysBetween(m.dateKey, today) <= 30).length

  const groups = new Map<string, { original: string; corrected: string; count: number }>()
  for (const m of mine) {
    const key = normalize(m.original)
    const found = groups.get(key)
    if (found) found.count++
    else groups.set(key, { original: m.original, corrected: m.corrected, count: 1 })
  }

  const repeated = [...groups.values()]
    .filter((r) => r.count >= 2)
    .sort((a, b) => b.count - a.count)

  const lastSeen = mine.reduce<string | null>(
    (latest, m) => (!latest || m.dateKey > latest ? m.dateKey : latest),
    null,
  )

  return {
    total: mine.length,
    recent,
    repeated,
    lastSeen,
    sentence: describe(mine.length, recent, repeated, lastSeen, today),
  }
}

function describe(
  total: number,
  recent: number,
  repeated: CategoryInsight["repeated"],
  lastSeen: string | null,
  today: string,
): string {
  if (total === 0) return ""

  const parts: string[] = [`여기서 지금까지 ${total}번 넘어졌어요`]

  if (recent > 0 && recent < total) {
    parts.push(`그중 ${recent}번이 최근 30일 안에 있어요`)
  } else if (recent === total && total > 1) {
    parts.push("전부 최근 30일 안에 나온 것들이에요")
  }

  const top = repeated[0]
  if (top) {
    parts.push(`특히 “${top.original}”은(는) ${top.count}번 되풀이했어요`)
  }

  if (lastSeen) {
    const gap = daysBetween(lastSeen, today)
    if (gap === 0) parts.push("가장 최근은 오늘이에요")
    else if (gap <= 7) parts.push(`가장 최근은 ${gap}일 전이에요`)
    else if (gap >= 30) parts.push(`${gap}일째 이 실수는 나오지 않고 있어요`)
  }

  return parts.join(". ") + "."
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * 개념을 뗐다고 볼 수 있는 카테고리들.
 *
 * 조건을 둘 다 요구한다 — 여러 개를 실제로 졸업시켰고(운으로 한두 개 맞힌
 * 게 아니고), 최근 한 달 동안 같은 실수가 새로 나오지 않았을 것. 뒤엣것이
 * 없으면 복습만 열심히 하고 글에서는 계속 틀리는 사람도 칭호를 받는다.
 */
export function masteredCategories(
  mistakes: Mistake[],
  today = toDateKey(),
): string[] {
  const byCategory = new Map<string, Mistake[]>()
  for (const m of mistakes) {
    byCategory.set(m.category, [...(byCategory.get(m.category) ?? []), m])
  }

  const out: string[] = []
  for (const [category, mine] of byCategory) {
    if (mine.length < MASTERY_MIN) continue
    const graduated = mine.filter((m) => (m.box ?? 0) >= GRADUATED_BOX).length
    if (graduated < MASTERY_MIN) continue
    const recentSlip = mine.some((m) => daysBetween(m.dateKey, today) <= 30)
    if (recentSlip) continue
    out.push(category)
  }
  return out
}

/** 이 개념에서 이만큼은 졸업시켜야 뗐다고 본다 */
const MASTERY_MIN = 5

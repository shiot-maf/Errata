/** 날짜 유틸. 모든 dateKey는 사용자의 로컬 시간대 기준 "YYYY-MM-DD"다. */

export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

/** 두 dateKey 사이의 일수 차이 (a가 더 과거면 양수) */
export function daysBetween(a: string, b: string): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

export function formatKo(key: string): string {
  const d = fromDateKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

export function formatKoFull(key: string): string {
  const d = fromDateKey(key)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

/** 최근 n일의 dateKey 배열 (오래된 것부터) */
export function recentDateKeys(n: number, end: Date = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(toDateKey(addDays(end, -i)))
  return out
}

/**
 * 오늘 일기를 쓴 뒤의 새 스트릭을 계산한다.
 * 어제 썼으면 이어지고, 오늘 이미 썼으면 그대로, 그 외에는 1로 리셋.
 */
export function nextStreak(
  lastEntryDate: string | null,
  current: number,
  today: string,
): number {
  if (!lastEntryDate) return 1
  const gap = daysBetween(lastEntryDate, today)
  if (gap === 0) return Math.max(current, 1)
  if (gap === 1) return current + 1
  return 1
}

/** 이번 주(월요일 시작)의 dateKey 목록 */
export function currentWeekKeys(today: Date = new Date()): string[] {
  const dow = (today.getDay() + 6) % 7 // 월=0
  const monday = addDays(today, -dow)
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)))
}

import { toDateKey, currentWeekKeys } from "./dates"

/**
 * 게이미피케이션.
 *
 * WriterQuest(writerquest/src/store/gameStore.js)에서 정리해둔 체계를 그대로 가져왔다.
 * EXP 누적 차감식 레벨업, daily/weekly/once 3종 퀘스트, 자정·월요일 리셋,
 * 마일스톤 칭호, 그리고 store가 UI를 직접 참조하지 않는 CustomEvent 알림까지.
 *
 * 두 가지만 이 앱에 맞게 바꿨다.
 *
 * 1. 에너지 시스템은 뺐다. 6초당 1씩 닳고 30분 쿨다운으로 회복하는 구조는
 *    장시간 집필 세션을 전제로 한 것이라, 하루 한 편 짧게 쓰는 일기에는 맞지 않는다.
 * 2. 레벨 문턱을 level * 1000에서 level * 300으로 낮췄다. 원본은 하루 1,000자를
 *    기준으로 잡은 값인데, 영어일기는 하루 50~100단어라 그대로 두면 한 달을 써도
 *    2레벨을 못 넘는다. 공식 모양은 그대로 두고 상수만 이 앱의 규모에 맞췄다.
 */

export const LEVEL_STEP = 300

/** 각 행동이 주는 EXP */
export const EXP = {
  /** 일기를 저장할 때 기본 */
  entry: 20,
  /** 10단어마다 추가 (길게 쓸수록 이득이지만 상한이 있다) */
  perTenWords: 4,
  /** 단어 보너스 상한 — 한 편에 몰아쓰기로 레벨을 밀어올리지 못하게 */
  maxWordBonus: 80,
  /** 첨삭을 끝까지 받았을 때 */
  corrected: 50,
  /** 교정할 게 하나도 없었을 때 */
  flawless: 100,
  /** 복습 문제를 맞혔을 때의 기본값 — 상자가 높을수록 reviewExp()가 올려준다 */
  reviewCorrect: 15,
  /** 실수 하나를 졸업시켰을 때 */
  graduated: 40,
  /** 표현을 저장함에 담았을 때 */
  saved: 5,
} as const

/**
 * 복습 한 문제의 EXP.
 *
 * 어제 본 것을 오늘 맞히는 것과, 35일 만에 나온 것을 맞히는 것은 같은 일이
 * 아니다. 뒤엣것이 실제로 외운 것에 가깝다. 상자가 높을수록 더 준다.
 * "거의 맞음"은 절반 — 아깝게 틀린 것을 0으로 만들면 다시 안 온다.
 */
export function reviewExp(box: number, grade: "correct" | "close" | "wrong"): number {
  if (grade === "wrong") return 0
  const earned = EXP.reviewCorrect * (1 + Math.max(0, box) * 0.4)
  return Math.round(grade === "close" ? earned / 2 : earned)
}

export type QuestType = "daily" | "weekly" | "once"

export interface Quest {
  id: string
  type: QuestType
  title: string
  target: number
  progress: number
  done: boolean
  /** daily 퀘스트가 마지막으로 리셋된 날 */
  lastResetDate?: string
  /** weekly 퀘스트가 마지막으로 리셋된 주의 월요일 */
  lastResetWeek?: string
}

export function mondayOf(today: Date = new Date()): string {
  return currentWeekKeys(today)[0]
}

export function defaultQuests(): Quest[] {
  const date = toDateKey()
  const week = mondayOf()
  return [
    { id: "daily_entry", type: "daily", title: "오늘 일기 쓰기", target: 1, progress: 0, done: false, lastResetDate: date },
    { id: "daily_words", type: "daily", title: "오늘 60단어 이상 쓰기", target: 60, progress: 0, done: false, lastResetDate: date },
    { id: "weekly_days", type: "weekly", title: "주 5일 이상 쓰기", target: 5, progress: 0, done: false, lastResetWeek: week },
    { id: "weekly_review", type: "weekly", title: "이번 주 복습 20문제", target: 20, progress: 0, done: false, lastResetWeek: week },
    { id: "daily_review", type: "daily", title: "오늘 복습 10문제", target: 10, progress: 0, done: false, lastResetDate: date },
    { id: "weekly_graduate", type: "weekly", title: "이번 주 실수 5개 졸업", target: 5, progress: 0, done: false, lastResetWeek: week },
    { id: "once_flawless", type: "once", title: "교정 없는 일기 쓰기", target: 1, progress: 0, done: false },
    { id: "once_saved", type: "once", title: "저장함에 표현 10개 담기", target: 10, progress: 0, done: false },
  ]
}

/**
 * 저장된 퀘스트에 나중에 생긴 퀘스트를 채워 넣는다.
 *
 * 프로필 문서에는 그 사람이 처음 가입할 때의 퀘스트 목록이 통째로 저장돼
 * 있다. 나중에 퀘스트를 추가하면 새로 가입한 사람에게만 보이고 기존 사용자는
 * 영영 못 보게 되므로, 읽을 때 id를 기준으로 합친다. 진행도는 저장된 쪽을
 * 그대로 둔다.
 */
export function mergeQuests(saved: Quest[] | undefined): Quest[] {
  const defaults = defaultQuests()
  if (!saved?.length) return defaults

  const known = new Set(saved.map((q) => q.id))
  const added = defaults.filter((q) => !known.has(q.id))
  // 사라진 퀘스트는 조용히 버린다 — 목록에 없는 id는 화면에 뜰 자리가 없다.
  const alive = new Set(defaults.map((q) => q.id))
  return [...saved.filter((q) => alive.has(q.id)), ...added]
}

/**
 * 날짜가 바뀌었으면 daily를, 주가 바뀌었으면 weekly를 되돌린다.
 * once는 한 번 끝내면 끝이다.
 */
export function resetQuests(quests: Quest[], now: Date = new Date()): Quest[] {
  const date = toDateKey(now)
  const week = mondayOf(now)

  return quests.map((q) => {
    if (q.type === "daily" && q.lastResetDate !== date) {
      return { ...q, progress: 0, done: false, lastResetDate: date }
    }
    if (q.type === "weekly" && q.lastResetWeek !== week) {
      return { ...q, progress: 0, done: false, lastResetWeek: week }
    }
    return q
  })
}

export interface QuestBump {
  id: string
  /** 진행도를 이만큼 더한다 */
  add?: number
  /** 진행도를 이 값으로 맞춘다 (주 N일처럼 절대값으로 세는 퀘스트용) */
  set?: number
}

export interface QuestResult {
  quests: Quest[]
  /** 이번에 새로 달성한 퀘스트들 */
  completed: Quest[]
}

export function applyQuests(quests: Quest[], bumps: QuestBump[]): QuestResult {
  const completed: Quest[] = []

  const next = quests.map((q) => {
    const bump = bumps.find((b) => b.id === q.id)
    if (!bump || q.done) return q

    const progress = bump.set !== undefined ? bump.set : q.progress + (bump.add ?? 0)
    const clamped = Math.min(progress, q.target)
    const done = clamped >= q.target
    const updated = { ...q, progress: clamped, done }
    if (done) completed.push(updated)
    return updated
  })

  return { quests: next, completed }
}

export interface LevelState {
  level: number
  exp: number
  titles: string[]
}

export interface LevelResult extends LevelState {
  leveledUp: boolean
  /** 이번에 새로 얻은 칭호들 */
  earnedTitles: string[]
}

/**
 * EXP를 더하고 넘치는 만큼 레벨을 올린다.
 * 한 번에 여러 레벨이 오를 수 있어서 while로 돈다 (원본과 같은 방식).
 */
export function applyExp(state: LevelState, amount: number): LevelResult {
  let exp = state.exp + Math.max(0, Math.round(amount))
  let level = state.level
  const titles = [...state.titles]
  const earnedTitles: string[] = []
  let leveledUp = false

  while (exp >= level * LEVEL_STEP) {
    exp -= level * LEVEL_STEP
    level++
    leveledUp = true
    const milestone = getMilestoneTitle(level)
    if (milestone && !titles.includes(milestone)) {
      titles.push(milestone)
      earnedTitles.push(milestone)
    }
  }

  return { level, exp, titles, leveledUp, earnedTitles }
}

/** 다음 레벨까지 필요한 총 EXP */
export function expToNext(level: number): number {
  return level * LEVEL_STEP
}

const MILESTONES: Record<number, string> = {
  10: "꾸준한 사람",
  20: "문장 수집가",
  30: "오답 정복자",
  40: "숙련된 기록자",
  50: "베테랑 일기러",
  100: "전설의 기록자",
}

export function getMilestoneTitle(level: number): string | null {
  if (MILESTONES[level]) return MILESTONES[level]
  if (level > 10 && level % 10 === 0) return `Lv.${level} 기록자`
  return null
}

/**
 * 개념 하나를 떼었을 때 주는 칭호.
 *
 * 레벨 칭호는 오래 쓰면 저절로 붙지만 이건 다르다. 그 카테고리에서 실제로
 * 여러 개를 졸업시키고, 최근에는 같은 실수가 나오지 않아야 얻는다.
 * 26개 카테고리가 그대로 26개의 목표가 된다.
 */
export function categoryTitle(categoryKo: string): string {
  return `${categoryKo} 졸업생`
}

// ── 알림 ──────────────────────────────────────────────────────────
// store가 UI를 직접 참조하지 않도록 CustomEvent로 던지고 Toast가 구독한다.
// (WriterQuest의 Toast 디커플링 방식 그대로)

export interface GameNotice {
  kind: "levelup" | "quest" | "title"
  title: string
  detail?: string
}

export const GAME_EVENT = "echodiary:game"

export function notify(notice: GameNotice) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<GameNotice>(GAME_EVENT, { detail: notice }))
}

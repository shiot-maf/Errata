import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { db } from "./client"
import type { Entry, Feedback, Mistake, RawFeedback, UserProfile } from "../types"
import type { Severity } from "../taxonomy"
import { nextStreak, toDateKey } from "../dates"
import { demoStore, isDemo } from "../demo/store"
import {
  applyExp,
  applyQuests,
  defaultQuests,
  notify,
  resetQuests,
  type Quest,
  type QuestBump,
} from "../game"

/*
 * Firestore 구조
 *   diaryUsers/{uid}                        → UserProfile
 *   diaryUsers/{uid}/entries/{entryId}      → Entry (원문 + 첨삭 결과)
 *   diaryUsers/{uid}/mistakes/{mistakeId}   → Mistake (집계·복습용 평면 컬렉션)
 *
 * 실수를 일기 문서 안에만 두지 않고 별도 컬렉션으로도 평평하게 쌓는 게 핵심이다.
 * 그래야 "지난 3개월 동안 전치사를 몇 번 틀렸나" 같은 질문에 일기를 전부
 * 열어보지 않고 답할 수 있다.
 */

const userRef = (uid: string) => doc(db, "diaryUsers", uid)
const entriesRef = (uid: string) => collection(db, "diaryUsers", uid, "entries")
const entryRef = (uid: string, id: string) => doc(db, "diaryUsers", uid, "entries", id)
const mistakesRef = (uid: string) => collection(db, "diaryUsers", uid, "mistakes")

// ── 프로필 ────────────────────────────────────────────────────────

export async function ensureProfile(user: {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}): Promise<UserProfile> {
  if (isDemo()) return demoStore.profile()
  const snap = await getDoc(userRef(user.uid))
  if (snap.exists()) return withGameDefaults(snap.data() as UserProfile)

  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    createdAt: Date.now(),
    streak: 0,
    longestStreak: 0,
    lastEntryDate: null,
    totalEntries: 0,
    totalWords: 0,
    weeklyGoal: 3,
    level: 1,
    exp: 0,
    titles: [],
    quests: defaultQuests(),
  }
  await setDoc(userRef(user.uid), profile)
  return profile
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  if (isDemo()) return demoStore.profile()
  const snap = await getDoc(userRef(uid))
  if (!snap.exists()) return null
  return withGameDefaults(snap.data() as UserProfile)
}

/**
 * 주간 목표와 게임 필드는 앱이 굴러간 뒤에 추가됐다.
 * 그 전에 만들어진 문서를 읽을 때 빈 자리를 메운다.
 */
function withGameDefaults(data: UserProfile): UserProfile {
  return {
    ...data,
    weeklyGoal: data.weeklyGoal ?? 3,
    level: data.level ?? 1,
    exp: data.exp ?? 0,
    titles: data.titles ?? [],
    quests: data.quests?.length ? data.quests : defaultQuests(),
  }
}

export async function setWeeklyGoal(uid: string, goal: number): Promise<void> {
  if (isDemo()) return demoStore.setWeeklyGoal(Math.max(1, Math.min(7, goal)))
  await updateDoc(userRef(uid), { weeklyGoal: Math.max(1, Math.min(7, goal)) })
}

// ── 일기 ──────────────────────────────────────────────────────────

function toEntry(snap: QueryDocumentSnapshot): Entry {
  const d = snap.data()
  return {
    id: snap.id,
    dateKey: d.dateKey,
    text: d.text ?? "",
    wordCount: d.wordCount ?? 0,
    createdAt: d.createdAt ?? 0,
    updatedAt: d.updatedAt ?? d.createdAt ?? 0,
    feedback: (d.feedback as Feedback | undefined) ?? null,
  }
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/**
 * 일기를 저장한다. 하루에 여러 편도 쓸 수 있게 entryId는 날짜와 무관한
 * 자동 ID를 쓰고, dateKey는 필드로만 들고 간다.
 */
export async function saveEntry(
  uid: string,
  input: { id?: string; dateKey: string; text: string },
): Promise<string> {
  if (isDemo()) return demoStore.saveEntry(input)
  const isNew = !input.id
  const ref = input.id ? entryRef(uid, input.id) : doc(entriesRef(uid))
  const now = Date.now()
  const wordCount = countWords(input.text)

  if (isNew) {
    await setDoc(ref, {
      dateKey: input.dateKey,
      text: input.text,
      wordCount,
      createdAt: now,
      updatedAt: now,
      feedback: null,
    })
    await bumpProfileForNewEntry(uid, input.dateKey, wordCount)
  } else {
    await updateDoc(ref, { text: input.text, wordCount, updatedAt: now })
  }
  return ref.id
}

async function bumpProfileForNewEntry(uid: string, dateKey: string, words: number) {
  const profile = await getProfile(uid)
  if (!profile) return
  const streak = nextStreak(profile.lastEntryDate, profile.streak, dateKey)
  await updateDoc(userRef(uid), {
    totalEntries: (profile.totalEntries ?? 0) + 1,
    totalWords: (profile.totalWords ?? 0) + words,
    streak,
    longestStreak: Math.max(profile.longestStreak ?? 0, streak),
    lastEntryDate: dateKey > (profile.lastEntryDate ?? "") ? dateKey : profile.lastEntryDate,
  })
}

export async function getEntry(uid: string, id: string): Promise<Entry | null> {
  if (isDemo()) return demoStore.getEntry(id)
  const snap = await getDoc(entryRef(uid, id))
  if (!snap.exists()) return null
  return toEntry(snap as QueryDocumentSnapshot)
}

export async function listEntries(uid: string, max = 100): Promise<Entry[]> {
  if (isDemo()) return demoStore.entries().slice(0, max)
  const q = query(entriesRef(uid), orderBy("createdAt", "desc"), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map(toEntry)
}

export async function deleteEntry(uid: string, entryId: string): Promise<void> {
  if (isDemo()) return demoStore.deleteEntry(entryId)
  // 일기를 지우면 거기서 나온 실수 기록도 같이 지운다. 안 그러면 통계가
  // 사라진 일기를 계속 가리킨다.
  const q = query(mistakesRef(uid), where("entryId", "==", entryId))
  const snap = await getDocs(q)
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(entryRef(uid, entryId))
  await batch.commit()
}

// ── 첨삭 결과 저장 ─────────────────────────────────────────────────

/**
 * 첨삭 결과를 일기 문서에 붙이고, 실수들을 mistakes 컬렉션에 흩뿌린다.
 * 재첨삭이면 이전 실수 기록을 먼저 지워서 중복 집계를 막는다.
 */
export async function saveFeedback(
  uid: string,
  entryId: string,
  dateKey: string,
  raw: RawFeedback,
  model: string,
): Promise<void> {
  if (isDemo()) return demoStore.saveFeedback(entryId, dateKey, raw)
  const now = Date.now()

  const existing = await getDocs(query(mistakesRef(uid), where("entryId", "==", entryId)))

  const batch = writeBatch(db)
  existing.docs.forEach((d) => batch.delete(d.ref))

  for (const c of raw.corrections) {
    const ref = doc(mistakesRef(uid))
    const mistake: Omit<Mistake, "id"> = {
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
    }
    batch.set(ref, mistake)
  }

  const feedback: Feedback = {
    correctedText: raw.correctedText,
    overallComment: raw.overallComment,
    praise: raw.praise,
    level: raw.level,
    scores: raw.scores,
    upgrades: raw.upgrades,
    correctionCount: raw.corrections.length,
    analyzedAt: now,
    model,
  }
  batch.update(entryRef(uid, entryId), { feedback, updatedAt: now })

  await batch.commit()
}

// ── 실수 ──────────────────────────────────────────────────────────

function toMistake(snap: QueryDocumentSnapshot): Mistake {
  const d = snap.data()
  return {
    id: snap.id,
    entryId: d.entryId,
    dateKey: d.dateKey,
    category: d.category,
    severity: d.severity as Severity,
    original: d.original,
    corrected: d.corrected,
    explanation: d.explanation ?? "",
    tip: d.tip,
    createdAt: d.createdAt ?? 0,
    reviewCount: d.reviewCount ?? 0,
    lastReviewedAt: d.lastReviewedAt,
    lastReviewCorrect: d.lastReviewCorrect,
  }
}

export async function listMistakes(uid: string, max = 1000): Promise<Mistake[]> {
  if (isDemo()) return demoStore.mistakes().slice(0, max)
  const q = query(mistakesRef(uid), orderBy("createdAt", "desc"), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map(toMistake)
}

export async function markReviewed(
  uid: string,
  mistakeId: string,
  correct: boolean,
  currentCount: number,
): Promise<void> {
  if (isDemo()) return demoStore.markReviewed(mistakeId, correct)
  await updateDoc(doc(mistakesRef(uid), mistakeId), {
    reviewCount: currentCount + 1,
    lastReviewedAt: Date.now(),
    lastReviewCorrect: correct,
  })
}

export { toDateKey }

// ── 저장함 (북마크) ────────────────────────────────────────────────

/*
 * 교정이나 표현 제안 중 "이건 꼭 외우자" 싶은 걸 따로 모아둔다.
 * mistakes에 플래그를 다는 대신 별도 컬렉션에 복사하는 이유는,
 * 일기를 지우거나 재첨삭해도 저장해둔 표현은 남아야 하기 때문이다.
 */

import type { SavedItem } from "../types"

const savedRef = (uid: string) => collection(db, "diaryUsers", uid, "saved")

export async function listSaved(uid: string, max = 500): Promise<SavedItem[]> {
  if (isDemo()) return demoStore.saved().slice(0, max)
  const snap = await getDocs(query(savedRef(uid), orderBy("createdAt", "desc"), limit(max)))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      kind: data.kind,
      sourceId: data.sourceId ?? "",
      entryId: data.entryId ?? "",
      dateKey: data.dateKey ?? "",
      front: data.front ?? "",
      back: data.back ?? "",
      note: data.note ?? "",
      category: data.category,
      createdAt: data.createdAt ?? 0,
    } satisfies SavedItem
  })
}

export async function addSaved(
  uid: string,
  item: Omit<SavedItem, "id" | "createdAt">,
): Promise<string> {
  if (isDemo()) return demoStore.addSaved(item)
  const ref = doc(savedRef(uid))
  await setDoc(ref, { ...item, createdAt: Date.now() })
  return ref.id
}

export async function removeSaved(uid: string, id: string): Promise<void> {
  if (isDemo()) return demoStore.removeSaved(id)
  await deleteDoc(doc(savedRef(uid), id))
}

// ── 게이미피케이션 ────────────────────────────────────────────────

/*
 * EXP와 퀘스트는 프로필 문서 한 곳에만 산다. 별도 컬렉션으로 쪼개면
 * 일기 한 편 쓸 때마다 읽기·쓰기가 여러 번 늘어나는데, 게임 상태는
 * 크기가 작고 항상 통째로 필요해서 그럴 이유가 없다.
 */

export interface GameAward {
  exp?: number
  quests?: QuestBump[]
}

/**
 * EXP를 주고 퀘스트를 밀어올린다. 레벨업·퀘스트 달성은 CustomEvent로 알린다
 * (데이터 레이어가 화면을 직접 건드리지 않게).
 *
 * 날짜가 바뀌었으면 여기서 daily/weekly 퀘스트를 먼저 되돌린다 — 자정에
 * 도는 스케줄러가 없으니, 다음에 무언가 할 때 리셋되면 충분하다.
 */
export async function award(uid: string, gain: GameAward): Promise<void> {
  const profile = isDemo() ? demoStore.profile() : await getProfile(uid)
  if (!profile) return

  const reset = resetQuests(profile.quests ?? [])
  const { quests, completed } = applyQuests(reset, gain.quests ?? [])
  const level = applyExp(
    { level: profile.level ?? 1, exp: profile.exp ?? 0, titles: profile.titles ?? [] },
    gain.exp ?? 0,
  )

  const next = {
    level: level.level,
    exp: level.exp,
    titles: level.titles,
    quests,
  }

  if (isDemo()) demoStore.setGame(next)
  else await updateDoc(userRef(uid), next)

  for (const quest of completed) {
    notify({ kind: "quest", title: "퀘스트 완료", detail: quest.title })
  }
  if (level.leveledUp) {
    notify({ kind: "levelup", title: `레벨 ${level.level} 달성`, detail: "계속 쓰고 있어요" })
  }
  for (const title of level.earnedTitles) {
    notify({ kind: "title", title: "새 칭호", detail: title })
  }
}

/** 날짜만 바뀌었을 때 퀘스트를 되돌린다 (앱을 열었을 때 호출) */
export async function refreshQuests(uid: string): Promise<Quest[] | null> {
  const profile = isDemo() ? demoStore.profile() : await getProfile(uid)
  if (!profile) return null

  const quests = resetQuests(profile.quests ?? [])
  const changed = JSON.stringify(quests) !== JSON.stringify(profile.quests)
  if (!changed) return profile.quests

  if (isDemo()) demoStore.setGame({ quests })
  else await updateDoc(userRef(uid), { quests })
  return quests
}

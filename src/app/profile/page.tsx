"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { PageHeader } from "@/components/AppShell"
import { Loading, Pill } from "@/components/ui"
import { ProfileSheet, type ProfileSummary } from "@/components/ProfileSheet"
import { listEntries, listMistakes, listSaved } from "@/lib/firebase/db"
import { dailyActivity } from "@/lib/analysis/aggregate"
import { EXPRESSION_SLUG, collectReviewItems } from "@/lib/review/item"
import { categoryProgress, isGraduated } from "@/lib/review/schedule"
import { masteredCategories } from "@/lib/review/insight"
import { CATEGORIES } from "@/lib/taxonomy"
import { toDateKey } from "@/lib/dates"
import type { Entry, Mistake, SavedItem } from "@/lib/types"

/**
 * 내 프로필.
 *
 * 다른 화면은 "무엇을 틀렸나"를 보여주지만 여기는 "얼마나 왔나"를 보여준다.
 * 판권줄에 한 줄로 눌려 있던 레벨·스트릭·칭호를 펴놓는 자리다.
 *
 * 화면은 ProfileSheet가 그리고, 이 페이지는 값을 모으기만 한다. 나중에
 * 공개 프로필(남이 보는 내 프로필)이 생기면 읽는 곳만 바뀌고 화면은 그대로다.
 */

interface Loaded {
  entries: Entry[]
  mistakes: Mistake[]
  saved: SavedItem[]
  /** 렌더 중에 Date.now()를 부르지 않도록 불러온 시각을 들고 다닌다 */
  now: number
}

/** 히트맵에 그릴 기간 */
const ACTIVITY_DAYS = 120

/**
 * 개념 진행에 몇 줄까지 보여줄지.
 * 여기는 요약이다 — 26개를 다 늘어놓는 표는 복습 화면에 있다.
 */
const PROGRESS_ROWS = 10

export default function ProfilePage() {
  const { user, profile, demo } = useAuth()
  const [data, setData] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      listEntries(user.uid, 500),
      listMistakes(user.uid, 2000),
      listSaved(user.uid, 500),
    ])
      .then(([entries, mistakes, saved]) => {
        if (!cancelled) setData({ entries, mistakes, saved, now: Date.now() })
      })
      .catch(() => {
        if (!cancelled) setData({ entries: [], mistakes: [], saved: [], now: Date.now() })
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const summary = useMemo<ProfileSummary | null>(() => {
    if (!user || !data) return null
    const items = collectReviewItems(data.mistakes, data.saved)
    const today = toDateKey(new Date(data.now))

    return {
      displayName: profile?.displayName ?? user.displayName,
      photoURL: profile?.photoURL ?? user.photoURL,
      since: profile?.createdAt ?? data.now,
      streak: profile?.streak ?? 0,
      longestStreak: profile?.longestStreak ?? 0,
      wroteToday: profile?.lastEntryDate === today,
      level: profile?.level ?? 1,
      exp: profile?.exp ?? 0,
      titles: profile?.titles ?? [],
      // 프로필 문서의 누계가 정본이다. 목록은 최근 것만 읽어오므로 오래
      // 쓴 사람에게는 실제보다 적게 나온다.
      entries: profile?.totalEntries ?? data.entries.length,
      words: profile?.totalWords ?? data.entries.reduce((s, e) => s + e.wordCount, 0),
      mistakes: data.mistakes.length,
      graduated: items.filter(isGraduated).length,
      concepts: {
        met: masteredCategories(items, today).length,
        total: CATEGORIES.length,
      },
      // 담아둔 표현은 26개 개념 중 하나가 아니라 별도 묶음이다.
      // "26개 중 N개" 옆에 끼워두면 셈이 어긋나 보인다.
      progress: categoryProgress(items, data.now)
        .filter((p) => p.category !== EXPRESSION_SLUG)
        .slice(0, PROGRESS_ROWS),
      activity: dailyActivity(data.entries, data.mistakes, ACTIVITY_DAYS),
    }
  }, [user, profile, data])

  if (!user) return null
  if (!summary) return <Loading />

  return (
    <div className="reveal">
      <PageHeader
        no="01"
        title="내 기록"
        meta={demo ? "데모" : undefined}
        description="쓴 것과 뗀 것을 한 장에 모았어요."
        action={
          <Link href="/settings">
            <Pill variant="quiet">설정</Pill>
          </Link>
        }
      />
      <ProfileSheet summary={summary} />
    </div>
  )
}

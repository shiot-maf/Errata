"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { appUrl } from "@/lib/basePath"
import { useAuth } from "./AuthProvider"
import { signInWithGoogle, signOutUser } from "@/lib/firebase/auth"
import { listEntries, listMistakes, listSaved, refreshQuests } from "@/lib/firebase/db"
import { currentWeekKeys, toDateKey } from "@/lib/dates"
import { dueCount } from "@/lib/review/schedule"
import { collectReviewItems } from "@/lib/review/item"
import { onDueCount } from "@/lib/review/dueSignal"
import { expToNext } from "@/lib/game"
import { MonthCalendar } from "./MonthCalendar"
import { QuestPanel } from "./QuestPanel"
import { WeeklyGoal } from "./WeeklyGoal"
import {
  Bookmark,
  ChartColumn,
  Clock,
  PenLine,
  Repeat,
  Flame,
  Settings as SettingsIcon,
  Spinner,
} from "./icons"
import type { Entry } from "@/lib/types"

const NAV = [
  { href: "/", label: "쓰기", Icon: PenLine },
  { href: "/history", label: "기록", Icon: Clock },
  { href: "/saved", label: "저장함", Icon: Bookmark },
  { href: "/report", label: "리포트", Icon: ChartColumn },
  { href: "/review", label: "복습", Icon: Repeat },
  { href: "/settings", label: "설정", Icon: SettingsIcon },
]

/** 화면마다 판권줄 오른쪽에 붙는 짧은 설명 */
const EDITION: Record<string, string> = {
  "/": "Draft",
  "/history": "History",
  "/saved": "Saved",
  "/report": "Report",
  "/review": "Drill",
  "/profile": "Profile",
  "/settings": "Settings",
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, loading, demo } = useAuth()
  const pathname = usePathname()
  const [entries, setEntries] = useState<Entry[]>([])
  const [due, setDue] = useState(0)

  // 주간 목표와 캘린더가 같은 목록을 쓰므로 한 번만 읽는다.
  // 밀린 복습 수도 여기서 한 번 센다 — 실수와 담아둔 표현을 함께 센다.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      listEntries(user.uid, 400),
      listMistakes(user.uid, 2000),
      listSaved(user.uid, 500),
    ])
      .then(([list, mistakes, saved]) => {
        if (cancelled) return
        setEntries(list)
        setDue(dueCount(collectReviewItems(mistakes, saved)))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user, profile?.totalEntries])

  // 복습을 한 문제 풀 때마다 밀린 수가 줄어든다. 그때마다 2000건을 다시 읽는
  // 대신, 목록을 손에 들고 있는 복습 화면이 셈만 넘겨준다.
  useEffect(() => onDueCount(setDue), [])

  // 자정에 도는 스케줄러가 없으니 앱을 열 때 지난 퀘스트를 되돌린다.
  useEffect(() => {
    if (!user) return
    void refreshQuests(user.uid).catch(() => {})
  }, [user])

  const weekDone = useMemo(() => {
    const week = new Set(currentWeekKeys())
    return new Set(entries.filter((e) => week.has(e.dateKey)).map((e) => e.dateKey)).size
  }, [entries])

  // 스트릭이 걸려 있는지 — 오늘 아직 안 썼으면 판권줄이 빨간펜으로 바뀐다.
  // 습관 앱에서 사람을 움직이는 건 자랑이 아니라 끊길 위기 쪽이다.
  //
  // 일기 목록이 아니라 프로필의 lastEntryDate를 본다. 목록은 나중에 도착하므로
  // 그걸 기준으로 하면 불러오는 동안 "오늘 아직"이 잘못 번쩍인다.
  const wroteToday = profile?.lastEntryDate === toDateKey()

  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-dvh items-center justify-center text-ink-3"
      >
        <Spinner className="h-5 w-5" />
        <span className="sr-only">불러오는 중</span>
      </div>
    )
  }

  if (!user) return <Landing />

  // next.config의 trailingSlash 때문에 pathname은 "/history/"처럼 들어온다.
  // 라우트 표(NAV·EDITION)의 키는 슬래시 없는 쪽이라 여기서 맞춰준다.
  const route = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname

  const isActive = (href: string) =>
    href === "/" ? route === "/" : route.startsWith(href)

  return (
    <div className="mx-auto max-w-6xl px-0 py-0 md:px-8 md:py-8">
      {/*
        키보드만 쓰면 화면마다 제호와 내비를 지나야 본문에 닿는다.
        평소에는 숨어 있다가 탭을 처음 누를 때 나타난다.
      */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:tracking-[0.1em] focus:text-sheet focus:uppercase"
      >
        본문으로 건너뛰기
      </a>

      <div className="sheet min-h-dvh md:min-h-0">
        {/* ── 제호 ── */}
        <header className="px-5 pt-4 pb-3 md:px-12 md:pt-8 md:pb-4">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
            <div>
              <Link href="/" className="block">
                <span className="font-mono text-xl font-semibold tracking-[0.2em] md:text-4xl md:tracking-[0.22em]">
                  ERR<span className="text-pen">A</span>TA
                </span>
              </Link>
              <p className="mt-1 hidden text-sm text-ink-3 md:block">
                Write. Correct. Count. — 틀린 것을 세어 두는 일기
              </p>
            </div>

            {/* 데스크톱 내비 */}
            <nav aria-label="주 메뉴" className="ml-auto hidden gap-6 pb-1 md:flex">
              {NAV.map((item) => {
                const on = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={`pb-1.5 font-mono text-xs tracking-[0.1em] uppercase transition-colors ${
                      on
                        ? "border-b-2 border-pen font-semibold text-ink"
                        : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <span className="label-sm ml-auto md:hidden">
              {EDITION[route] ?? "No. " + (profile?.totalEntries ?? 0)}
            </span>
          </div>
        </header>

        <div className="rule-double" />

        {/* ── 판권줄 겸 지표 줄 ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-rule px-5 py-2 font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase md:px-12 md:text-[11px]">
          <span>
            {formatColophonDate()} <b className="font-semibold text-ink">{weekday()}</b>
          </span>

          {/*
            레벨과 스트릭은 판권줄에 눌려 있기엔 이 앱에서 가장 자주 보는
            숫자다. 눌러서 펼친 자리(프로필)로 가게 한다.
          */}
          <Link
            href="/profile"
            aria-label={profileLabel(profile, wroteToday)}
            className="inline-flex flex-wrap items-center gap-x-5 gap-y-1.5 hover:text-ink"
          >
            <StreakMark streak={profile?.streak ?? 0} atRisk={!wroteToday} />
            <LevelMark level={profile?.level ?? 1} exp={profile?.exp ?? 0} />
          </Link>

          {due > 0 && (
            <Link
              href="/review"
              className="text-pen underline-offset-2 hover:underline"
            >
              복습 <b className="font-semibold">{due}</b>
            </Link>
          )}

          <span className="ml-auto hidden md:inline">
            {(profile?.totalWords ?? 0).toLocaleString()} words logged ·{" "}
            {profile?.totalEntries ?? 0} entries
          </span>
        </div>

        {demo && <DemoBanner />}

        {/* ── 본문 ── */}
        <div className="grid md:grid-cols-[1fr_264px]">
          <main
            id="main"
            tabIndex={-1}
            className="min-w-0 px-5 pt-6 pb-24 md:border-r md:border-rule md:px-12 md:pt-8 md:pb-12"
          >
            {children}
          </main>

          {/* 데스크톱 사이드 — 상자를 두르지 않아 본문이 떠오른다 */}
          <aside className="hidden px-8 pt-8 pb-12 md:block">
            <div className="space-y-6">
              <SideBlock label={`${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, "0")}`}>
                <MonthCalendar entries={entries} />
              </SideBlock>
              <SideBlock label="주간 목표">
                <WeeklyGoal done={weekDone} />
              </SideBlock>
              <SideBlock label="진행">
                <QuestPanel />
              </SideBlock>
              <div className="border-t border-rule-2 pt-5">
                <Link
                  href="/profile"
                  className="label-sm block hover:text-ink"
                >
                  내 기록
                </Link>
                <p className="mt-2 truncate font-mono text-[10px] tracking-[0.06em] text-ink-3">
                  {user.email}
                </p>
                {demo ? (
                  <a
                    href={appUrl("/?demo=0")}
                    className="mt-1.5 inline-block font-mono text-[10px] tracking-[0.08em] text-ink-3 uppercase hover:text-ink"
                  >
                    데모 나가기
                  </a>
                ) : (
                  <button
                    onClick={() => signOutUser()}
                    className="mt-1.5 font-mono text-[10px] tracking-[0.08em] text-ink-3 uppercase hover:text-ink"
                  >
                    로그아웃
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/*
          모바일에는 사이드바가 없어서 캘린더·주간 목표·퀘스트를 볼 방법이
          아예 없었다. 접어둔 채로 같은 자리에 둔다.
        */}
        <details className="border-t border-rule md:hidden">
          <summary className="label cursor-pointer px-5 py-3">
            이번 달 · 주간 목표 · 진행
          </summary>
          <div className="space-y-6 px-5 pb-8">
            <MonthCalendar entries={entries} />
            <WeeklyGoal done={weekDone} />
            <QuestPanel />
          </div>
        </details>
      </div>

      {/* ── 모바일 하단 탭 ── */}
      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink bg-sheet pb-[max(env(safe-area-inset-bottom),8px)] md:hidden"
      >
        {NAV.slice(0, 5).map(({ href, label, Icon }) => {
          const on = isActive(href)
          const badge = href === "/review" && due > 0 ? due : null
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1.5 font-mono text-[9px] tracking-[0.08em] uppercase transition-colors ${
                on ? "text-ink" : "text-ink-3"
              }`}
            >
              <span className="relative">
                <Icon className={`h-[18px] w-[18px] ${on ? "text-pen" : ""}`} />
                {badge !== null && (
                  <span
                    aria-hidden
                    className="tabnum absolute -top-1.5 -right-2.5 bg-pen px-1 text-[9px] leading-[14px] font-semibold text-sheet"
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              {label}
              {badge !== null && <span className="sr-only">밀린 복습 {badge}개</span>}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

/**
 * 스트릭.
 *
 * 숫자만 적어두면 그냥 통계다. 오늘 아직 안 썼으면 색과 문구를 바꿔서
 * "지금 끊길 수 있다"를 알린다 — 이 앱에서 사람을 다시 불러오는 건 이 한 줄이다.
 */
function StreakMark({ streak, atRisk }: { streak: number; atRisk: boolean }) {
  if (streak === 0) {
    return (
      <span>
        Streak <b className="font-semibold text-ink">0</b>
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 ${atRisk ? "text-pen" : ""}`}>
      <Flame className={`h-3 w-3 ${atRisk ? "" : "text-ink"}`} />
      <span>
        Streak{" "}
        <b className={`font-semibold ${atRisk ? "" : "text-ink"}`}>{streak}</b>
      </span>
      {atRisk && <span className="tracking-[0.06em]">· 오늘 아직</span>}
    </span>
  )
}

/** 레벨과 다음 레벨까지의 진행. 사이드바가 없는 모바일에서도 보여야 한다. */
function LevelMark({ level, exp }: { level: number; exp: number }) {
  const need = expToNext(level)
  const pct = Math.min(100, Math.round((exp / need) * 100))
  return (
    <span
      className="inline-flex items-center gap-2"
      title={`다음 레벨까지 ${Math.max(0, need - exp)} EXP`}
    >
      <span>
        Lv <b className="font-semibold text-ink">{level}</b>
      </span>
      {/* 감싸는 링크의 이름이 같은 값을 말한다 — 두 번 읽히지 않게 숨긴다 */}
      <span aria-hidden className="relative block h-[3px] w-10 bg-rule">
        <span
          className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  )
}

/** 판권줄 링크가 스크린 리더에 읽힐 한 줄 — 눈으로 보는 것과 같은 값을 말한다 */
function profileLabel(
  profile: { streak?: number; level?: number; exp?: number } | null,
  wroteToday: boolean,
): string {
  const streak = profile?.streak ?? 0
  const level = profile?.level ?? 1
  const left = Math.max(0, expToNext(level) - (profile?.exp ?? 0))
  return [
    "내 기록",
    `연속 ${streak}일`,
    ...(wroteToday ? [] : ["오늘 아직 안 씀"]),
    `레벨 ${level}`,
    `다음 레벨까지 ${left} EXP`,
  ].join(", ")
}

function SideBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-b border-rule-2 pb-6 last:border-b-0 last:pb-0">
      <p className="label mb-3">{label}</p>
      {children}
    </section>
  )
}

function formatColophonDate() {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
}

function weekday() {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date().getDay()]
}

function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule bg-paper-2 px-5 py-2 md:px-12">
      <span className="label-sm !text-pen">데모 모드</span>
      <p className="text-xs text-ink-3">
        샘플 일기로 둘러보는 중이에요. 바꾼 내용은 저장되지 않습니다.
      </p>
      <a
        href={appUrl("/?demo=0")}
        className="ml-auto font-mono text-[10px] tracking-[0.08em] text-ink-3 uppercase underline underline-offset-2 hover:text-ink"
      >
        나가기
      </a>
    </div>
  )
}

/**
 * 구획 머리말 — 번호 + 제목, 오른쪽에 메타나 조작부, 그 아래 설명.
 * 모든 화면이 같은 리듬으로 시작한다.
 *
 * meta는 글자(날짜·개수)라 제목과 밑줄을 공유하지만, action은 버튼이나
 * 필터라서 괘선 아래로 내린다. 컨트롤을 괘선 위에 올리면 제목보다 먼저
 * 눈에 들어와서 머리말이 도구 모음처럼 보인다.
 */
export function PageHeader({
  no,
  title,
  meta,
  description,
  action,
}: {
  no?: string
  title: ReactNode
  meta?: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3 border-b border-ink pb-2.5">
        {no && <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-pen">{no}</span>}
        <h1 className="text-[15px] font-semibold">{title}</h1>
        {meta && <span className="label-sm ml-auto">{meta}</span>}
      </div>
      {(description || action) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {description && (
            <p className="max-w-prose text-sm text-ink-3">{description}</p>
          )}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
    </div>
  )
}

function Landing() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (e) {
      const code = (e as { code?: string }).code
      setError(
        code === "auth/popup-closed-by-user"
          ? "로그인 창이 닫혔어요."
          : code === "auth/unauthorized-domain"
            ? "이 도메인이 Firebase에 등록되지 않았어요. 콘솔의 승인된 도메인에 추가해주세요."
            : "로그인에 실패했어요. 잠시 후 다시 시도해주세요.",
      )
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-16">
      <div className="sheet reveal">
        <div className="px-6 pt-8 pb-4 md:px-12 md:pt-12">
          <span className="font-mono text-3xl font-semibold tracking-[0.22em] md:text-5xl">
            ERR<span className="text-pen">A</span>TA
          </span>
          <p className="mt-3 text-ink-3">
            Write. Correct. Count. — 틀린 것을 세어 두는 일기
          </p>
        </div>
        <div className="rule-double" />
        <div className="flex gap-5 border-b border-rule px-6 py-2 font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase md:px-12">
          <span>English diary</span>
          <span>26 categories</span>
          <span>Bring your own key</span>
        </div>

        <div className="px-6 py-8 md:px-12 md:py-12">
          <h1 className="text-2xl leading-snug font-semibold tracking-[-0.02em] md:text-3xl">
            영어로 하루를 적으면
            <br />
            내가 반복해서 틀리는 지점이 데이터로 쌓입니다.
          </h1>

          <ol className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Step no="01" title="쓰면 바로 첨삭">
              무엇이 왜 틀렸는지 한국어로 설명합니다.
            </Step>
            <Step no="02" title="모든 실수에 태그">
              시제·관사·전치사 등 26개 카테고리로 자동 분류됩니다.
            </Step>
            <Step no="03" title="취약점 리포트">
              무엇을 가장 많이 틀리는지, 나아지고 있는지 추이로 봅니다.
            </Step>
            <Step no="04" title="내 오답으로 복습">
              자주 틀린 것부터 골라 다시 물어봅니다.
            </Step>
          </ol>

          <div className="mt-10 border-t border-rule pt-8">
            <button
              onClick={signIn}
              disabled={busy}
              className="w-full bg-ink px-6 py-4 font-mono text-xs font-semibold tracking-[0.14em] text-sheet uppercase transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
            >
              {busy ? "연결 중" : "Google로 시작하기"}
            </button>
            {error && <p className="mt-3 text-sm text-pen">{error}</p>}
            <p className="mt-4 text-xs text-ink-3">
              일기는 내 계정에만 저장되고, API 키는 브라우저를 벗어나지 않습니다.
            </p>
            <p className="mt-6 border-t border-rule-2 pt-5 text-sm text-ink-3">
              그냥 어떤 앱인지 보고 싶다면{" "}
              <a href={appUrl("/?demo=1")} className="font-medium text-ink underline underline-offset-4">
                샘플 데이터로 둘러보기
              </a>{" "}
              — 로그인도 API 키도 필요 없습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({
  no,
  title,
  children,
}: {
  no: string
  title: string
  children: ReactNode
}) {
  return (
    <li className="border-t border-rule-2 pt-4">
      <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-pen">{no}</span>
      <p className="mt-2 font-medium">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-3">{children}</p>
    </li>
  )
}

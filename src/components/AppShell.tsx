"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { appUrl } from "@/lib/basePath"
import { useAuth } from "./AuthProvider"
import { signInWithGoogle, signOutUser } from "@/lib/firebase/auth"
import { listEntries, refreshQuests } from "@/lib/firebase/db"
import { currentWeekKeys, toDateKey } from "@/lib/dates"
import { MonthCalendar } from "./MonthCalendar"
import { QuestPanel } from "./QuestPanel"
import { WeeklyGoal } from "./WeeklyGoal"
import {
  Bookmark,
  ChartColumn,
  Clock,
  PenLine,
  Repeat,
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
  "/settings": "Settings",
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, loading, demo } = useAuth()
  const pathname = usePathname()
  const [entries, setEntries] = useState<Entry[]>([])

  // 주간 목표와 캘린더가 같은 목록을 쓰므로 한 번만 읽는다.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    listEntries(user.uid, 400)
      .then((list) => {
        if (!cancelled) setEntries(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user, profile?.totalEntries])

  // 자정에 도는 스케줄러가 없으니 앱을 열 때 지난 퀘스트를 되돌린다.
  useEffect(() => {
    if (!user) return
    void refreshQuests(user.uid).catch(() => {})
  }, [user])

  const weekDone = useMemo(() => {
    const week = new Set(currentWeekKeys())
    return new Set(entries.filter((e) => week.has(e.dateKey)).map((e) => e.dateKey)).size
  }, [entries])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-4">
        <Spinner className="h-5 w-5" />
      </div>
    )
  }

  if (!user) return <Landing />

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <div className="mx-auto max-w-6xl px-0 py-0 md:px-8 md:py-8">
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
            <nav className="ml-auto hidden gap-6 pb-1 md:flex">
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
              {EDITION[pathname] ?? "No. " + (profile?.totalEntries ?? 0)}
            </span>
          </div>
        </header>

        <div className="rule-double" />

        {/* ── 판권줄 ── */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-rule px-5 py-2 font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase md:px-12 md:text-[11px]">
          <span>
            {formatColophonDate()} <b className="font-semibold text-ink">{weekday()}</b>
          </span>
          <span>
            Streak <b className="font-semibold text-ink">{profile?.streak ?? 0}</b>
          </span>
          <span>
            Lv <b className="font-semibold text-ink">{profile?.level ?? 1}</b>
          </span>
          <span className="ml-auto hidden md:inline">
            {(profile?.totalWords ?? 0).toLocaleString()} words logged ·{" "}
            {profile?.totalEntries ?? 0} entries
          </span>
        </div>

        {demo && <DemoBanner />}

        {/* ── 본문 ── */}
        <div className="grid md:grid-cols-[1fr_264px]">
          <main className="min-w-0 px-5 pt-6 pb-24 md:border-r md:border-rule md:px-12 md:pt-8 md:pb-12">
            {children}
          </main>

          {/* 데스크톱 사이드 — 상자를 두르지 않아 본문이 떠오른다 */}
          <aside className="hidden px-8 pt-8 pb-12 md:block">
            <div className="space-y-6">
              <SideBlock label={`${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, "0")}`}>
                <MonthCalendar entries={entries} />
              </SideBlock>
              <SideBlock label="주간 목표">
                <WeeklyGoal done={weekDone} variant="sidebar" />
              </SideBlock>
              <SideBlock label="진행">
                <QuestPanel />
              </SideBlock>
              <div className="border-t border-rule-2 pt-5">
                <p className="truncate font-mono text-[10px] tracking-[0.06em] text-ink-3">
                  {user.email}
                </p>
                {demo ? (
                  <a
                    href={appUrl("/?demo=0")}
                    className="mt-1.5 inline-block font-mono text-[10px] tracking-[0.08em] text-ink-4 uppercase hover:text-ink"
                  >
                    데모 나가기
                  </a>
                ) : (
                  <button
                    onClick={() => signOutUser()}
                    className="mt-1.5 font-mono text-[10px] tracking-[0.08em] text-ink-4 uppercase hover:text-ink"
                  >
                    로그아웃
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── 모바일 하단 탭 ── */}
      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink bg-sheet pb-[max(env(safe-area-inset-bottom),8px)] md:hidden"
      >
        {NAV.slice(0, 5).map(({ href, label, Icon }) => {
          const on = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1.5 font-mono text-[9px] tracking-[0.08em] uppercase transition-colors ${
                on ? "text-ink" : "text-ink-4"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${on ? "text-pen" : ""}`} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
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

/** 구획 머리말 — 번호 + 제목 + 오른쪽 메타. 모든 화면이 같은 리듬으로 시작한다. */
export function PageHeader({
  no,
  title,
  meta,
}: {
  no?: string
  title: ReactNode
  meta?: ReactNode
  /** 이전 API 호환 */
  eyebrow?: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-baseline gap-3 border-b border-ink pb-2.5">
      {no && <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-pen">{no}</span>}
      <h1 className="text-[15px] font-semibold">{title}</h1>
      {meta && <span className="label-sm ml-auto">{meta}</span>}
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

export { toDateKey }

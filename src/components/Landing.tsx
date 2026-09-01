"use client"

import { useState, type ReactNode } from "react"
import { appUrl } from "@/lib/basePath"
import {
  authErrorMessage,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase/auth"
import { ErrorNote } from "./ui"

/**
 * 로그인 전 화면.
 *
 * 구글 계정만 받다가 이메일 가입을 열었다. 구글이 없는 사람도 있고, 무엇보다
 * 이 사이트의 계정이라는 감각이 있어야 나중에 친구·프로필 같은 것이 말이 된다.
 * 구글 쪽을 없애지는 않았다 — 이미 그걸로 쓰던 일기가 있다.
 */

type Mode = "signin" | "signup"

export function Landing() {
  const [mode, setMode] = useState<Mode>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [busy, setBusy] = useState<null | "email" | "google" | "reset">(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const signup = mode === "signup"

  /** 성공하면 onAuthStateChanged가 화면을 갈아치우므로 여기서 할 일은 없다 */
  const run = async (kind: "email" | "google" | "reset", job: () => Promise<unknown>) => {
    setBusy(kind)
    setError(null)
    setNotice(null)
    try {
      await job()
      return true
    } catch (e) {
      setError(authErrorMessage(e))
      setBusy(null)
      return false
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    await run("email", () =>
      signup ? signUpWithEmail(name, email, password) : signInWithEmail(email, password),
    )
  }

  const forgot = async () => {
    if (!email.trim()) {
      setError("비밀번호를 다시 정할 주소를 먼저 적어주세요.")
      return
    }
    const ok = await run("reset", () => resetPassword(email))
    if (ok) {
      setBusy(null)
      setNotice(`${email.trim()}로 비밀번호 재설정 메일을 보냈어요.`)
    }
  }

  const switchTo = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
    setPassword("")
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

          {/* ── 계정 ── */}
          <div className="mt-10 border-t border-rule pt-8">
            <div
              role="tablist"
              aria-label="로그인 또는 회원가입"
              className="mb-6 flex gap-6 border-b border-rule-2"
            >
              <Tab on={!signup} onClick={() => switchTo("signin")}>
                로그인
              </Tab>
              <Tab on={signup} onClick={() => switchTo("signup")}>
                회원가입
              </Tab>
            </div>

            <form onSubmit={submit} className="max-w-md space-y-4">
              {signup && (
                <Field
                  label="이름"
                  hint="첨삭과 프로필에 쓰입니다. 나중에 바꿀 수 있어요."
                >
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    maxLength={40}
                    className="w-full rounded-xl border border-field bg-transparent px-3 py-2.5 text-sm"
                  />
                </Field>
              )}

              <Field label="이메일">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  spellCheck={false}
                  className="w-full rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
                />
              </Field>

              <Field label="비밀번호" hint={signup ? "6자 이상" : undefined}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={signup ? 6 : undefined}
                  autoComplete={signup ? "new-password" : "current-password"}
                  className="w-full rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
                />
              </Field>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
                <button
                  type="submit"
                  disabled={busy !== null}
                  aria-busy={busy === "email"}
                  className="w-full bg-ink px-6 py-4 font-mono text-xs font-semibold tracking-[0.14em] text-sheet uppercase transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
                >
                  {busy === "email"
                    ? "연결 중"
                    : signup
                      ? "가입하고 시작하기"
                      : "로그인"}
                </button>
                {!signup && (
                  <button
                    type="button"
                    onClick={() => void forgot()}
                    disabled={busy !== null}
                    className="text-xs text-ink-3 underline underline-offset-4 hover:text-ink disabled:opacity-50"
                  >
                    비밀번호를 잊었어요
                  </button>
                )}
              </div>
            </form>

            {notice && (
              <p role="status" className="mt-4 max-w-md text-sm text-ink-2">
                {notice}
              </p>
            )}
            {error && (
              <div className="mt-4 max-w-md">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}

            <div className="mt-8 border-t border-rule-2 pt-6">
              <button
                onClick={() => void run("google", signInWithGoogle)}
                disabled={busy !== null}
                aria-busy={busy === "google"}
                className="w-full border border-rule px-6 py-3.5 font-mono text-xs font-semibold tracking-[0.14em] uppercase transition-colors hover:bg-paper-2 disabled:opacity-50 sm:w-auto"
              >
                {busy === "google" ? "연결 중" : "Google로 계속하기"}
              </button>
              <p className="mt-4 text-xs text-ink-3">
                일기는 내 계정에만 저장되고, API 키는 브라우저를 벗어나지 않습니다.
              </p>
            </div>

            <p className="mt-6 border-t border-rule-2 pt-5 text-sm text-ink-3">
              그냥 어떤 앱인지 보고 싶다면{" "}
              <a
                href={appUrl("/?demo=1")}
                className="font-medium text-ink underline underline-offset-4"
              >
                샘플 데이터로 둘러보기
              </a>{" "}
              — 가입도 API 키도 필요 없습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Tab({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={`-mb-px border-b-2 pb-2.5 font-mono text-xs tracking-[0.14em] uppercase transition-colors ${
        on ? "border-pen font-semibold text-ink" : "border-transparent text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="label-sm block">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
    </label>
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
      <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-pen">
        {no}
      </span>
      <p className="mt-2 font-medium">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-3">{children}</p>
    </li>
  )
}

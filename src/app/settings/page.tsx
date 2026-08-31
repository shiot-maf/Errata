"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { PageHeader } from "@/components/AppShell"
import { ErrorNote, Pill, Section } from "@/components/ui"
import { TextSizeControl, useTextSize } from "@/components/TextSizeControl"
import { ThemeControl } from "@/components/ThemeControl"
import {
  MODELS,
  clearApiKey,
  getApiKey,
  getModel,
  isKeyRemembered,
  setApiKey,
  setModel,
} from "@/lib/ai/client"
import { listEntries, listMistakes, listSaved, setWeeklyGoal } from "@/lib/firebase/db"
import { buildBackup, buildMarkdown, downloadFile } from "@/lib/export"
import { signOutUser } from "@/lib/firebase/auth"
import { toDateKey } from "@/lib/dates"

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { index: sizeIndex, set: setSize } = useTextSize()

  const [keyValue, setKeyValue] = useState("")
  const [remember, setRemember] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [model, setModelState] = useState(MODELS[0].id)
  const [status, setStatus] = useState<string | null>(null)
  const [exporting, setExporting] = useState<null | "json" | "md">(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setHasKey(!!getApiKey())
    setRemember(isKeyRemembered())
    setModelState(getModel())
  }, [])

  const saveKey = () => {
    if (!keyValue.trim()) return
    setApiKey(keyValue, remember)
    setKeyValue("")
    setHasKey(true)
    setStatus("API 키를 저장했어요.")
  }

  const dropKey = () => {
    clearApiKey()
    setHasKey(false)
    setStatus("API 키를 지웠어요.")
  }

  const exportData = async (kind: "json" | "md") => {
    if (!user) return
    setExporting(kind)
    setError(null)
    try {
      const [entries, mistakes, saved] = await Promise.all([
        listEntries(user.uid, 2000),
        listMistakes(user.uid, 5000),
        listSaved(user.uid, 2000),
      ])
      const stamp = toDateKey()
      if (kind === "json") {
        const backup = buildBackup({ profile, entries, mistakes, saved })
        downloadFile(
          `errata-${stamp}.json`,
          JSON.stringify(backup, null, 2),
          "application/json",
        )
      } else {
        downloadFile(
          `errata-${stamp}.md`,
          buildMarkdown(entries, mistakes),
          "text/markdown",
        )
      }
      setStatus("내보내기를 끝냈어요.")
    } catch (e) {
      console.error(e)
      setError("내보내기에 실패했어요. 잠시 후 다시 시도해주세요.")
    } finally {
      setExporting(null)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-8">
      <PageHeader no="01" title="설정" />

      {/* 저장·내보내기 결과는 이 한 줄로만 알려준다 — 소리로도 들려야 한다 */}
      <p role="status" className="text-sm text-ink-3 empty:hidden">
        {status}
      </p>
      {error && <ErrorNote>{error}</ErrorNote>}

      <Section
        title="Anthropic API 키"
        description="첨삭은 브라우저에서 Anthropic으로 직접 요청합니다. 키는 이 기기를 벗어나지 않고, 우리 서버에 저장되지 않습니다."
      >
        <p className="text-sm text-ink-2">
          현재 상태:{" "}
          <strong className="font-medium text-ink">
            {hasKey ? (remember ? "이 기기에 저장됨" : "이번 세션에만 저장됨") : "없음"}
          </strong>
        </p>
        <input
          type="password"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveKey()}
          aria-label="Anthropic API 키"
          placeholder={hasKey ? "새 키로 교체하려면 입력하세요" : "sk-ant-..."}
          autoComplete="off"
          spellCheck={false}
          className="w-full max-w-md rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="accent-ink"
          />
          이 기기에서 기억하기
        </label>
        <div className="flex flex-wrap gap-2">
          <Pill variant="outline" onClick={saveKey} disabled={!keyValue.trim()}>
            저장
          </Pill>
          {hasKey && (
            <Pill variant="quiet" onClick={dropKey}>
              키 지우기
            </Pill>
          )}
        </div>
      </Section>

      <Section
        title="첨삭 모델"
        description="꼼꼼함과 속도·비용의 균형을 고릅니다. 이미 받은 첨삭은 그대로 남습니다."
      >
        <select
          aria-label="첨삭 모델"
          value={model}
          onChange={(e) => {
            setModelState(e.target.value)
            setModel(e.target.value)
            setStatus("모델을 바꿨어요.")
          }}
          className="w-full max-w-md rounded-xl border border-field bg-transparent px-3 py-2.5 text-sm"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </Section>

      <Section
        title="테마"
        description="먹지는 어두운 곳에서 눈이 덜 부십니다. 기기 설정을 따르는 게 기본입니다."
      >
        <ThemeControl />
      </Section>

      <Section
        title="본문 글자 크기"
        description="일기를 쓰고 읽을 때 쓰이는 크기예요."
      >
        <TextSizeControl index={sizeIndex} onChange={setSize} />
      </Section>

      <Section title="주간 목표" description="한 주에 며칠 쓸지 정해두면 사이드바에 진행률이 표시됩니다.">
        <select
          aria-label="한 주에 쓸 일기 편수"
          value={profile?.weeklyGoal ?? 3}
          onChange={async (e) => {
            await setWeeklyGoal(user.uid, Number(e.target.value))
            await refreshProfile()
            setStatus("주간 목표를 바꿨어요.")
          }}
          className="w-full max-w-[10rem] rounded-xl border border-field bg-transparent px-3 py-2.5 text-sm"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              주 {n}편
            </option>
          ))}
        </select>
      </Section>

      <Section
        title="내 데이터"
        description="일기와 실수 기록은 내 계정에만 저장됩니다. 사본을 내려받아 두면 이 앱과 무관하게 보관할 수 있어요."
      >
        <div className="flex flex-wrap gap-2">
          <Pill
            variant="outline"
            onClick={() => exportData("json")}
            busy={exporting === "json"}
          >
            JSON 백업
          </Pill>
          <Pill
            variant="outline"
            onClick={() => exportData("md")}
            busy={exporting === "md"}
          >
            마크다운으로
          </Pill>
        </div>
        <p className="text-xs text-ink-3">
          JSON에는 일기·첨삭·실수·저장함이 모두 들어갑니다. 마크다운은 사람이 읽기 좋은
          형태예요.
        </p>
      </Section>

      <Section title="계정">
        <div>
          <p className="text-sm text-ink-2">{user.displayName ?? "이름 없음"}</p>
          <p className="text-sm text-ink-3">{user.email}</p>
          {profile && (
            <p className="tabnum mt-2 text-xs text-ink-3">
              일기 {profile.totalEntries}편 · {profile.totalWords.toLocaleString()}단어 ·
              최장 연속 {profile.longestStreak}일
            </p>
          )}
        </div>
        <Pill variant="quiet" onClick={() => signOutUser()}>
          로그아웃
        </Pill>
      </Section>
    </div>
  )
}

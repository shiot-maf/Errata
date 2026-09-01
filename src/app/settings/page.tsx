"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { PageHeader } from "@/components/AppShell"
import { ErrorNote, Pill, Section, Segmented } from "@/components/ui"
import { TextSizeControl, useTextSize } from "@/components/TextSizeControl"
import { ThemeControl } from "@/components/ThemeControl"
import {
  DEFAULT_MODEL,
  MODELS,
  clearApiKey,
  listCompatModels,
  getApiKey,
  getModel,
  getWorkspaceId,
  hasApiKey,
  isKeyRemembered,
  rememberKeyOnThisDevice,
  setApiKey,
  setModel,
  setWorkspaceId,
} from "@/lib/ai/client"
import {
  COMPAT_PRESETS,
  PROVIDER_LABEL,
  getCompatBaseUrl,
  getCompatModel,
  getProvider,
  presetFor,
  setCompatEndpoint,
  setProvider,
  type ProviderId,
} from "@/lib/ai/provider"
import { useBrowserValue } from "@/lib/browserStore"
import { listEntries, listMistakes, listSaved, setWeeklyGoal } from "@/lib/firebase/db"
import { buildBackup, buildMarkdown, downloadFile } from "@/lib/export"
import { signOutUser } from "@/lib/firebase/auth"
import { toDateKey } from "@/lib/dates"

const readWorkspace = () => getWorkspaceId() ?? ""

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { index: sizeIndex, set: setSize } = useTextSize()

  const [keyValue, setKeyValue] = useState("")
  const [workspaceValue, setWorkspaceValue] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [exporting, setExporting] = useState<null | "json" | "md">(null)
  const [error, setError] = useState<string | null>(null)

  // 셋 다 브라우저에 저장된 값이다. 정적 HTML에는 없으므로 기본값으로 그리고
  // 브라우저에서 다시 읽는다. 저장 함수가 알려주므로 화면은 알아서 따라온다.
  const hasKey = useBrowserValue(hasApiKey, false)
  const remember = useBrowserValue(isKeyRemembered, false)
  const model = useBrowserValue(getModel, DEFAULT_MODEL)
  const provider = useBrowserValue(getProvider, "anthropic" as ProviderId)
  // 원시값만 다루는 통로라서 null 대신 빈 문자열로 읽는다
  const savedWorkspace = useBrowserValue(readWorkspace, "")
  // 아직 아무것도 치지 않았으면 저장된 값을 그대로 보여준다
  const workspace = workspaceValue ?? savedWorkspace

  const saveKey = () => {
    if (!keyValue.trim()) return
    setApiKey(keyValue, remember)
    setKeyValue("")
    setStatus("API 키를 저장했어요.")
  }

  const saveWorkspace = () => {
    setWorkspaceId(workspace)
    setWorkspaceValue(null)
    setStatus(workspace.trim() ? "워크스페이스 ID를 저장했어요." : "워크스페이스 ID를 지웠어요.")
  }

  const dropKey = () => {
    clearApiKey()
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
      <PageHeader
        no="01"
        title="설정"
        meta={
          <Link href="/profile" className="hover:text-ink">
            ← 프로필
          </Link>
        }
      />

      {/* 저장·내보내기 결과는 이 한 줄로만 알려준다 — 소리로도 들려야 한다 */}
      <p role="status" className="text-sm text-ink-3 empty:hidden">
        {status}
      </p>
      {error && <ErrorNote>{error}</ErrorNote>}

      <Section
        title="첨삭 제공자"
        description="첨삭은 브라우저에서 제공자로 직접 갑니다. Anthropic은 크레딧을 충전해야 하고, OpenAI 호환 쪽은 무료 티어가 있는 곳이 많아요."
      >
        <Segmented
          label="첨삭 제공자"
          value={provider}
          onChange={(next) => {
            setProvider(next)
            setStatus(`${PROVIDER_LABEL[next]}(으)로 바꿨어요.`)
          }}
          options={[
            { value: "anthropic" as ProviderId, label: PROVIDER_LABEL.anthropic },
            { value: "compat" as ProviderId, label: PROVIDER_LABEL.compat },
          ]}
        />
        <p className="max-w-prose text-xs text-ink-3">
          첨삭 품질은 고른 모델에 달려 있어요. 이 앱은 실수마다 26개 카테고리 중
          하나를 붙이게 시키는데, 작은 모델은 그 분류를 자주 틀립니다 — 잘못 붙은
          카테고리는 그대로 통계에 쌓여서 없는 약점을 만들어냅니다.
        </p>
      </Section>

      {provider === "compat" && (
        <CompatSection onStatus={setStatus} onError={setError} remember={remember} />
      )}

      {provider === "anthropic" && (
        <>
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
            onChange={(e) => rememberKeyOnThisDevice(e.target.checked)}
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

        {/*
          계정에 매인 키(identity-linked)는 여러 워크스페이스에 걸쳐 있어서,
          이번 요청을 어느 워크스페이스 몫으로 칠지 함께 보내야 한다. 안 보내면
          400과 함께 "anthropic-workspace-id is required"가 돌아온다. 워크스페이스
          키를 쓰는 사람에게는 필요 없는 칸이라 접어둔다.
        */}
        <details className="border-t border-rule-2 pt-4" open={!!savedWorkspace}>
          <summary className="cursor-pointer text-sm text-ink-2">
            워크스페이스 ID{" "}
            <span className="text-ink-3">
              — “anthropic-workspace-id is required” 오류가 났다면
            </span>
          </summary>
          <div className="mt-3 space-y-3">
            <p className="max-w-prose text-sm text-ink-3">
              계정에 매인 키는 어느 워크스페이스로 쓸지 함께 알려줘야 합니다.
              콘솔의{" "}
              <a
                href="https://console.anthropic.com/settings/workspaces"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-ink"
              >
                Workspaces
              </a>
              에서 쓰려는 워크스페이스를 열면 주소에 <code>wrkspc_…</code>가 있어요.
              워크스페이스에 매인 키를 쓴다면 비워두세요.
            </p>
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspaceValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveWorkspace()}
              aria-label="Anthropic 워크스페이스 ID"
              placeholder="wrkspc_…"
              autoComplete="off"
              spellCheck={false}
              className="w-full max-w-md rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
            />
            <Pill variant="outline" onClick={saveWorkspace}>
              {workspace.trim() ? "저장" : "지우기"}
            </Pill>
          </div>
        </details>
      </Section>

      <Section
        title="첨삭 모델"
        description="꼼꼼함과 속도·비용의 균형을 고릅니다. 이미 받은 첨삭은 그대로 남습니다."
      >
        <select
          aria-label="첨삭 모델"
          value={model}
          onChange={(e) => {
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
        </>
      )}

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

/**
 * OpenAI 호환 제공자 설정.
 *
 * 주소·모델·키 세 가지만 있으면 Gemini(AI Studio)·Groq·OpenRouter·Cerebras·
 * Ollama가 전부 같은 코드로 돈다. 모델 이름은 자주 바뀌므로 앱이 들고 있지
 * 않고, 제공자에게 직접 물어서 고르게 한다.
 */
function CompatSection({
  remember,
  onStatus,
  onError,
}: {
  remember: boolean
  onStatus: (s: string) => void
  onError: (s: string | null) => void
}) {
  const savedBaseUrl = useBrowserValue(getCompatBaseUrl, "")
  const savedModel = useBrowserValue(getCompatModel, "")
  const hasKey = useBrowserValue(readCompatKey, false)

  const [draft, setDraft] = useState<{ baseUrl: string; model: string } | null>(null)
  const baseUrl = draft?.baseUrl ?? savedBaseUrl
  const model = draft?.model ?? savedModel
  const edit = (patch: Partial<{ baseUrl: string; model: string }>) =>
    setDraft({ baseUrl, model, ...patch })

  const [keyValue, setKeyValue] = useState("")
  const [models, setModels] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)

  const preset = presetFor(baseUrl)

  const applyPreset = (id: string) => {
    const found = COMPAT_PRESETS.find((p) => p.id === id)
    if (!found) return
    setDraft({ baseUrl: found.baseUrl, model: found.model })
    setModels(null)
    setCompatEndpoint(found.baseUrl, found.model)
    onStatus(`${found.label}(으)로 맞췄어요.`)
    // 미리 채워둔 모델 이름은 낡기 마련이다. 키가 있으면 지금 쓸 수 있는
    // 이름을 바로 물어본다 — 사용자가 404를 만난 뒤에 알게 할 이유가 없다.
    if (hasKey) void loadModels(found.baseUrl)
  }

  const saveEndpoint = () => {
    setCompatEndpoint(baseUrl, model)
    setDraft(null)
    onStatus("제공자 주소와 모델을 저장했어요.")
  }

  const saveKey = () => {
    if (!keyValue.trim()) return
    setApiKey(keyValue, remember, "compat")
    setKeyValue("")
    onStatus("제공자 키를 저장했어요.")
    if (baseUrl.trim()) void loadModels()
  }

  const loadModels = async (url = baseUrl) => {
    setLoading(true)
    onError(null)
    try {
      const list = await listCompatModels(url, getApiKey("compat") ?? "")
      setModels(list)
      onStatus(`모델 ${list.length}개를 불러왔어요.`)
    } catch (e) {
      setModels(null)
      onError(
        e instanceof Error
          ? `모델 목록을 못 불러왔어요. ${e.message}`
          : "모델 목록을 못 불러왔어요.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section
      title="제공자 설정"
      description="OpenAI 호환 엔드포인트면 무엇이든 됩니다. 아래에서 고르면 주소가 채워져요."
    >
      <select
        aria-label="제공자 고르기"
        value={preset?.id ?? ""}
        onChange={(e) => applyPreset(e.target.value)}
        className="w-full max-w-md rounded-xl border border-field bg-transparent px-3 py-2.5 text-sm"
      >
        <option value="">직접 입력</option>
        {COMPAT_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {preset && (
        <p className="max-w-prose text-xs text-ink-3">
          {preset.note}{" "}
          <a
            href={preset.keyUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            키 받기 →
          </a>
        </p>
      )}

      <label className="block">
        <span className="label-sm block">엔드포인트 주소</span>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => edit({ baseUrl: e.target.value })}
          placeholder="https://…/v1"
          autoComplete="off"
          spellCheck={false}
          className="mt-1.5 w-full max-w-md rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
        />
      </label>

      <label className="block">
        <span className="label-sm block">모델 이름</span>
        {models ? (
          <select
            value={model}
            onChange={(e) => edit({ model: e.target.value })}
            className="mt-1.5 w-full max-w-md rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
          >
            {!models.includes(model) && <option value={model}>{model}</option>}
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={model}
            onChange={(e) => edit({ model: e.target.value })}
            placeholder="gemini-2.5-flash"
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 w-full max-w-md rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
          />
        )}
      </label>

      <div className="flex flex-wrap gap-2">
        <Pill variant="outline" onClick={saveEndpoint} disabled={!baseUrl.trim() || !model.trim()}>
          주소·모델 저장
        </Pill>
        <Pill
          variant="quiet"
          onClick={() => void loadModels()}
          busy={loading}
          disabled={!baseUrl.trim() || !hasKey}
        >
          모델 목록 불러오기
        </Pill>
      </div>
      <p className="max-w-prose text-xs text-ink-3">
        {!hasKey
          ? "모델 목록을 물어보려면 키를 먼저 저장해주세요."
          : models
            ? `지금 쓸 수 있는 모델 ${models.length}개 중에서 고르는 중이에요.`
            : "위 모델 이름은 미리 채워둔 값이라 낡았을 수 있어요. 목록을 불러오면 지금 쓸 수 있는 이름만 나옵니다."}
      </p>

      <div className="border-t border-rule-2 pt-4">
        <p className="text-sm text-ink-2">
          키 상태:{" "}
          <strong className="font-medium text-ink">
            {hasKey ? (remember ? "이 기기에 저장됨" : "이번 세션에만 저장됨") : "없음"}
          </strong>
        </p>
        <input
          type="password"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveKey()}
          aria-label="제공자 API 키"
          placeholder={hasKey ? "새 키로 교체하려면 입력하세요" : "제공자에서 받은 키"}
          autoComplete="off"
          spellCheck={false}
          className="mt-3 w-full max-w-md rounded-xl border border-field bg-transparent px-3 py-2.5 font-mono text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill variant="outline" onClick={saveKey} disabled={!keyValue.trim()}>
            키 저장
          </Pill>
          {hasKey && (
            <Pill
              variant="quiet"
              onClick={() => {
                clearApiKey("compat")
                onStatus("제공자 키를 지웠어요.")
              }}
            >
              키 지우기
            </Pill>
          )}
        </div>
      </div>
    </Section>
  )
}

const readCompatKey = () => hasApiKey("compat")

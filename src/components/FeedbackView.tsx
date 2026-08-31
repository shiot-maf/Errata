"use client"

import type { Entry, Mistake } from "@/lib/types"
import { SectionTitle, Tag } from "./ui"
import { DiffText } from "./DiffText"
import { CorrectionCard } from "./CorrectionCard"
import { SaveButton } from "./SaveButton"
import { SelectionSaver } from "./SelectionSaver"
import { getCategory } from "@/lib/taxonomy"

/** 첨삭 결과 전체. 작성 화면과 기록 상세가 같은 걸 쓴다. */
export function FeedbackView({
  entry,
  mistakes,
  entryId,
}: {
  entry: Entry
  mistakes: Mistake[]
  entryId: string
}) {
  const fb = entry.feedback
  if (!fb) return null

  const byCategory = new Map<string, number>()
  for (const m of mistakes) byCategory.set(m.category, (byCategory.get(m.category) ?? 0) + 1)

  return (
    <div className="space-y-12">
      {/* 총평 + 점수 */}
      <section className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <Score label="Grammar" value={fb.scores.grammar} />
          <Score label="Vocabulary" value={fb.scores.vocabulary} />
          <Score label="Fluency" value={fb.scores.fluency} />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-rule-2 pt-6">
          <Tag quiet>{fb.level}</Tag>
          <span className="tabnum text-[11px] text-ink-3">
            {entry.wordCount} words · 교정 {fb.correctionCount}
          </span>
        </div>

        <p className="max-w-prose leading-relaxed text-ink-2">{fb.overallComment}</p>

        {fb.praise.length > 0 && (
          <ul className="space-y-2.5 border-t border-rule-2 pt-6">
            {fb.praise.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-2">
                <span className="mt-0.5 shrink-0 font-mono text-[11px] text-good">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {byCategory.size > 0 && (
        <section>
          <SectionTitle no="02">실수 분포</SectionTitle>
          <div className="flex flex-wrap gap-y-1.5">
            {[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([slug, n]) => (
                <Tag key={slug} quiet>
                  {getCategory(slug).ko} {n}
                </Tag>
              ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle no="03">교정된 일기</SectionTitle>
        <SelectionSaver
          entryId={entryId}
          dateKey={entry.dateKey}
          sourceText={fb.correctedText}
        >
          <div className="ruled border-y border-rule py-4">
            <p className="diary whitespace-pre-wrap">
              <DiffText before={entry.text} after={fb.correctedText} />
            </p>
          </div>
        </SelectionSaver>
        <p className="mt-3 text-xs text-ink-3">
          <span className="text-pen">취소선</span>은 빠진 부분,{" "}
          <span className="text-good">밑줄</span>은 새로 들어간 부분이에요.
          {" "}마음에 드는 표현을 <strong className="font-medium text-ink-2">드래그하면</strong>{" "}
          저장함에 담을 수 있어요.
        </p>
      </section>

      {mistakes.length > 0 && (
        <section>
          <SectionTitle no="04" action={`${mistakes.length} items`}>정오표</SectionTitle>
          <div>
            {mistakes.map((m, i) => (
              <CorrectionCard key={m.id} mistake={m} entryId={entryId} index={i} />
            ))}
          </div>
        </section>
      )}

      {fb.upgrades.length > 0 && (
        <section>
          <SectionTitle no="05">이렇게 쓰면 더 자연스러워요</SectionTitle>
          <div>
            {fb.upgrades.map((u, i) => (
              <div key={i} className="border-b border-rule-2 py-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px]">
                      <span className="text-ink-3">{u.original}</span>
                      <span className="mx-2 font-mono text-ink-4">→</span>
                      <span className="font-medium">{u.better}</span>
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-3">{u.note}</p>
                  </div>
                  <SaveButton
                    item={{
                      kind: "phrase",
                      sourceId: `${entryId}-upgrade-${i}`,
                      entryId,
                      dateKey: entry.dateKey,
                      front: u.original,
                      back: u.better,
                      note: u.note,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="label-sm">{label}</p>
      <p className="tabnum mt-2 text-3xl leading-none font-medium">{value}</p>
      <div className="mt-3 h-[3px] bg-rule">
        <div
          className="h-full bg-ink transition-[width] duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

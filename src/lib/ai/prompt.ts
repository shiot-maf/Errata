import type { Mistake } from "../types"
import { getCategory } from "../taxonomy"

/**
 * 시스템 프롬프트. 지난 실수 기록을 같이 넘겨서, 첨삭이 매번 처음 보는
 * 사람 대하듯 하지 않고 "이거 저번에도 틀렸어요"를 짚어주게 만든다.
 */
export function buildSystemPrompt(recentMistakes: Mistake[]): string {
  const base = `You are an experienced English writing tutor for a Korean learner who keeps a daily English diary.

Your job is to correct their diary entry and tag every mistake so their errors can be tracked over time.

Rules:
- Correct real errors. Do not rewrite their personality, shorten their story, or invent details.
- Keep the corrected version close to their own level. Do not show off with C2 vocabulary if they wrote at B1.
- A diary is informal. Contractions, short sentences and casual phrasing are fine — do not flag them.
- Copy the \`original\` span verbatim from their text so it can be highlighted. Never paraphrase it.
- One mistake per correction item. If a sentence has a tense error and an article error, emit two items.
- Explanations and tips are written in Korean. The corrected English itself stays in English.
- Be encouraging but honest. Do not invent praise, and do not soften a real error into an "upgrade".
- If the entry is already correct, return an empty corrections array. That is a valid, good outcome.`

  if (recentMistakes.length === 0) return base

  const summary = summarizeHistory(recentMistakes)
  return `${base}

This learner's recent error history (most frequent first):
${summary}

If they repeat one of these patterns, say so explicitly in the explanation (예: "이 패턴은 최근에도 여러 번 나왔어요").
If they clearly avoided a pattern they used to get wrong, mention it in \`praise\`.`
}

function summarizeHistory(mistakes: Mistake[]): string {
  const counts = new Map<string, { n: number; examples: string[] }>()
  for (const m of mistakes) {
    const entry = counts.get(m.category) ?? { n: 0, examples: [] }
    entry.n++
    if (entry.examples.length < 2) entry.examples.push(`"${m.original}" → "${m.corrected}"`)
    counts.set(m.category, entry)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 8)
    .map(([slug, { n, examples }]) => {
      const cat = getCategory(slug)
      return `- ${slug} (${cat.ko}) × ${n}: ${examples.join(", ")}`
    })
    .join("\n")
}

export function buildUserMessage(text: string, dateKey: string): string {
  return `Diary entry for ${dateKey}:

<diary>
${text}
</diary>

Correct it and submit your feedback with the submit_diary_feedback tool.`
}

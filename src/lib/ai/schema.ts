import { CATEGORIES, CATEGORY_SLUGS, SEVERITIES } from "../taxonomy"

/**
 * Claude에게 넘길 tool 정의.
 *
 * 자유 텍스트로 첨삭을 받으면 파싱이 불안정하고 무엇보다 카테고리가
 * 매번 달라져서 집계가 안 된다. tool_choice로 이 스키마를 강제하면
 * category가 항상 우리 택소노미의 slug 중 하나로 떨어진다.
 */

const categoryGuide = CATEGORIES.map((c) => `- ${c.slug} (${c.ko}): ${c.hint}`).join("\n")

export const FEEDBACK_TOOL = {
  name: "submit_diary_feedback",
  description:
    "Return structured corrections for the learner's English diary entry. " +
    "Every correction must be tagged with exactly one category slug from the fixed list.",
  input_schema: {
    type: "object" as const,
    properties: {
      correctedText: {
        type: "string",
        description:
          "The learner's whole diary rewritten so it reads naturally to a native speaker, " +
          "while keeping their voice, their facts and roughly their level. Do not add new content.",
      },
      overallComment: {
        type: "string",
        description:
          "2-4 sentences of overall feedback, written in Korean, warm and specific. " +
          "Name the single habit that would improve their writing most.",
      },
      praise: {
        type: "array",
        description:
          "1-3 specific things the learner did well, in Korean. Never empty — find something real.",
        items: { type: "string" },
      },
      level: {
        type: "string",
        description: "Estimated CEFR level of this entry.",
        enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
      },
      scores: {
        type: "object",
        description: "0-100 scores for this entry only.",
        properties: {
          grammar: { type: "number" },
          vocabulary: { type: "number" },
          fluency: { type: "number" },
        },
        required: ["grammar", "vocabulary", "fluency"],
      },
      corrections: {
        type: "array",
        description:
          "One item per actual mistake. Split combined mistakes into separate items so each " +
          "gets its own category. Skip stylistic preferences — those go in `upgrades`.",
        items: {
          type: "object",
          properties: {
            original: {
              type: "string",
              description:
                "The exact wrong span copied verbatim from the learner's text. " +
                "Keep it short — the phrase, not the whole sentence.",
            },
            corrected: { type: "string", description: "The corrected span." },
            category: {
              type: "string",
              description: `The single best-fitting category:\n${categoryGuide}`,
              enum: CATEGORY_SLUGS,
            },
            severity: {
              type: "string",
              description:
                "major = breaks meaning or is clearly wrong; moderate = noticeably unnatural; " +
                "minor = small slip a native speaker would barely notice.",
              enum: [...SEVERITIES],
            },
            explanation: {
              type: "string",
              description:
                "Why it is wrong and what the rule is, in Korean. 1-2 sentences, concrete.",
            },
            tip: {
              type: "string",
              description:
                "Optional one-line Korean memory hook so they avoid this next time.",
            },
          },
          required: ["original", "corrected", "category", "severity", "explanation"],
        },
      },
      upgrades: {
        type: "array",
        description:
          "Optional. Correct-but-plain phrases that could be said more naturally. " +
          "These are NOT mistakes and are not counted in the learner's error stats.",
        items: {
          type: "object",
          properties: {
            original: { type: "string" },
            better: { type: "string" },
            note: { type: "string", description: "Why the alternative is better, in Korean." },
          },
          required: ["original", "better", "note"],
        },
      },
    },
    required: [
      "correctedText",
      "overallComment",
      "praise",
      "level",
      "scores",
      "corrections",
      "upgrades",
    ],
  },
}

/**
 * 오류 택소노미.
 *
 * 이 앱의 핵심은 "내가 어디서 많이 틀리는지"를 데이터로 쌓는 것이다.
 * 그래서 AI가 자유 서술로 실수를 설명하게 두지 않고, 아래에 고정된 slug 중
 * 하나를 반드시 고르게 만든다(tool schema의 enum). 그래야 며칠·몇 달치를
 * 모아서 집계·비교·추이 분석이 가능해진다.
 *
 * slug는 절대 바꾸지 말 것 — 이미 저장된 문서가 이 값을 그대로 들고 있다.
 * 라벨/설명은 자유롭게 고쳐도 된다.
 */

export type CategoryGroup = "grammar" | "vocabulary" | "structure" | "mechanics"

export interface CategoryDef {
  slug: string
  group: CategoryGroup
  ko: string
  en: string
  /** AI에게 이 카테고리를 언제 쓰라고 알려주는 힌트 */
  hint: string
}

/**
 * 영역 색.
 *
 * 무지개로 칠하면 종이·먹 화면에서 혼자 시끄러워진다. 가장 큰 영역(문법)에만
 * 강조색인 빨간펜을 주고 나머지는 종이와 어울리는 낮은 채도로 내린다.
 *
 * 실제 값은 CSS 변수에 있다. 여기에 색을 박아두면 테마가 바뀌어도 따라오지
 * 못해서, 먹지 화면에서 어두운 색이 어두운 바탕에 묻힌다.
 */
export const CATEGORY_GROUPS: Record<
  CategoryGroup,
  { ko: string; color: string; bg: string }
> = {
  grammar: { ko: "문법", color: "var(--color-g-grammar)", bg: "var(--color-g-grammar-soft)" },
  vocabulary: { ko: "어휘", color: "var(--color-g-vocab)", bg: "var(--color-g-vocab-soft)" },
  structure: { ko: "문장 구조", color: "var(--color-g-structure)", bg: "var(--color-g-structure-soft)" },
  mechanics: { ko: "표기", color: "var(--color-g-mechanics)", bg: "var(--color-g-mechanics-soft)" },
}

export const CATEGORIES: CategoryDef[] = [
  // ── 문법 ──────────────────────────────────────────────
  { slug: "tense", group: "grammar", ko: "시제", en: "Tense",
    hint: "과거/현재/미래, 완료형, 진행형을 잘못 골랐을 때" },
  { slug: "agreement", group: "grammar", ko: "수 일치", en: "Subject-verb agreement",
    hint: "주어와 동사의 단복수가 어긋났을 때" },
  { slug: "article", group: "grammar", ko: "관사", en: "Articles",
    hint: "a/an/the 누락, 불필요한 관사, 잘못된 관사" },
  { slug: "preposition", group: "grammar", ko: "전치사", en: "Prepositions",
    hint: "in/on/at/for/to 등을 잘못 골랐거나 빠뜨렸을 때" },
  { slug: "plural", group: "grammar", ko: "단수/복수", en: "Singular / plural",
    hint: "셀 수 있는/없는 명사, 복수형 -s 처리" },
  { slug: "pronoun", group: "grammar", ko: "대명사", en: "Pronouns",
    hint: "it/they/this 지시 대상이 틀렸거나 격이 틀렸을 때" },
  { slug: "modal", group: "grammar", ko: "조동사", en: "Modals",
    hint: "can/should/would/must 사용이 부적절할 때" },
  { slug: "verb-form", group: "grammar", ko: "동사 형태", en: "Verb form",
    hint: "to부정사/동명사/분사 선택, 불규칙 동사 활용" },
  { slug: "voice", group: "grammar", ko: "능동/수동", en: "Active / passive",
    hint: "수동태를 써야 할 곳에 능동태를 썼거나 그 반대" },
  { slug: "conjunction", group: "grammar", ko: "접속사", en: "Conjunctions",
    hint: "and/but/because/although 등 연결어가 부적절할 때" },
  { slug: "relative-clause", group: "grammar", ko: "관계사", en: "Relative clauses",
    hint: "who/which/that 절 사용이 틀렸을 때" },
  { slug: "negation", group: "grammar", ko: "부정문", en: "Negation",
    hint: "don't/doesn't/didn't, 이중 부정 등" },
  { slug: "comparison", group: "grammar", ko: "비교급/최상급", en: "Comparatives",
    hint: "-er / more, -est / most 선택, than 구문" },

  // ── 어휘 ──────────────────────────────────────────────
  { slug: "word-choice", group: "vocabulary", ko: "단어 선택", en: "Word choice",
    hint: "뜻은 비슷하지만 문맥에 안 맞는 단어를 골랐을 때" },
  { slug: "collocation", group: "vocabulary", ko: "연어(collocation)", en: "Collocation",
    hint: "원어민이 함께 쓰지 않는 단어 조합 (예: make a homework)" },
  { slug: "konglish", group: "vocabulary", ko: "한국어식 표현", en: "Korean-style English",
    hint: "한국어를 직역해서 영어로는 어색해진 표현" },
  { slug: "register", group: "vocabulary", ko: "문체/격식", en: "Register / tone",
    hint: "일기에 비해 지나치게 딱딱하거나 지나치게 구어적일 때" },
  { slug: "phrasal-verb", group: "vocabulary", ko: "구동사", en: "Phrasal verbs",
    hint: "get up / look after 같은 구동사를 잘못 썼을 때" },

  // ── 문장 구조 ──────────────────────────────────────────
  { slug: "word-order", group: "structure", ko: "어순", en: "Word order",
    hint: "부사·형용사·목적어 위치가 영어 어순과 다를 때" },
  { slug: "run-on", group: "structure", ko: "문장 연결 오류", en: "Run-on sentence",
    hint: "두 문장을 접속사 없이 이어 붙였을 때" },
  { slug: "fragment", group: "structure", ko: "불완전한 문장", en: "Sentence fragment",
    hint: "주어나 동사가 빠져 문장이 성립하지 않을 때" },
  { slug: "wordiness", group: "structure", ko: "군더더기", en: "Wordiness",
    hint: "같은 말을 반복하거나 불필요하게 길게 썼을 때" },
  { slug: "clarity", group: "structure", ko: "모호함", en: "Clarity",
    hint: "문법은 맞지만 뜻이 분명하지 않을 때" },

  // ── 표기 ──────────────────────────────────────────────
  { slug: "spelling", group: "mechanics", ko: "철자", en: "Spelling",
    hint: "단어 철자가 틀렸을 때" },
  { slug: "punctuation", group: "mechanics", ko: "구두점", en: "Punctuation",
    hint: "쉼표/마침표/아포스트로피 사용 오류" },
  { slug: "capitalization", group: "mechanics", ko: "대소문자", en: "Capitalization",
    hint: "문장 첫 글자, 고유명사, 요일/월 이름 대소문자" },
]

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug)

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]))

const UNKNOWN: CategoryDef = {
  slug: "other",
  group: "grammar",
  ko: "기타",
  en: "Other",
  hint: "위 어느 항목에도 맞지 않을 때",
}

export function getCategory(slug: string): CategoryDef {
  return BY_SLUG.get(slug) ?? { ...UNKNOWN, slug }
}

export function categoryColor(slug: string): string {
  return CATEGORY_GROUPS[getCategory(slug).group].color
}

export function categoryBg(slug: string): string {
  return CATEGORY_GROUPS[getCategory(slug).group].bg
}

export const SEVERITIES = ["minor", "moderate", "major"] as const
export type Severity = (typeof SEVERITIES)[number]

export const SEVERITY_LABEL: Record<Severity, string> = {
  minor: "사소함",
  moderate: "보통",
  major: "중요",
}

/** 취약점 점수를 매길 때 심각도별 가중치 */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  minor: 1,
  moderate: 2,
  major: 3,
}

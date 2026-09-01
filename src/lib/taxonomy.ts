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
  /** AI에게 이 카테고리를 언제 쓰라고 알려주는 힌트 — 한 줄이어야 한다 */
  hint: string
  /**
   * 복습 화면에서 이 개념을 다시 설명하는 글.
   *
   * AI에게 매번 물어보지 않는다. 키가 없어도, 데모에서도, 비행기 안에서도
   * 복습은 돌아야 하기 때문이다. 개인화된 부분("너는 이 안에서도 특히 ~를
   * 틀린다")은 내 실수 기록에서 계산해 이 글 옆에 붙인다.
   */
  concept: string
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
    hint: "과거/현재/미래, 완료형, 진행형을 잘못 골랐을 때",
    concept:
      "일기는 이미 지나간 일을 적는 글이라 기본이 과거형이다. 한국어는 “어제 카페에 간다”처럼 현재형으로 써도 자연스럽지만 영어는 그렇지 않다. " +
      "가장 흔한 실수는 한 문단 안에서 시제가 섞이는 것 — went로 시작했으면 그 이야기가 끝날 때까지 과거형을 유지한다. 지금도 여전히 사실인 " +
      "것(I live in Seoul)만 현재형으로 남긴다." },
  { slug: "agreement", group: "grammar", ko: "수 일치", en: "Subject-verb agreement",
    hint: "주어와 동사의 단복수가 어긋났을 때",
    concept:
      "동사는 바로 앞의 단어가 아니라 진짜 주어를 따라간다. The list of items is long — 동사 앞의 items가 아니라 " +
      "list에 맞춘다. 3인칭 단수 현재의 -s는 한국어에 없는 표시라 한국어 화자가 가장 자주 빠뜨리는 자리다. everyone, " +
      "everybody, each는 뜻이 여럿이어도 단수로 받는다." },
  { slug: "article", group: "grammar", ko: "관사", en: "Articles",
    hint: "a/an/the 누락, 불필요한 관사, 잘못된 관사",
    concept:
      "a/an은 “여럿 중 하나”, the는 “너도 나도 아는 그것”이다. 한국어에 없는 구분이라 통째로 빠지거나 아무 데나 붙는다. 처음 꺼내는 " +
      "것에는 a, 이미 말한 것을 다시 가리킬 때는 the를 쓴다(I bought a book. The book was thick). 세상에 하나뿐인 " +
      "것(the sun)과 뒤에서 한정되는 것(the window of my room)도 the다." },
  { slug: "preposition", group: "grammar", ko: "전치사", en: "Prepositions",
    hint: "in/on/at/for/to 등을 잘못 골랐거나 빠뜨렸을 때",
    concept:
      "in/on/at은 크기 순서로 잡으면 대부분 맞는다 — 넓은 것에 in(in Seoul, in May), 면에 on(on the desk, " +
      "on Monday), 점에 at(at the door, at 7 p.m.). 진짜 문제는 동사가 정해둔 짝이다. arrive in, listen " +
      "to, wait for, depend on처럼 뜻이 아니라 관습으로 굳은 것들은 동사와 통째로 외운다. 한국어 조사에서 직역하면 거의 어긋난다." },
  { slug: "plural", group: "grammar", ko: "단수/복수", en: "Singular / plural",
    hint: "셀 수 있는/없는 명사, 복수형 -s 처리",
    concept:
      "영어는 셀 수 있는 것과 없는 것을 문법으로 가른다. work, information, advice, homework, furniture는 " +
      "한국어로는 셀 수 있게 느껴지지만 영어에서는 셀 수 없다 — many works가 아니라 a lot of work. 셀 수 있는 명사는 하나일 " +
      "때도 표시가 필요하다(a book). 그냥 book만 두면 문장이 성립하지 않는다." },
  { slug: "pronoun", group: "grammar", ko: "대명사", en: "Pronouns",
    hint: "it/they/this 지시 대상이 틀렸거나 격이 틀렸을 때",
    concept:
      "it이나 they를 쓰려면 그것이 가리킬 대상이 앞에 정확히 하나 있어야 한다. 한국어는 주어를 자주 생략하지만 영어는 생략할 수 없어서, " +
      "습관대로 쓰면 “무엇이”가 빠진 문장이 된다. 앞 문장에 명사가 둘이면 it이 어느 쪽인지 읽는 사람은 알 수 없다 — 그럴 때는 대명사 대신 " +
      "명사를 한 번 더 쓴다." },
  { slug: "modal", group: "grammar", ko: "조동사", en: "Modals",
    hint: "can/should/would/must 사용이 부적절할 때",
    concept:
      "can(할 수 있다) · should(하는 게 좋다) · must(해야만 한다) · would(그럴 것이다)는 세기가 다르다. 한국어의 " +
      "“~해야 한다”가 영어에서는 갈린다 — 규칙이나 의무는 must/have to, 권유나 판단은 should다. 조동사 뒤에는 언제나 동사원형이 " +
      "온다(can went는 안 된다)." },
  { slug: "verb-form", group: "grammar", ko: "동사 형태", en: "Verb form",
    hint: "to부정사/동명사/분사 선택, 불규칙 동사 활용",
    concept:
      "목적을 말할 때는 for가 아니라 to + 동사원형이다(to study). 동사마다 뒤에 오는 형태가 정해져 있어서 " +
      "enjoy·finish·avoid는 -ing를, want·decide·plan은 to를 받는다. 불규칙 동사의 과거·과거분사(go-went- " +
      "gone, take-took-taken)는 규칙이 없으니 외우는 수밖에 없다." },
  { slug: "voice", group: "grammar", ko: "능동/수동", en: "Active / passive",
    hint: "수동태를 써야 할 곳에 능동태를 썼거나 그 반대",
    concept:
      "행위자가 중요하지 않거나 모를 때 수동태를 쓴다(My bike was stolen). 한국어의 “되다·받다”를 그대로 옮기면 영어에서는 어색한 " +
      "수동이 되기 쉽다. 일기는 내가 한 일을 적는 글이라 대부분 능동이 자연스럽다 — 수동이 늘어나면 문장이 나에게서 멀어지고 무거워진다." },
  { slug: "conjunction", group: "grammar", ko: "접속사", en: "Conjunctions",
    hint: "and/but/because/although 등 연결어가 부적절할 때",
    concept:
      "and·but·so·because는 두 문장의 관계를 정하는 표지다. 한국어는 “~고, ~서”로 얼마든지 이어붙일 수 있지만 영어는 이을 " +
      "때마다 관계를 밝혀야 한다. because 뒤에는 문장이(because it was cold), because of 뒤에는 명사가(because " +
      "of the cold) 온다. although와 but은 함께 쓰지 않는다 — 하나면 충분하다." },
  { slug: "relative-clause", group: "grammar", ko: "관계사", en: "Relative clauses",
    hint: "who/which/that 절 사용이 틀렸을 때",
    concept:
      "who는 사람, which는 사물, that은 둘 다 받는다. 한국어는 “내가 어제 산 책”처럼 꾸미는 말이 앞에 오지만 영어는 뒤에 " +
      "붙는다(the book that I bought yesterday). 관계사절 안에서 목적어를 한 번 더 쓰지 않는다 — the book " +
      "that I bought it은 안 된다." },
  { slug: "negation", group: "grammar", ko: "부정문", en: "Negation",
    hint: "don't/doesn't/didn't, 이중 부정 등",
    concept:
      "일반동사의 부정은 don’t/doesn’t/didn’t + 동사원형이다 — didn’t went가 아니라 didn’t go. 시제 표시가 do " +
      "쪽으로 옮겨간다는 게 핵심이라, 뒤의 동사는 원형으로 돌아간다. 영어는 한 문장에 부정을 두 번 넣지 않는다(I didn’t see " +
      "nothing은 어색하다)." },
  { slug: "comparison", group: "grammar", ko: "비교급/최상급", en: "Comparatives",
    hint: "-er / more, -est / most 선택, than 구문",
    concept:
      "짧은 형용사는 -er/-est, 긴 형용사는 more/most를 쓴다(taller, more beautiful). 둘을 겹쳐 쓰지 않는다 — " +
      "more taller는 안 된다. 비교 대상은 than 뒤에 오고, 같은 종류끼리 견줘야 한다: The weather here is better " +
      "than Seoul이 아니라 than in Seoul이다(날씨와 도시를 비교할 수는 없다)." },

  // ── 어휘 ──────────────────────────────────────────────
  { slug: "word-choice", group: "vocabulary", ko: "단어 선택", en: "Word choice",
    hint: "뜻은 비슷하지만 문맥에 안 맞는 단어를 골랐을 때",
    concept:
      "사전이 같은 한국어 뜻을 달아줘도 영어에서 놓이는 자리는 다르다. say·tell·speak·talk는 모두 “말하다”지만 사람을 바로 " +
      "목적어로 받는 건 tell뿐이다(told me는 되고 said me는 안 된다). 새 단어는 뜻만 보지 말고 예문에서 어떤 자리에 앉는지를 같이 " +
      "본다." },
  { slug: "collocation", group: "vocabulary", ko: "연어(collocation)", en: "Collocation",
    hint: "원어민이 함께 쓰지 않는 단어 조합 (예: make a homework)",
    concept:
      "영어에는 함께 다니는 짝이 굳어 있다 — do homework(make가 아니다), take a shower, make a decision, " +
      "heavy rain. 문법적으로는 다 맞지만 원어민이 쓰지 않는 조합은 어색하게 들린다. 한국어에서 “숙제를 하다”라고 해서 do가 맞는 게 " +
      "아니라, 영어가 그냥 그렇게 굳은 것이다. 통째로 외우는 수밖에 없다." },
  { slug: "konglish", group: "vocabulary", ko: "한국어식 표현", en: "Korean-style English",
    hint: "한국어를 직역해서 영어로는 어색해진 표현",
    concept:
      "한국어 문장을 먼저 만들고 단어만 바꿔 끼우면 영어로는 뜻이 통하지 않는 문장이 된다. “기분이 좋다”를 my feeling is " +
      "good으로, “약속이 있다”를 I have a promise로 옮기는 식이다(I’m in a good mood, I have plans). " +
      "한국어에서 출발하지 말고 하려는 말의 장면을 떠올린 뒤 영어로 처음부터 짓는다." },
  { slug: "register", group: "vocabulary", ko: "문체/격식", en: "Register / tone",
    hint: "일기에 비해 지나치게 딱딱하거나 지나치게 구어적일 때",
    concept:
      "일기는 나에게 하는 말이라 구어체가 자연스럽다. I’m, don’t 같은 축약형을 써도 되고 문장이 짧아도 된다. 반대로 논문에서 쓰는 " +
      "표현(moreover, it is noteworthy that)을 일기에 넣으면 옷이 맞지 않는다. 반대 방향의 실수도 있다 — 격식이 필요한 " +
      "자리에 gonna, wanna를 쓰는 것." },
  { slug: "phrasal-verb", group: "vocabulary", ko: "구동사", en: "Phrasal verbs",
    hint: "get up / look after 같은 구동사를 잘못 썼을 때",
    concept:
      "동사에 부사나 전치사가 붙어 원래와 다른 뜻이 되는 표현이다 — give up(포기하다), look after(돌보다), put " +
      "off(미루다). 붙는 말이 바뀌면 뜻이 통째로 달라진다: look for는 찾다, look after는 돌보다, look up은 찾아보다. " +
      "일상 영어의 뼈대라 어려운 단어를 외우는 것보다 이쪽이 훨씬 자주 쓰인다." },

  // ── 문장 구조 ──────────────────────────────────────────
  { slug: "word-order", group: "structure", ko: "어순", en: "Word order",
    hint: "부사·형용사·목적어 위치가 영어 어순과 다를 때",
    concept:
      "영어는 주어-동사-목적어 순서가 곧 문법이다. 한국어는 조사가 역할을 알려주니 순서를 바꿔도 되지만, 영어는 자리가 바뀌면 뜻이 바뀐다. " +
      "빈도부사(always, often, never)는 일반동사 앞, be동사 뒤에 온다(I always go, I am always late). " +
      "형용사가 여럿일 때의 순서도 정해져 있다 — a nice big old wooden table." },
  { slug: "run-on", group: "structure", ko: "문장 연결 오류", en: "Run-on sentence",
    hint: "두 문장을 접속사 없이 이어 붙였을 때",
    concept:
      "완전한 두 문장을 쉼표 하나로 이을 수는 없다(I was tired, I went to bed). 마침표로 끊거나, 접속사를 넣거나(so I " +
      "went to bed), 세미콜론을 쓴다. 한국어는 “~고, ~서”로 끝없이 이어갈 수 있어서 그 습관이 그대로 넘어온다. 길어졌다 싶으면 끊는 " +
      "쪽이 거의 항상 낫다." },
  { slug: "fragment", group: "structure", ko: "불완전한 문장", en: "Sentence fragment",
    hint: "주어나 동사가 빠져 문장이 성립하지 않을 때",
    concept:
      "영어 문장에는 주어와 동사가 반드시 있어야 한다. Because I was tired.처럼 접속사로 시작해 끝나버리면 문장이 아니라 조각이다. " +
      "한국어는 주어를 생략해도 되지만 영어는 넣을 게 없으면 it이라도 넣는다(It was cold). -ing만으로는 동사가 되지 않는다 — I " +
      "studying이 아니라 I was studying이다." },
  { slug: "wordiness", group: "structure", ko: "군더더기", en: "Wordiness",
    hint: "같은 말을 반복하거나 불필요하게 길게 썼을 때",
    concept:
      "같은 말을 두 번 하거나 없어도 되는 말을 넣는 것이다 — in my opinion I think, return back, the reason " +
      "is because. 영어는 짧은 쪽이 대개 낫다. 다 쓰고 나서 지워도 뜻이 그대로인 단어가 있으면 지운다." },
  { slug: "clarity", group: "structure", ko: "모호함", en: "Clarity",
    hint: "문법은 맞지만 뜻이 분명하지 않을 때",
    concept:
      "문법은 맞는데 무슨 말인지 알 수 없는 문장이다. 원인은 대개 셋 중 하나다 — 대명사가 무엇을 가리키는지 모르겠거나, 한 문장에 생각이 두세 " +
      "개 들어 있거나, 꾸미는 말이 엉뚱한 곳에 붙어 있거나. 소리 내어 읽었을 때 한 번에 들어오지 않으면 문장을 나눈다." },

  // ── 표기 ──────────────────────────────────────────────
  { slug: "spelling", group: "mechanics", ko: "철자", en: "Spelling",
    hint: "단어 철자가 틀렸을 때",
    concept:
      "발음이 같아도 철자가 다른 짝이 영어에는 많다 — their/there/they’re, its/it’s, to/too/two. 맞춤법 검사기가 " +
      "잡아주지 못하는 자리라 직접 봐야 한다. -ing를 붙일 때 자음이 겹치는 규칙(stop-stopping, write-writing)도 자주 " +
      "어긋난다." },
  { slug: "punctuation", group: "mechanics", ko: "구두점", en: "Punctuation",
    hint: "쉼표/마침표/아포스트로피 사용 오류",
    concept:
      "쉼표는 숨 쉬는 자리가 아니라 문법이다. 두 문장을 이을 때는 쉼표만으로 부족하고 접속사가 함께 있어야 한다. 소유의 아포스트로피(my " +
      "friend’s book)와 축약의 아포스트로피(it’s = it is)를 구분한다 — its는 소유, it’s는 it is다. 한국어에 없는 " +
      "표시라 통째로 빠지는 일이 잦다." },
  { slug: "capitalization", group: "mechanics", ko: "대소문자", en: "Capitalization",
    hint: "문장 첫 글자, 고유명사, 요일/월 이름 대소문자",
    concept:
      "문장의 첫 글자, 사람·도시·나라 이름, 요일과 달 이름은 대문자로 시작한다(monday가 아니라 Monday). 계절(summer)과 과목 " +
      "이름(math)은 대문자로 쓰지 않는다. I는 문장 어디에 있든 언제나 대문자다." },
]

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug)

/**
 * 택소노미 밖의 자리 — 저장함에 담아둔 표현들이 여기로 모인다.
 *
 * CATEGORIES에는 넣지 않는다. 그 목록은 그대로 AI에게 주는 tool schema의
 * enum이 되기 때문에, 여기 끼워 넣으면 모델이 실수를 "담아둔 표현"으로
 * 분류할 수 있게 된다. 이름을 붙일 자리는 필요하되 분류지에는 없어야 한다.
 */
export const EXPRESSION_CATEGORY: CategoryDef = {
  slug: "saved-phrase",
  group: "vocabulary",
  ko: "담아둔 표현",
  en: "Saved expressions",
  hint: "저장함에 담아둔 표현 — AI가 고르는 값이 아니다",
  concept:
    "여기 있는 것들은 틀린 게 아니다. 뜻은 통하지만 더 자연스럽게 말할 수 있어서 " +
    "첨삭이 따로 짚어줬거나, 읽다가 마음에 들어 직접 담아둔 표현이다. " +
    "실수는 안 하려고 외우지만 이쪽은 쓰려고 외운다 — 떠올릴 수 있어야 실제로 " +
    "글에 나온다. 담아만 두고 다시 안 보면 그냥 목록일 뿐이라 여기서 같이 묻는다.",
}

const BY_SLUG = new Map([...CATEGORIES, EXPRESSION_CATEGORY].map((c) => [c.slug, c]))

const UNKNOWN: CategoryDef = {
  slug: "other",
  group: "grammar",
  ko: "기타",
  en: "Other",
  hint: "위 어느 항목에도 맞지 않을 때",
  concept:
    "택소노미에 없는 slug가 저장돼 있을 때 쓰이는 자리다. 예전 버전에서 넘어온 " +
    "값이거나 모델이 목록 밖으로 나간 경우인데, 후자는 client.ts에서 걸러진다.",
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

import type { Entry, Mistake, SavedItem, UserProfile } from "../types"
import { addDays, toDateKey } from "../dates"
import { defaultQuests } from "../game"

/**
 * 데모용 씨앗 데이터.
 *
 * 로그인도 API 키도 없이 앱 전체를 눌러볼 수 있게 하려고 만들었다.
 * 리포트가 의미 있으려면 실수가 카테고리마다 골고루, 그리고 시간에 걸쳐
 * 흩어져 있어야 해서 날짜를 오늘 기준 상대값으로 만든다.
 *
 * 실제 한국인 학습자가 자주 내는 오류 위주로 채웠다.
 */

interface SeedCorrection {
  original: string
  corrected: string
  category: string
  severity: "minor" | "moderate" | "major"
  explanation: string
  tip?: string
}

interface SeedEntry {
  /** 오늘로부터 며칠 전 */
  daysAgo: number
  text: string
  correctedText: string
  overallComment: string
  praise: string[]
  level: string
  scores: { grammar: number; vocabulary: number; fluency: number }
  corrections: SeedCorrection[]
  upgrades: { original: string; better: string; note: string }[]
}

const SEED: SeedEntry[] = [
  {
    daysAgo: 0,
    text: "Today I go to the cafe near my house. I ordered a iced americano and sit next to window. The weather was so nice that I want to walk more, but I had many works to do. I think I will finish the project until Friday.",
    correctedText:
      "Today I went to the cafe near my house. I ordered an iced americano and sat next to the window. The weather was so nice that I wanted to walk more, but I had a lot of work to do. I think I will finish the project by Friday.",
    overallComment:
      "이야기가 자연스럽게 이어지고 문장 길이도 적당해요. 다만 일기는 이미 지나간 일을 쓰는 글이라 과거형으로 시작했으면 끝까지 과거형을 유지해야 하는데, 중간중간 현재형으로 미끄러지는 게 오늘의 가장 큰 패턴이었어요.",
    praise: [
      "so ... that 구문을 정확하게 썼어요.",
      "문장을 접속사로 자연스럽게 이어붙였어요.",
    ],
    level: "B1",
    scores: { grammar: 68, vocabulary: 74, fluency: 72 },
    corrections: [
      {
        original: "Today I go to the cafe",
        corrected: "Today I went to the cafe",
        category: "tense",
        severity: "major",
        explanation:
          "일기는 이미 일어난 일을 적는 글이라 과거형을 씁니다. go의 과거형은 went예요.",
        tip: "일기를 다 쓰고 나서 동사만 훑어보며 과거형인지 확인해보세요.",
      },
      {
        original: "a iced americano",
        corrected: "an iced americano",
        category: "article",
        severity: "minor",
        explanation:
          "뒤에 오는 단어가 모음 소리(iced의 '아')로 시작하면 a가 아니라 an을 씁니다.",
      },
      {
        original: "sit next to window",
        corrected: "sat next to the window",
        category: "tense",
        severity: "moderate",
        explanation: "앞 문장과 같은 시점의 일이므로 sit이 아니라 과거형 sat입니다.",
      },
      {
        original: "next to window",
        corrected: "next to the window",
        category: "article",
        severity: "moderate",
        explanation:
          "그 카페의 특정한 창문을 가리키므로 the가 필요합니다. 한국어에는 관사가 없어서 자주 빠지는 부분이에요.",
      },
      {
        original: "I want to walk more",
        corrected: "I wanted to walk more",
        category: "tense",
        severity: "moderate",
        explanation: "날씨가 좋았던 그 순간의 마음이므로 과거형 wanted가 맞습니다.",
      },
      {
        original: "many works",
        corrected: "a lot of work",
        category: "plural",
        severity: "moderate",
        explanation:
          "work는 '일'이라는 뜻일 때 셀 수 없는 명사라 works가 되지 않습니다. a lot of work 또는 many things to do로 씁니다.",
        tip: "work, homework, advice, information은 복수형이 없다고 통째로 외워두세요.",
      },
      {
        original: "finish the project until Friday",
        corrected: "finish the project by Friday",
        category: "preposition",
        severity: "major",
        explanation:
          "until은 '그때까지 계속'이고, by는 '그때까지 완료'입니다. 끝내는 건 완료라서 by를 씁니다.",
        tip: "until = 계속, by = 마감. 마감일에는 항상 by.",
      },
    ],
    upgrades: [
      {
        original: "The weather was so nice",
        better: "It was such a nice day",
        note: "일기에서는 이 표현이 조금 더 자연스럽게 들려요.",
      },
    ],
  },
  {
    daysAgo: 2,
    text: "I met my friend Jihoon yesterday. We didn't meet for a long time so we had a lot of story. He said me that he changed his job last month. I was surprised because he liked his old company. Anyway it was fun day.",
    correctedText:
      "I met my friend Jihoon yesterday. We hadn't seen each other for a long time, so we had a lot to talk about. He told me that he had changed jobs last month. I was surprised because he liked his old company. Anyway, it was a fun day.",
    overallComment:
      "친구 이야기를 전하는 흐름이 좋아요. say와 tell을 구분하는 것만 잡으면 대화를 옮기는 문장이 훨씬 매끄러워집니다. 'a lot of story'처럼 한국어를 그대로 옮긴 표현도 눈여겨보세요.",
    praise: ["시간 표현(yesterday, last month)을 정확한 자리에 놓았어요."],
    level: "B1",
    scores: { grammar: 64, vocabulary: 66, fluency: 70 },
    corrections: [
      {
        original: "We didn't meet for a long time",
        corrected: "We hadn't seen each other for a long time",
        category: "tense",
        severity: "moderate",
        explanation:
          "만나기 전까지 이어져 온 상태이므로 과거완료가 자연스럽습니다.",
      },
      {
        original: "a lot of story",
        corrected: "a lot to talk about",
        category: "konglish",
        severity: "major",
        explanation:
          "'할 얘기가 많다'를 직역한 표현이에요. 영어로는 a lot to talk about이라고 합니다.",
      },
      {
        original: "He said me",
        corrected: "He told me",
        category: "word-choice",
        severity: "major",
        explanation:
          "say는 듣는 사람을 바로 목적어로 받지 못합니다. 사람이 오면 tell을 씁니다.",
        tip: "tell me / say to me. say 뒤에 사람이 바로 오면 틀린 거예요.",
      },
      {
        original: "he changed his job",
        corrected: "he had changed jobs",
        category: "collocation",
        severity: "moderate",
        explanation: "직장을 옮긴다는 뜻으로는 change jobs를 관용적으로 씁니다.",
      },
      {
        original: "it was fun day",
        corrected: "it was a fun day",
        category: "article",
        severity: "moderate",
        explanation: "셀 수 있는 단수 명사 앞에는 관사가 필요합니다.",
      },
      {
        original: "Anyway it was",
        corrected: "Anyway, it was",
        category: "punctuation",
        severity: "minor",
        explanation: "문장 앞의 연결 부사 뒤에는 쉼표를 찍습니다.",
      },
    ],
    upgrades: [],
  },
  {
    daysAgo: 4,
    text: "It rained all day today. I stayed at home and watched a movie which I wanted to watch it for a long time. The movie was boring than I expected. In the evening, I cooked pasta by myself. It tasted well.",
    correctedText:
      "It rained all day today. I stayed home and watched a movie that I had wanted to see for a long time. The movie was more boring than I expected. In the evening, I cooked pasta by myself. It tasted good.",
    overallComment:
      "짧고 담백한 일기인데 리듬이 좋아요. 관계대명사 뒤에 목적어를 한 번 더 쓰는 실수와 비교급 만들기, 이 두 가지가 오늘 걸렸습니다.",
    praise: ["by myself를 정확한 뜻으로 썼어요."],
    level: "B1",
    scores: { grammar: 70, vocabulary: 72, fluency: 74 },
    corrections: [
      {
        original: "a movie which I wanted to watch it",
        corrected: "a movie that I had wanted to see",
        category: "relative-clause",
        severity: "major",
        explanation:
          "관계대명사 which가 이미 목적어 역할을 하므로 뒤에 it을 또 쓰면 안 됩니다.",
        tip: "관계대명사 절 안에 목적어가 남아 있으면 지우세요.",
      },
      {
        original: "boring than I expected",
        corrected: "more boring than I expected",
        category: "comparison",
        severity: "major",
        explanation:
          "2음절 이상 형용사는 -er 대신 more를 앞에 붙여 비교급을 만듭니다.",
      },
      {
        original: "It tasted well",
        corrected: "It tasted good",
        category: "word-choice",
        severity: "moderate",
        explanation:
          "taste 같은 감각동사 뒤에는 부사(well)가 아니라 형용사(good)가 옵니다.",
        tip: "look good, sound good, taste good — 감각동사 뒤는 형용사.",
      },
      {
        original: "stayed at home",
        corrected: "stayed home",
        category: "preposition",
        severity: "minor",
        explanation: "stay home이 더 흔한 표현입니다. at은 없어도 됩니다.",
      },
    ],
    upgrades: [
      {
        original: "It rained all day today",
        better: "It rained nonstop today",
        note: "하루 종일 이어진 느낌을 조금 더 살릴 수 있어요.",
      },
    ],
  },
  {
    daysAgo: 7,
    text: "I started to go gym since last week. My goal is lose 5kg until summer. Today I ran on treadmill 30 minutes and did some weight. My whole body is painful now but I feel proud of myself.",
    correctedText:
      "I started going to the gym last week. My goal is to lose 5kg by summer. Today I ran on the treadmill for 30 minutes and did some weight training. My whole body aches now, but I feel proud of myself.",
    overallComment:
      "운동 이야기라 동사가 많이 나왔는데, 관사가 빠지는 패턴이 반복됐어요. the gym, the treadmill처럼 '그 장소의 그것'을 가리킬 때는 the가 붙습니다. by/until 구분은 지난번에도 나왔던 항목이에요.",
    praise: ["구체적인 숫자(5kg, 30 minutes)를 넣어 문장이 생생해졌어요."],
    level: "A2",
    scores: { grammar: 58, vocabulary: 62, fluency: 66 },
    corrections: [
      {
        original: "go gym",
        corrected: "go to the gym",
        category: "article",
        severity: "major",
        explanation: "go to the gym이 정해진 표현입니다. 전치사 to와 관사 the가 모두 필요해요.",
      },
      {
        original: "since last week",
        corrected: "last week",
        category: "preposition",
        severity: "moderate",
        explanation:
          "started는 한 시점에 끝난 동작이라 '~부터 계속'을 뜻하는 since와 어울리지 않습니다.",
      },
      {
        original: "My goal is lose 5kg",
        corrected: "My goal is to lose 5kg",
        category: "verb-form",
        severity: "major",
        explanation: "be동사 뒤에서 '~하는 것'을 나타내려면 to부정사를 씁니다.",
      },
      {
        original: "until summer",
        corrected: "by summer",
        category: "preposition",
        severity: "major",
        explanation:
          "목표를 달성하는 마감 시점이므로 by입니다. until은 '그때까지 계속'이에요.",
        tip: "이 패턴은 최근에도 나왔어요. 마감에는 by.",
      },
      {
        original: "on treadmill 30 minutes",
        corrected: "on the treadmill for 30 minutes",
        category: "preposition",
        severity: "moderate",
        explanation: "기간을 나타낼 때는 for가 필요합니다.",
      },
      {
        original: "did some weight",
        corrected: "did some weight training",
        category: "collocation",
        severity: "moderate",
        explanation: "근력 운동은 weight training 또는 weights라고 합니다.",
      },
      {
        original: "My whole body is painful",
        corrected: "My whole body aches",
        category: "word-choice",
        severity: "moderate",
        explanation:
          "painful은 보통 '아픔을 주는 것'에 씁니다. 몸이 쑤신다는 뜻이면 ache나 be sore가 자연스러워요.",
      },
    ],
    upgrades: [],
  },
  {
    daysAgo: 10,
    text: "My team had a meeting about new project. I prepared a lot but I was too nervous to speak well. My manager gave me a feedback that my idea is good but explanation was not clear. I agree with him. Next time I will practice more before the meeting.",
    correctedText:
      "My team had a meeting about the new project. I prepared a lot, but I was too nervous to speak well. My manager gave me feedback that my idea was good but that my explanation wasn't clear. I agree with him. Next time I'll practice more before the meeting.",
    overallComment:
      "회사 이야기를 이 정도 길이로 정리한 게 좋아요. 앞에서 한 번 언급한 대상에 the를 붙이는 습관만 들이면 문장이 훨씬 또렷해집니다.",
    praise: [
      "too ... to 구문을 정확하게 썼어요.",
      "자기 반성을 담은 마무리가 자연스러워요.",
    ],
    level: "B1",
    scores: { grammar: 74, vocabulary: 76, fluency: 78 },
    corrections: [
      {
        original: "about new project",
        corrected: "about the new project",
        category: "article",
        severity: "moderate",
        explanation: "팀이 아는 특정 프로젝트를 가리키므로 the가 필요합니다.",
      },
      {
        original: "a feedback",
        corrected: "feedback",
        category: "plural",
        severity: "moderate",
        explanation: "feedback은 셀 수 없는 명사라서 a가 붙지 않습니다.",
        tip: "advice, feedback, information — 모두 a를 붙이지 않아요.",
      },
      {
        original: "my idea is good",
        corrected: "my idea was good",
        category: "tense",
        severity: "moderate",
        explanation:
          "주절이 과거(gave)이므로 종속절도 과거로 맞춰주는 게 자연스럽습니다.",
      },
      {
        original: "explanation was not clear",
        corrected: "my explanation wasn't clear",
        category: "article",
        severity: "minor",
        explanation: "누구의 설명인지 밝혀주면 문장이 또렷해집니다.",
      },
    ],
    upgrades: [
      {
        original: "I was too nervous to speak well",
        better: "I was too nervous to get my point across",
        note: "회의 맥락에서는 이 표현이 더 구체적으로 들려요.",
      },
    ],
  },
  {
    daysAgo: 13,
    text: "I bought a new keyboard on internet. It arrived faster than I thought. The typing feeling is very satisfying. But it was more expensive than I planned, so I need to save money this month. I don't regret it.",
    correctedText:
      "I bought a new keyboard online. It arrived faster than I expected. The typing feel is very satisfying. But it was more expensive than I had planned, so I need to save money this month. I don't regret it.",
    overallComment:
      "비교급을 여러 번 정확하게 썼어요. 오늘은 실수가 적습니다. 'on internet'처럼 관사가 빠지는 습관만 계속 지켜보면 좋겠어요.",
    praise: [
      "than 비교 구문을 두 번 다 정확하게 썼어요.",
      "짧은 문장으로 감정을 분명히 전달했어요.",
    ],
    level: "B1",
    scores: { grammar: 82, vocabulary: 78, fluency: 80 },
    corrections: [
      {
        original: "on internet",
        corrected: "online",
        category: "article",
        severity: "moderate",
        explanation:
          "on the internet이라고 the를 넣거나, 더 간단하게 online이라고 씁니다.",
      },
      {
        original: "faster than I thought",
        corrected: "faster than I expected",
        category: "word-choice",
        severity: "minor",
        explanation:
          "틀린 표현은 아니지만 배송처럼 예상과 비교할 때는 expected가 더 흔합니다.",
      },
      {
        original: "The typing feeling",
        corrected: "The typing feel",
        category: "collocation",
        severity: "moderate",
        explanation:
          "키보드의 타건감은 typing feel이라고 합니다. feeling은 사람의 감정 쪽이에요.",
      },
    ],
    upgrades: [],
  },
  {
    daysAgo: 17,
    text: "Yesterday was my mother birthday. Our family went to a restaurant that we often go. My mother was very happy when she saw the cake. I gave her a scarf as present. She said she like it very much. I hope she use it this winter.",
    correctedText:
      "Yesterday was my mother's birthday. Our family went to a restaurant we often go to. My mother was very happy when she saw the cake. I gave her a scarf as a present. She said she liked it very much. I hope she uses it this winter.",
    overallComment:
      "따뜻한 일기예요. 소유격 아포스트로피와 3인칭 단수 -s, 이 두 가지가 오늘 반복됐습니다. 둘 다 규칙이 단순하니 한 번 몸에 붙으면 오래갑니다.",
    praise: ["장면이 눈에 그려질 만큼 구체적으로 썼어요."],
    level: "A2",
    scores: { grammar: 62, vocabulary: 70, fluency: 72 },
    corrections: [
      {
        original: "my mother birthday",
        corrected: "my mother's birthday",
        category: "punctuation",
        severity: "major",
        explanation: "'누구의 것'을 나타내려면 아포스트로피와 s를 붙입니다.",
      },
      {
        original: "a restaurant that we often go",
        corrected: "a restaurant we often go to",
        category: "preposition",
        severity: "moderate",
        explanation: "go to a restaurant이므로 관계절 끝에 to가 남아야 합니다.",
      },
      {
        original: "as present",
        corrected: "as a present",
        category: "article",
        severity: "moderate",
        explanation: "셀 수 있는 단수 명사이므로 a가 필요합니다.",
      },
      {
        original: "she like it",
        corrected: "she liked it",
        category: "agreement",
        severity: "major",
        explanation:
          "주어가 3인칭 단수이고 과거의 일이므로 liked입니다. 현재형이라면 likes가 되고요.",
        tip: "he/she/it 뒤의 현재형 동사에는 항상 -s를 붙이세요.",
      },
      {
        original: "I hope she use it",
        corrected: "I hope she uses it",
        category: "agreement",
        severity: "major",
        explanation: "she 뒤의 현재형 동사에는 -s가 붙습니다.",
      },
    ],
    upgrades: [],
  },
  {
    daysAgo: 21,
    text: "I have a headache today because I slept only 4 hours. I couldn't sleep because I drank coffee at 9pm. It was stupid decision. From now on I will not drink coffee after 6pm. Also I should go to bed early, but I still have many works to finish this week.",
    correctedText:
      "I have a headache today because I only slept four hours. I couldn't sleep because I'd had coffee at 9 p.m. It was a stupid decision. From now on, I won't drink coffee after 6 p.m. I should also go to bed earlier, but I still have a lot of work to finish this week.",
    overallComment:
      "원인과 결과를 because로 잘 연결했어요. 부사 위치(only, also)가 한국어 어순을 따라간 곳이 있는데, 영어에서는 자리가 꽤 정해져 있습니다. many works는 최근에도 똑같이 나온 표현이라 한 번 더 짚어둘게요.",
    praise: ["because를 두 번 자연스럽게 이어 썼어요."],
    level: "B1",
    scores: { grammar: 72, vocabulary: 70, fluency: 74 },
    corrections: [
      {
        original: "I slept only 4 hours",
        corrected: "I only slept four hours",
        category: "word-order",
        severity: "moderate",
        explanation: "only는 보통 강조하려는 동사 바로 앞에 옵니다.",
      },
      {
        original: "It was stupid decision",
        corrected: "It was a stupid decision",
        category: "article",
        severity: "moderate",
        explanation: "셀 수 있는 단수 명사 앞에는 관사가 필요합니다.",
      },
      {
        original: "Also I should go to bed early",
        corrected: "I should also go to bed earlier",
        category: "word-order",
        severity: "moderate",
        explanation:
          "also는 문장 맨 앞보다 조동사 뒤에 두는 게 훨씬 자연스럽습니다.",
        tip: "also는 be동사·조동사 뒤, 일반동사 앞.",
      },
      {
        original: "go to bed early",
        corrected: "go to bed earlier",
        category: "comparison",
        severity: "minor",
        explanation: "지금보다 더 일찍이라는 뜻이므로 비교급 earlier가 맞습니다.",
      },
      {
        original: "many works",
        corrected: "a lot of work",
        category: "plural",
        severity: "moderate",
        explanation:
          "work는 '일'이라는 뜻일 때 셀 수 없는 명사라 works가 되지 않습니다.",
        tip: "이 표현은 최근에도 똑같이 나왔어요. work는 복수형이 없다고 통째로 외워두세요.",
      },
    ],
    upgrades: [],
  },
  {
    daysAgo: 26,
    text: "I watched a documentary about ocean today. It was very impressive. I didn't know that plastic problem is so serious. After watching it, I decided to use tumbler instead of paper cup. Small action can change something.",
    correctedText:
      "I watched a documentary about the ocean today. It was very moving. I didn't know the plastic problem was so serious. After watching it, I decided to use a tumbler instead of paper cups. Small actions can change something.",
    overallComment:
      "생각의 흐름이 잘 드러나는 일기예요. impressive는 한국어 '인상적'과 쓰임이 조금 달라서 자주 어긋나는 단어입니다.",
    praise: ["After -ing 구문으로 문장을 매끄럽게 이었어요."],
    level: "B1",
    scores: { grammar: 76, vocabulary: 68, fluency: 76 },
    corrections: [
      {
        original: "about ocean",
        corrected: "about the ocean",
        category: "article",
        severity: "moderate",
        explanation: "바다처럼 세상에 하나뿐인 대상에는 the를 붙입니다.",
      },
      {
        original: "It was very impressive",
        corrected: "It was very moving",
        category: "word-choice",
        severity: "moderate",
        explanation:
          "impressive는 '대단하다'에 가깝습니다. 마음이 움직였다는 뜻이면 moving이나 touching이 맞아요.",
      },
      {
        original: "that plastic problem is",
        corrected: "the plastic problem was",
        category: "tense",
        severity: "moderate",
        explanation: "주절이 과거(didn't know)이므로 종속절도 과거로 맞춥니다.",
      },
      {
        original: "use tumbler instead of paper cup",
        corrected: "use a tumbler instead of paper cups",
        category: "plural",
        severity: "moderate",
        explanation:
          "일반적인 종이컵 전체를 가리키므로 복수형이 자연스럽습니다.",
      },
      {
        original: "Small action can change",
        corrected: "Small actions can change",
        category: "plural",
        severity: "moderate",
        explanation: "일반론을 말할 때는 복수형을 씁니다.",
      },
    ],
    upgrades: [
      {
        original: "Small actions can change something",
        better: "Small actions can add up",
        note: "'작은 행동이 쌓인다'는 뜻을 더 정확히 전달해요.",
      },
    ],
  },
  {
    daysAgo: 38,
    text: "Yesterday I go to library for study English. There are so many peoples. I sat on the corner and read a book about grammar. It was difficult but interesting. I stayed there until 3 hours.",
    correctedText:
      "Yesterday I went to the library to study English. There were so many people. I sat in the corner and read a book about grammar. It was difficult but interesting. I stayed there for three hours.",
    overallComment:
      "하루를 순서대로 잘 정리했어요. 다만 과거형, 관사, 그리고 people의 복수형이 함께 걸렸습니다. 하나씩 보면 어렵지 않은 규칙들이에요.",
    praise: ["difficult but interesting처럼 대비되는 표현을 자연스럽게 이었어요."],
    level: "A2",
    scores: { grammar: 48, vocabulary: 56, fluency: 58 },
    corrections: [
      {
        original: "I go to library",
        corrected: "I went to the library",
        category: "tense",
        severity: "major",
        explanation: "yesterday와 함께 쓰였으므로 과거형 went입니다.",
      },
      {
        original: "to library",
        corrected: "to the library",
        category: "article",
        severity: "moderate",
        explanation: "특정 장소를 가리키므로 the가 필요합니다.",
      },
      {
        original: "for study English",
        corrected: "to study English",
        category: "verb-form",
        severity: "major",
        explanation: "목적을 말할 때는 for가 아니라 to + 동사원형입니다.",
      },
      {
        original: "There are so many peoples",
        corrected: "There were so many people",
        category: "plural",
        severity: "major",
        explanation: "people 자체가 이미 복수형이라 peoples가 되지 않습니다.",
        tip: "people = 사람들. -s를 붙이지 마세요.",
      },
      {
        original: "There are",
        corrected: "There were",
        category: "tense",
        severity: "moderate",
        explanation: "과거의 일이므로 were입니다.",
      },
      {
        original: "sat on the corner",
        corrected: "sat in the corner",
        category: "preposition",
        severity: "moderate",
        explanation: "구석 '안'에 앉는 것이므로 in을 씁니다.",
      },
      {
        original: "until 3 hours",
        corrected: "for three hours",
        category: "preposition",
        severity: "major",
        explanation: "기간을 나타낼 때는 for입니다. until은 시점 앞에 씁니다.",
      },
    ],
    upgrades: [],
  },
  {
    daysAgo: 44,
    text: "Today weather is very cold. I wear thick coat and go to work by subway. Subway was crowded so I couldn't sit. When I arrive to office, my hands were freezing. I drank hot tea and I felt better.",
    correctedText:
      "The weather was very cold today. I wore a thick coat and went to work by subway. The subway was crowded, so I couldn't sit down. When I arrived at the office, my hands were freezing. I drank hot tea and felt better.",
    overallComment:
      "장면이 선명하게 그려져요. 오늘은 과거형과 관사가 반복해서 걸렸습니다. 특히 arrive 뒤의 전치사는 자주 나오는 항목이니 기억해두면 좋겠어요.",
    praise: ["When 절로 시간 관계를 분명히 표현했어요."],
    level: "A2",
    scores: { grammar: 44, vocabulary: 54, fluency: 56 },
    corrections: [
      {
        original: "Today weather is very cold",
        corrected: "The weather was very cold today",
        category: "article",
        severity: "major",
        explanation: "weather 앞에는 the가 붙고, 지난 일이므로 was입니다.",
      },
      {
        original: "I wear thick coat",
        corrected: "I wore a thick coat",
        category: "tense",
        severity: "major",
        explanation: "과거의 일이므로 wore입니다.",
      },
      {
        original: "thick coat",
        corrected: "a thick coat",
        category: "article",
        severity: "moderate",
        explanation: "셀 수 있는 단수 명사 앞에는 관사가 필요합니다.",
      },
      {
        original: "go to work",
        corrected: "went to work",
        category: "tense",
        severity: "major",
        explanation: "앞 문장과 같은 시점이므로 과거형입니다.",
      },
      {
        original: "Subway was crowded",
        corrected: "The subway was crowded",
        category: "article",
        severity: "moderate",
        explanation: "앞에서 언급한 그 지하철이므로 the를 붙입니다.",
      },
      {
        original: "I arrive to office",
        corrected: "I arrived at the office",
        category: "preposition",
        severity: "major",
        explanation:
          "arrive 뒤에는 to가 아니라 at(좁은 장소)이나 in(도시)이 옵니다.",
        tip: "arrive at the office / arrive in Seoul. arrive to는 없습니다.",
      },
    ],
    upgrades: [],
  },
  {
    daysAgo: 52,
    text: "I start writing English diary from today. My English is not good but I want to improve. I think writing everyday will help me. I don't know how long I can keep, but I will try my best.",
    correctedText:
      "I started writing an English diary today. My English isn't good, but I want to improve. I think writing every day will help me. I don't know how long I can keep it up, but I'll try my best.",
    overallComment:
      "시작하는 마음이 잘 담겼어요. from today, everyday처럼 한국어를 그대로 옮긴 표현이 몇 군데 있는데, 이런 건 몇 번만 고쳐보면 금방 손에 붙습니다.",
    praise: ["하고 싶은 말을 끝까지 밀고 나갔어요."],
    level: "A2",
    scores: { grammar: 46, vocabulary: 52, fluency: 54 },
    corrections: [
      {
        original: "I start writing",
        corrected: "I started writing",
        category: "tense",
        severity: "major",
        explanation: "이미 시작한 일이므로 과거형입니다.",
      },
      {
        original: "English diary",
        corrected: "an English diary",
        category: "article",
        severity: "moderate",
        explanation: "셀 수 있는 단수 명사 앞에는 관사가 필요합니다.",
      },
      {
        original: "from today",
        corrected: "today",
        category: "konglish",
        severity: "moderate",
        explanation:
          "'오늘부터'를 그대로 옮긴 표현이에요. 영어에서는 그냥 today라고 씁니다.",
      },
      {
        original: "writing everyday",
        corrected: "writing every day",
        category: "spelling",
        severity: "moderate",
        explanation:
          "everyday는 '일상적인'이라는 형용사이고, '매일'은 every day로 띄어 씁니다.",
        tip: "매일 = every day (띄어쓰기). everyday는 형용사.",
      },
      {
        original: "how long I can keep",
        corrected: "how long I can keep it up",
        category: "phrasal-verb",
        severity: "moderate",
        explanation: "keep은 목적어가 필요합니다. 습관을 이어간다는 뜻은 keep it up이에요.",
      },
    ],
    upgrades: [],
  },
  {
    daysAgo: 31,
    text: "I am studying English for improve my career. But sometimes I feel frustrated because my speaking is not improving. My friend told me that writing diary everyday is helpful. So I start it today. I hope I can continue.",
    correctedText:
      "I'm studying English to improve my career prospects. But sometimes I feel frustrated because my speaking isn't improving. A friend told me that writing a diary every day helps. So I started today. I hope I can keep it up.",
    overallComment:
      "첫 일기네요. 하고 싶은 말이 분명해서 읽기 좋았어요. for + 동사원형은 한국어 '~하기 위해'를 그대로 옮길 때 자주 나오는 실수인데, 영어에서는 to부정사를 씁니다.",
    praise: ["하고 싶은 말을 군더더기 없이 전달했어요."],
    level: "A2",
    scores: { grammar: 60, vocabulary: 64, fluency: 66 },
    corrections: [
      {
        original: "for improve my career",
        corrected: "to improve my career prospects",
        category: "verb-form",
        severity: "major",
        explanation:
          "'~하기 위해'는 to부정사로 씁니다. for 뒤에는 동사원형이 올 수 없어요.",
        tip: "목적을 말할 때는 to + 동사원형.",
      },
      {
        original: "writing diary everyday",
        corrected: "writing a diary every day",
        category: "article",
        severity: "moderate",
        explanation:
          "a가 필요하고, everyday(형용사)와 every day(부사구)는 다른 말입니다.",
      },
      {
        original: "is helpful",
        corrected: "helps",
        category: "wordiness",
        severity: "minor",
        explanation: "helps 한 단어로 줄이면 문장이 가벼워집니다.",
      },
      {
        original: "So I start it today",
        corrected: "So I started today",
        category: "tense",
        severity: "major",
        explanation: "이미 시작한 일이므로 과거형입니다.",
      },
      {
        original: "I can continue",
        corrected: "I can keep it up",
        category: "phrasal-verb",
        severity: "minor",
        explanation:
          "습관을 이어간다는 뜻으로는 keep it up이 더 자연스럽습니다.",
      },
    ],
    upgrades: [],
  },
]

/** 첨삭을 아직 안 받은 일기 — "첨삭 대기" 상태를 보여주려고 하나 섞는다 */
const PENDING: { daysAgo: number; text: string }[] = [
  {
    daysAgo: 1,
    text: "Short one today. Woke up early, finished the report, and finally cleaned my desk. It feels good to see empty desk.",
  },
]

/** 데모는 퀘스트가 반쯤 진행된 상태여야 화면이 심심하지 않다 */
function demoQuests() {
  const progress: Record<string, number> = {
    daily_entry: 1,
    daily_words: 46,
    weekly_days: 4,
    weekly_review: 8,
    once_flawless: 0,
    once_saved: 3,
  }
  return defaultQuests().map((q) => {
    const value = progress[q.id] ?? 0
    return { ...q, progress: value, done: value >= q.target }
  })
}

let cached: {
  profile: UserProfile
  entries: Entry[]
  mistakes: Mistake[]
  saved: SavedItem[]
} | null = null

export function demoData() {
  if (cached) return cached

  const now = Date.now()
  const entries: Entry[] = []
  const mistakes: Mistake[] = []

  SEED.forEach((seed, i) => {
    const id = `demo-entry-${i}`
    const dateKey = toDateKey(addDays(new Date(), -seed.daysAgo))
    const createdAt = now - seed.daysAgo * 86_400_000

    entries.push({
      id,
      dateKey,
      text: seed.text,
      wordCount: seed.text.trim().split(/\s+/).length,
      createdAt,
      updatedAt: createdAt,
      feedback: {
        correctedText: seed.correctedText,
        overallComment: seed.overallComment,
        praise: seed.praise,
        level: seed.level,
        scores: seed.scores,
        upgrades: seed.upgrades,
        correctionCount: seed.corrections.length,
        analyzedAt: createdAt,
        model: "demo",
      },
    })

    seed.corrections.forEach((c, j) => {
      mistakes.push({
        id: `demo-mistake-${i}-${j}`,
        entryId: id,
        dateKey,
        category: c.category,
        severity: c.severity,
        original: c.original,
        corrected: c.corrected,
        explanation: c.explanation,
        ...(c.tip ? { tip: c.tip } : {}),
        createdAt,
        reviewCount: 0,
      })
    })
  })

  PENDING.forEach((p, i) => {
    const createdAt = now - p.daysAgo * 86_400_000
    entries.push({
      id: `demo-pending-${i}`,
      dateKey: toDateKey(addDays(new Date(), -p.daysAgo)),
      text: p.text,
      wordCount: p.text.trim().split(/\s+/).length,
      createdAt,
      updatedAt: createdAt,
      feedback: null,
    })
  })

  entries.sort((a, b) => b.createdAt - a.createdAt)
  mistakes.sort((a, b) => b.createdAt - a.createdAt)

  const saved: SavedItem[] = [
    {
      id: "demo-saved-1",
      kind: "selection",
      sourceId: "demo-entry-0-sel",
      entryId: "demo-entry-0",
      dateKey: entries[0].dateKey,
      front: "so nice that I wanted to walk more",
      back: "",
      note: "The weather was so nice that I wanted to walk more, but I had a lot of work to do.",
      createdAt: now - 3_600_000,
    },
    {
      id: "demo-saved-2",
      kind: "correction",
      sourceId: "demo-mistake-0-6",
      entryId: "demo-entry-0",
      dateKey: entries[0].dateKey,
      front: "finish the project until Friday",
      back: "finish the project by Friday",
      note: "until은 '그때까지 계속'이고, by는 '그때까지 완료'입니다. 끝내는 건 완료라서 by를 씁니다.",
      category: "preposition",
      createdAt: now - 7_200_000,
    },
    {
      id: "demo-saved-3",
      kind: "phrase",
      sourceId: "demo-entry-4-upgrade-0",
      entryId: "demo-entry-4",
      dateKey: toDateKey(addDays(new Date(), -10)),
      front: "I was too nervous to speak well",
      back: "I was too nervous to get my point across",
      note: "회의 맥락에서는 이 표현이 더 구체적으로 들려요.",
      createdAt: now - 86_400_000,
    },
  ]

  const totalWords = entries.reduce((s, e) => s + e.wordCount, 0)

  cached = {
    profile: {
      uid: "demo-user",
      displayName: "데모 사용자",
      email: "demo@errata.app",
      photoURL: null,
      createdAt: now - 32 * 86_400_000,
      streak: 3,
      longestStreak: 5,
      lastEntryDate: entries[0].dateKey,
      totalEntries: entries.length,
      totalWords,
      weeklyGoal: 3,
      // 일기 14편을 쓴 사람이 도달했을 법한 상태
      level: 4,
      exp: 720,
      titles: [],
      quests: demoQuests(),
    },
    entries,
    mistakes,
    saved,
  }
  return cached
}

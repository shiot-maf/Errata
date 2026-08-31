# ERRATA

> **Write. Correct. Count.** — 틀린 것을 세어 두는 일기

영어로 일기를 쓰면 AI가 첨삭하고, **내가 반복해서 틀리는 지점을 데이터로 모아주는** 웹앱입니다.

[echodiary-eng.vercel.app](https://echodiary-eng.vercel.app)의 화면 구성과 에디토리얼 디자인
언어를 참고하되, "어디서 많이 틀리는지"를 추적하는 부분을 이 앱의 중심으로 새로 설계했습니다.

## 이 앱의 핵심

첨삭을 자유 텍스트로 받으면 며칠 뒤에 모아서 비교할 수가 없습니다. 그래서 이 앱은
AI에게 **고정된 26개 카테고리 중 하나를 반드시 고르게** 합니다
(`src/lib/taxonomy.ts`, tool schema의 `enum`으로 강제).

그 결과 실수 하나하나가 이렇게 쌓입니다:

```
diaryUsers/{uid}/mistakes/{id}
  category: "preposition"   ← 택소노미 slug (자유 텍스트 아님)
  severity: "moderate"
  original: "I arrived to Seoul"
  corrected: "I arrived in Seoul"
  explanation: "arrive는 도시 이름 앞에서 in을 씁니다."
  dateKey: "2026-08-29"
```

일기 문서 안에만 두지 않고 **평평한 컬렉션으로 따로 쌓기 때문에**, "지난 3개월 동안
전치사를 몇 번 틀렸나"를 일기를 전부 열어보지 않고 답할 수 있습니다.

## 화면

| 경로 | 하는 일 |
| --- | --- |
| `/` | 일기 작성 → 첨삭. 글자 크기 조절, 자동 임시 저장, 45ch 조판 |
| `/history` | 일기 보관함 — 목록에서 바로 펼쳐 읽기(원문/교정본 전환) |
| `/history/entry?id=` | 일기 상세 — 단어 단위 diff, 교정 목록, 재첨삭 |
| `/saved` | 저장함 — 담아둔 교정·표현을 답 가리고 떠올려보기 |
| `/report` | **취약점 리포트** — 카테고리 빈도, 30일 추이, 반복 실수, 잔디 |
| `/review` | 내 오답으로 만든 복습 퀴즈 |
| `/settings` | API 키, 모델, 글자 크기, 주간 목표, JSON·마크다운 백업 |

### 리포트가 답해주는 것

- 가장 많이 틀리는 카테고리는 무엇인가 (심각도 가중 랭킹)
- **100단어당 실수 개수** — 글이 길어져도 비교 가능한 지표
- 최근 30일 vs 그 이전 30일: 나아지는 항목 / 나빠지는 항목
  (실수 *개수*가 아니라 **100단어당 비율**로 비교합니다. 글을 더 많이 쓴 달에
  실수 개수가 느는 건 당연하고, 그건 실력이 나빠졌다는 뜻이 아니기 때문입니다.
  두 구간 중 한쪽이 100단어에 못 미치면 추이를 아예 말하지 않습니다.)
- 똑같은 표현을 2번 이상 반복해서 틀린 것
- 문법·어휘·구조·표기 중 어느 영역이 약한가

## 게이미피케이션

WriterQuest에서 정리해둔 체계를 가져왔습니다 (`src/lib/game.ts`).

- **EXP / 레벨** — `exp >= level * 300` 누적 차감식. 일기 작성·첨삭·복습 정답·표현
  저장이 EXP를 줍니다. 한 편에 몰아써서 레벨을 밀어올리지 못하도록 단어 보너스에
  상한이 있습니다.
- **퀘스트** — `daily` / `weekly` / `once` 3종. 날짜가 바뀌면 daily가, 주가 바뀌면
  weekly가 되돌아갑니다. 자정에 도는 스케줄러 대신 앱을 열 때 되돌립니다.
- **칭호** — 레벨 10·20·30·40·50·100에서 얻습니다.
- **알림** — 데이터 레이어가 화면을 직접 참조하지 않도록 `window` CustomEvent로
  던지고 `ToastHost`가 구독합니다.

원본에서 두 가지를 바꿨습니다.

- **에너지 시스템은 뺐습니다.** 6초당 1씩 닳고 30분 쿨다운으로 회복하는 구조는
  장시간 집필 세션을 전제로 한 것이라, 하루 한 편 짧게 쓰는 일기에 맞지 않습니다.
- **레벨 문턱을 `level * 1000`에서 `level * 300`으로** 낮췄습니다. 원본은 하루
  1,000자를 기준으로 잡은 값인데 영어일기는 하루 50~100단어라, 그대로 두면 한 달을
  써도 2레벨을 못 넘습니다. 공식 모양은 두고 상수만 이 앱의 규모에 맞췄습니다.

게임 상태(레벨·EXP·칭호·퀘스트)는 프로필 문서 한 곳에만 저장합니다. 크기가 작고
항상 통째로 필요해서 컬렉션을 쪼갤 이유가 없습니다.

## 디자인

"격자 데이터 노트" — 인쇄된 리포트를 화면으로 옮긴 구조입니다.

- **상자를 쌓지 않습니다.** 구획은 카드가 아니라 괘선이 나눕니다. 화면 하나가
  한 장의 지면이고, 8px 모눈 책상 위에 놓입니다.
- **색은 먹과 빨간펜 둘뿐입니다.** 교정은 원래 빨간펜으로 하는 것이고, 강조색을
  하나로 묶어두면 강조가 실제로 강조가 됩니다. 개선(초록)만 아주 작게 씁니다.
- **서체는 IBM Plex 3종**(Sans / Sans KR / Mono)을 자체 호스팅합니다. 한 가족이라
  한글과 영문이 같은 목소리를 내고, Mono는 숫자·라벨 전용입니다. CDN을 쓰지 않아
  오프라인(PWA)에서도 깨지지 않고 외부로 나가는 요청도 없습니다.
  한글은 웨이트당 500KB라 400·600 두 종만 넣습니다.
- **임의값을 쓰지 않습니다.** 간격은 4·8·12·16·24·32·48·64, 타입은
  12·14·16·18·20·24·30·36·48 에서만 고릅니다.
- 데이터는 채운 막대 대신 **끝에 눈금이 달린 자**로 그립니다. 재서 표시한
  값처럼 보이게 하려는 것입니다.

## 기술 구성

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — 잉크 한 색을 투명도로 굴리는 에디토리얼 디자인 시스템
- **Firebase** Auth(Google) + Firestore
- **Anthropic API 직접 호출** — 사용자 키를 브라우저에 두고 서버를 거치지 않음
- 의존성은 위 4개가 전부입니다. 차트·아이콘·diff 모두 직접 구현했습니다.

### 첨삭 모델

기본값은 **Claude Opus 5**(`claude-opus-5`)입니다. 설정에서 Sonnet 5나
Haiku 4.5로 바꿀 수 있습니다. 첨삭은 하루 한 번 200단어 남짓을 보는 일이라
요청이 잦지 않으므로, 기본값을 싼 쪽이 아니라 꼼꼼한 쪽에 두었습니다 —
문법을 잘못 짚으면 그게 그대로 통계에 쌓여서 없는 약점을 만들어냅니다.

모델 id는 날짜 접미사 없이 씁니다. 예전에 골라둔 모델이 목록에서 빠지면
기본값으로 되돌아갑니다(`src/lib/ai/client.ts`).

### AI 첨삭이 도는 방식

1. 최근 실수 60건을 읽어 시스템 프롬프트에 넣습니다 → "이 패턴은 저번에도 나왔어요"를
   짚어줄 수 있습니다 (`src/lib/ai/prompt.ts`)
2. `tool_choice`로 구조화된 결과를 강제합니다 (`src/lib/ai/schema.ts`)
3. 저장 전에 카테고리가 택소노미 안에 있는지 다시 검증합니다 (`src/lib/ai/client.ts`)
4. 일기 문서에 첨삭을, `mistakes`에 실수를 흩뿌립니다 (`src/lib/firebase/db.ts`)

### API 키 취급

키는 **브라우저를 벗어나지 않습니다.** 기본은 `sessionStorage`(탭을 닫으면 삭제),
"이 기기에서 기억"을 켜면 `localStorage`로 옮깁니다. 이 앱의 서버는 키를 받지도,
저장하지도 않습니다.

나중에 서버 프록시로 바꾸려면 `src/lib/ai/client.ts`의 `requestFeedback` 하나만
`/api/feedback` 호출로 갈아끼우면 됩니다. 나머지 코드는 손댈 게 없습니다.

## 데모 모드로 둘러보기

로그인도 API 키도 없이 앱 전체를 눌러볼 수 있습니다.

```
/?demo=1
```

샘플 일기 14편과 실수 69건이 메모리에만 올라가고, 새로고침하면 처음 상태로
돌아갑니다. Firebase를 아예 건드리지 않으므로 남의 기기에 흔적이 남지 않습니다.
나가려면 `/?demo=0`. 로그인 화면에도 들어가는 링크가 있습니다.

데모에서 "Correct"를 누르면 진짜 모델 대신 규칙 몇 개로만 첨삭합니다 —
흐름을 보여주기 위한 것이지 첨삭 품질을 보여주는 게 아닙니다.

## 실행

```bash
npm install
npm run dev
```

검사는 세 가지입니다.

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (flat config, eslint-config-next)
npm run build       # 정적 내보내기까지
```

환경변수 없이도 바로 뜹니다 — 이 앱 전용 Firebase 프로젝트(`diaryecho`)로
폴백합니다. 다른 프로젝트를 쓰려면 `.env.example`을 `.env.local`로 복사해 채우세요.
(웹 Firebase 설정값은 비밀이 아닙니다. 어차피 브라우저 번들에 실리고, 실제 보안은
`firestore.rules`가 담당합니다.)

첨삭을 쓰려면 [Anthropic 콘솔](https://console.anthropic.com/settings/keys)에서 키를
발급받아 설정 화면에 넣으면 됩니다.

## 배포

### GitHub Pages (설정돼 있음)

`.github/workflows/pages.yml`이 main에 푸시될 때마다 정적 내보내기를 만들어
Pages에 올립니다. 서버 코드가 하나도 없는 앱이라 정적 호스팅으로 충분합니다.

주소: <https://shiot-maf.github.io/Errata/>
데모: <https://shiot-maf.github.io/Errata/?demo=1> (로그인도 API 키도 없이 샘플 데이터로 둘러보기)

Pages는 사이트를 리포 이름 아래(`/Errata`)에 서빙하므로 빌드할 때
`NEXT_PUBLIC_BASE_PATH`를 넘깁니다. 워크플로는 이 값을 리포 이름에서 받아오므로
리포 이름이 바뀌어도 따라갑니다. 루트 도메인에 올릴 때는 비워두면 됩니다.

```bash
NEXT_PUBLIC_BASE_PATH=/Errata npm run build   # Pages
npm run build                                 # 루트 도메인
```

> **Pages 소스는 "GitHub Actions"여야 합니다.**
> Settings → Pages → Build and deployment → Source. "Deploy from a branch"로
> 두면 GitHub 내장 Jekyll 빌더가 같은 사이트에 리포 *소스*를 올리려 들고,
> 두 발행자가 같은 푸시에 경쟁해 나중에 끝난 쪽이 덮어씁니다. 그러면 앱 대신
> 이 README가 뜹니다.

### Vercel

1. Vercel에서 이 리포를 import (Root Directory는 리포 루트 그대로)
2. 빌드 설정은 기본값 그대로 (Next.js 자동 인식). `NEXT_PUBLIC_BASE_PATH`는
   비워둡니다 — 루트 도메인에 올라가니까요.
3. 배포 후 **Firebase 콘솔 → Authentication → Settings → 승인된 도메인**에
   `your-app.vercel.app`을 추가 — 안 하면 구글 로그인이 `auth/unauthorized-domain`으로
   실패합니다

### Firebase 쪽에서 한 번만 해둘 것

프로젝트는 `diaryecho`입니다. 콘솔에서 세 가지가 필요하고, 전부 브라우저에서
할 수 있습니다. 이 셋을 하기 전까지 구글 로그인은 실패합니다. 데모 모드(`?demo=1`)는
Firebase를 전혀 건드리지 않으므로 그와 무관하게 동작합니다.

1. **Authentication → Sign-in method → Google** 사용 설정
2. **Authentication → Settings → 승인된 도메인**에 배포 도메인 추가
   (`shiot-maf.github.io`, 그리고 Vercel로 옮기면 그 도메인도)
3. **Firestore Database → 규칙** 탭에 `firestore.rules` 내용을 붙여넣고 게시

3번은 CLI로도 할 수 있습니다. 이 디렉터리에 `firebase.json`과 `.firebaserc`가
있으므로 프로젝트 지정 없이 바로 됩니다.

```bash
npm i -g firebase-tools   # 처음 한 번만
firebase login            # 처음 한 번만
cd errata
firebase deploy --only firestore:rules
```

규칙을 게시하지 않으면 Firestore 기본 잠금 정책에 걸려 일기를 저장할 때
`permission-denied`가 납니다.

## 네이티브 앱으로 가는 길

PWA(매니페스트 + 서비스 워커)가 이미 들어 있어서 홈 화면에 추가하면 주소창 없이
앱처럼 뜹니다. 하단 탭 네비게이션과 `safe-area-inset` 처리도 네이티브를 염두에 두고
짰습니다.

한 걸음 더 가려면 Capacitor로 감싸는 게 가장 짧은 경로입니다. 그때 손볼 곳은:

- `next.config.ts`에 `output: "export"` (정적 내보내기)
- Google 로그인을 팝업 대신 네이티브 SDK로 (`@capacitor-firebase/authentication`)
- API 키를 OS 보안 저장소로 (`@capacitor/preferences` 또는 Keychain)

## 알려진 한계

- 아직 첨삭 결과를 되돌리는(undo) 기능이 없습니다. 재첨삭하면 그 일기의 이전 실수
  기록은 새 결과로 교체됩니다.
- JSON 백업은 내보내기만 됩니다. 복원은 아직 구현하지 않았습니다.
- 통계는 클라이언트에서 계산합니다. 일기가 수천 편을 넘어가면 서버 집계가 필요해집니다.

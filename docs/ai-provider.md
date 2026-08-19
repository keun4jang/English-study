# AI Provider

## 구조

```
src/ai/
├── provider.ts        # AIProvider 인터페이스 (evaluateAndReply, createFinalDiary, translateDiary, generateTitle)
├── schema.ts          # Zod 응답 스키마 + fallback — 문자열 임의 파싱 금지
├── builtInProvider.ts # 내장 AI (기본값) — 규칙 엔진 + 주제 사전, 외부 호출 없음
├── rules/             # 교정 규칙 파이프라인
├── topics.ts          # 대화 주제 사전
├── remoteProvider.ts  # (선택) Edge Function 경유 외부 AI — 기본 꺼짐
└── index.ts           # 환경 기반 자동 선택
```

- 기본값은 **항상 내장 AI**다. 비용 0원, 오프라인 동작, 문장이 기기 밖으로 나가지 않는다.
- 외부 AI는 `EXPO_PUBLIC_AI_ENABLED=true` **와** Supabase 구성이 모두 있을 때만 켜진다.
  둘 중 하나만으로는 절대 켜지지 않는다 (`src/ai/__tests__/costSafety.test.ts`가 이를 강제).
- 외부 AI를 켜면 그 순간부터 사용량만큼 **본인에게** 과금된다. 켜지 않으면 영원히 0원이다.
- API 키는 **Supabase Edge Function Secrets에만** 존재한다.
  클라이언트 번들에 키가 들어가는 순간 유출로 간주한다.

## 내장 AI (기본)

### 교정 — 규칙 파이프라인

```
src/ai/rules/
├── types.ts          # CorrectionRule 계약
├── engine.ts         # 규칙을 순서대로 적용 (한 문장에 여러 규칙)
├── en-tense.ts       # 시제
├── en-agreement.ts   # 수 일치 / 주어-동사
├── en-articles.ts    # 관사 a/an/the, 단수·복수
├── en-preposition.ts # 전치사
├── en-common.ts      # 한국어 사용자가 자주 만드는 오류 (to부정사, 동명사, 관용 표현)
├── en-natural.ts     # 자연스러움 다듬기
├── ja-basics.ts      # 일본어 조사·정중체·형용사
└── index.ts          # 적용 순서를 정해 합친다
```

적용 순서가 결과를 좌우한다. 문장의 뼈대(시제 → 수 일치 → 관사 → 전치사)를 먼저
바로잡은 뒤 마지막에 자연스러움을 다듬는다. 자연스러움 규칙이 먼저 돌면 아직 고쳐지지
않은 형태를 보고 잘못 매치될 수 있다.

`engine.ts`는 규칙을 적용하기 전에 **입력 보정**을 한 번 한다. 휴대폰 입력이나 음성
인식이 흘린 아포스트로피("don t" → "don't")와 혼자 쓰인 소문자 `i`를 되돌리는데, 이건
영어 실력 문제가 아니라 입력 문제라서 교정 카드에 "틀렸다"고 띄우지 않는다.

### 규칙을 추가할 때

교정 앱에서 가장 나쁜 실패는 **맞는 문장을 틀렸다고 고치는 것**이다. 사용자가 배운 것을
되돌리게 만들고 신뢰를 잃는다. 그래서 규칙은 두 방향으로 함께 검증한다:

| 테스트 | 지키는 것 |
|---|---|
| `rules/__tests__/corpus.test.ts` | 이미 맞는 문장을 건드리지 않는다 (오탐 방지) |
| `rules/__tests__/fixes.test.ts` | 자주 나오는 오류는 실제로 고친다 |

corpus 테스트가 깨지면 **문장을 예외로 빼지 말고 규칙을 좁혀야 한다.** 애매한 규칙은
넣지 않는 편이 낫다.

규칙 위생 규약:
- `pattern`에 `g` 플래그를 쓰지 않는다 (엔진이 첫 매치만 치환한다)
- `replace` 함수가 `null`을 반환하면 그 매치는 건너뛴다 (조건부 오탐 방지)
- `skipIf`로 예외 문맥을 먼저 걸러낸다
- 모든 규칙에 한국어 `explanationKo` / `reasonKo`가 있어야 한다

### 대화 — 주제 사전

`topics.ts`가 사용자 발화에서 주제를 감지해 공감과 후속 질문을 고른다.
같은 대화 안에서 이미 쓴 답변은 다시 고르지 않는다 (`usedReplies`).
주제를 못 찾으면 사용자가 쓴 핵심 단어를 인용해 되묻는다.

### 내장 AI가 못 하는 것

- **번역**: 규칙 엔진으로는 할 수 없다. 그럴듯한 가짜 번역을 넣는 대신 비워 둔다.
- 사전에 없는 주제의 깊은 맥락 대화
- 규칙에 없는 문법 오류

이건 한계이지 버그가 아니다. 비용 0원과 오프라인 동작을 위해 받아들인 트레이드오프다.

## 응답 계약 (내장/외부 공통)

내장 AI도 외부 AI와 똑같이 `aiTurnResponseSchema` / `finalDiarySchema`(Zod)로 검증을
거친다 — Provider를 바꿔도 화면 코드가 바뀌지 않게 하기 위해서다.
파싱 실패 시:

1. 5xx는 1회만 자동 재시도 (`RemoteAIProvider.invoke`)
2. 그래도 실패하면 `fallbackTurnResponse()` — 사용자 입력을 잃지 않고 일반 대화로 전환
3. `requestId`(UUID)를 `ai_request_log`에 기록해 재시도 중복 과금 방지 (409 반환)

## 외부 AI를 켰을 때의 비용 보호 (서버 재검증)

Edge Function(`supabase/functions/ai-chat/index.ts`)이 최종 방어선이다:

- `AI_ENABLED` false 또는 키 없음 → 503 (앱은 내장 AI로 degrade)
- 일일 한도(`usage_daily`) 초과 → 429
- 입력 길이 절단(`MAX_AI_INPUT_CHARACTERS`), 출력 토큰 제한(`MAX_AI_OUTPUT_TOKENS`)
- 최근 8개 메시지 + 요약만 전달 (전체 대화 히스토리 반복 전송 금지)
- 오류 응답에 키/스택 미포함

## 외부 AI 모델 교체

기본 모델은 비용 절약형(`claude-haiku-4-5-20251001`)이며 `AI_MODEL` secret으로 교체한다.
다른 LLM으로 바꾸려면 Edge Function의 `callAnthropic()`만 교체하면 된다 —
클라이언트는 응답 스키마만 지켜지면 수정이 필요 없다.

## AI 행동 원칙 (내장 규칙과 외부 시스템 프롬프트에 함께 반영)

- 사용자가 말하지 않은 사실을 지어내지 않는다 (부족하면 질문하거나 생략)
- 한 턴에 질문은 하나만, 답변은 짧게
- 교정은 비난 없이, 설명은 쉬운 한국어로
- 민감/위험 내용은 `safety.blocked`로 안전하게 처리

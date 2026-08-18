# AI Provider

## 구조

```
src/ai/
├── provider.ts       # AIProvider 인터페이스 (evaluateAndReply, createFinalDiary, translateDiary, generateTitle)
├── schema.ts         # Zod 응답 스키마 + fallback — 문자열 임의 파싱 금지
├── mockProvider.ts   # Mock (키 불필요, 규칙 기반, "Mock AI" 배지 표시)
├── remoteProvider.ts # Edge Function 경유 Anthropic 호출
└── index.ts          # 환경 기반 자동 선택
```

- `EXPO_PUBLIC_AI_ENABLED=true` + Supabase 구성 → Remote, 아니면 Mock.
- Anthropic API 키는 **Supabase Edge Function Secrets에만** 존재한다.
  클라이언트 번들에 키가 들어가는 순간 유출로 간주한다.

## 응답 계약

모든 응답은 `aiTurnResponseSchema` / `finalDiarySchema`(Zod)로 검증한다.
파싱 실패 시:

1. 5xx는 1회만 자동 재시도 (`RemoteAIProvider.invoke`)
2. 그래도 실패하면 `fallbackTurnResponse()` — 사용자 입력을 잃지 않고 일반 대화로 전환
3. `requestId`(UUID)를 `ai_request_log`에 기록해 재시도 중복 과금 방지 (409 반환)

## 비용 보호 (서버 재검증)

Edge Function(`supabase/functions/ai-chat/index.ts`)이 최종 방어선이다:

- `AI_ENABLED` false 또는 키 없음 → 503 (앱은 Mock/일반 일기 모드로 degrade)
- 일일 한도(`usage_daily`) 초과 → 429
- 입력 길이 절단(`MAX_AI_INPUT_CHARACTERS`), 출력 토큰 제한(`MAX_AI_OUTPUT_TOKENS`)
- 최근 8개 메시지 + 요약만 전달 (전체 대화 히스토리 반복 전송 금지)
- 오류 응답에 키/스택 미포함

## 모델 교체

기본 모델은 비용 절약형(`claude-haiku-4-5-20251001`)이며 `AI_MODEL` secret으로 교체한다.
다른 LLM으로 바꾸려면 Edge Function의 `callAnthropic()`만 교체하면 된다 —
클라이언트는 응답 스키마만 지켜지면 수정이 필요 없다.

## AI 행동 원칙 (시스템 프롬프트에 반영됨)

- 사용자가 말하지 않은 사실을 지어내지 않는다 (부족하면 질문하거나 생략)
- 한 턴에 질문은 하나만, 답변은 짧게
- 교정은 비난 없이, 설명은 쉬운 한국어로
- 민감/위험 내용은 `safety.blocked`로 안전하게 처리

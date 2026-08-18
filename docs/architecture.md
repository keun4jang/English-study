# 아키텍처

## 레이어 구조

```
src/
├── app/            # Expo Router 화면 (라우트 = 파일)
├── components/     # 공용 UI(ui/) + 도메인 컴포넌트(diary/)
├── config/         # 앱 브랜드/환경 설정 (appConfig.ts 한 곳에서 관리)
├── theme/          # 디자인 토큰(tokens.ts) + useTheme — 색상 하드코딩 금지
├── i18n/           # 인터페이스 문자열 (ko 기본, en/ja 확장 구조)
├── domain/         # 도메인 타입 (DiaryEntry, Conversation, …)
├── lib/            # 순수 로직 (날짜, 유사도, 사용량 제한, 사진) — 테스트 대상
├── ai/             # AI Provider Adapter
├── speech/         # TTS + STT Adapter
├── state/          # zustand 스토어 (영속: AsyncStorage)
└── supabase/       # (루트) 마이그레이션 + Edge Functions
```

## Provider Adapter 패턴 (교체 지점)

외부 서비스는 모두 인터페이스 뒤에 숨겨 교체 가능하게 한다.

| Adapter | 인터페이스 | 현재 구현 | 교체 예시 |
|---|---|---|---|
| AI | `src/ai/provider.ts` `AIProvider` | `MockAIProvider` / `RemoteAIProvider`(Edge Function 경유 Anthropic) | 다른 LLM 서버 함수 |
| STT | `src/speech/stt/types.ts` `SpeechRecognitionAdapter` | Web Speech API / Unsupported(fallback) | Dev Build용 네이티브 STT |
| TTS | `src/speech/tts.ts` | expo-speech (기기 내장) | 클라우드 TTS(비용 발생 주의) |
| 저장소 | `src/state/storage.ts` | AsyncStorage (zustand persist) | Supabase 동기화 계층 (Phase 2) |
| 사진 저장 | `diary_photos.storage_path` | (Phase 2) Supabase Storage | Cloudflare R2 등 |

`getAIProvider()`는 환경변수(`EXPO_PUBLIC_AI_ENABLED` + Supabase 구성 여부)로
Mock/Remote를 자동 선택한다. 개발 환경에서는 키 없이 Mock으로 전체 앱이 동작한다.

## 데이터 흐름 (AI 대화 → 일기)

1. 사용자 입력(텍스트/음성→STT) → `checkAiTurnAllowed()` 클라이언트 한도 확인
2. `AIProvider.evaluateAndReply()` → Zod 스키마 검증 (`src/ai/schema.ts`)
3. 교정 카드 표시 (severity + 교정 타이밍 설정에 따라)
4. "다시 말하기" → `matchSpokenSentence()` 목표 문장 일치도 판정
5. 대화 종료 → `createFinalDiary()` → 사용자 미리보기/승인 → `useDiary.createEntry()`

## Phase 2 동기화 설계

- 화면은 zustand 스토어 인터페이스만 사용하므로, Supabase 동기화는 스토어 내부
  (또는 미들웨어)에 추가한다. 오프라인 우선: 로컬 저장 → 백그라운드 push → 충돌 시
  사용자 선택.
- `updatedAt` 비교로 last-write-wins + 충돌 알림 구조를 권장.

## 상태 관리 주의사항 (zustand v5)

selector가 매 렌더마다 **새 배열/객체를 반환하면 무한 렌더 루프**가 발생한다.
`useStore((s) => s.items.filter(...))` 금지 — 원본을 select하고 `useMemo`로 파생할 것.

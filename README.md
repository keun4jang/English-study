# 📖 Mellow Diary

> AI 친구와 대화하며 완성하는 감성 영어·일본어 일기 앱

오늘 있었던 일을 배우고 싶은 언어로 말하거나 쓰면, AI 친구가 자연스럽게 대화해 주고,
틀린 표현을 부담스럽지 않게 고쳐 주며, 마지막에는 오늘의 대화가 하나의 예쁜 외국어
일기로 완성됩니다.

**현재 버전: v0.1.0** (Phase 1 MVP — Mock AI로 전체 흐름 동작)

## 주요 기능

- 💬 **AI 대화로 일기 쓰기** — 다정한 AI 친구와 티키타카 대화 (현재 Mock AI, Anthropic 연결 구조 완비)
- ✏️ **부담 없는 교정** — 내가 말한 문장 / 자연스러운 문장 / 쉬운 한국어 설명 / 핵심 표현
- 🎙️ **다시 말하기 연습** — 교정 문장을 듣고 따라 말하면 목표 문장 일치도로 확인 (참고용 지표)
- 🔊 **기기 TTS** — 영어/일본어 음성 재생, 속도 조절, 천천히 듣기 (비용 0원)
- 💌 **최종 일기 완성** — 쉬운/자연스러운/원문 버전 중 선택, 반드시 사용자 승인 후 저장
- 📅 **달력·타임라인·검색** — 감정 아이콘, 하루 여러 일기, 즐겨찾기
- 📚 **단어장 + 간격 반복 복습**, 📊 학습 통계
- 🔒 **개인정보 우선** — 일기 기본 비공개, 음성 원본 미저장, 사진 EXIF 위치 정보 제거

## 기술 스택

- **앱**: Expo SDK 57 · React Native 0.86 · Expo Router · TypeScript(strict) · Zustand · Zod
- **음성**: expo-speech(TTS), Web Speech API(STT, 브라우저) + 플랫폼 Adapter
- **백엔드(Phase 2)**: Supabase (Auth / PostgreSQL + RLS / Storage / Edge Functions)
- **AI**: Provider Adapter 패턴 — MockAIProvider(기본) ↔ Anthropic Claude(서버 경유)

## 빠른 시작 (키 없이 실행 가능)

```bash
npm install
npm run web       # 브라우저에서 실행 (STT 포함 전체 체험 가능)
npm start         # Expo Go (Android/iOS) — 네이티브 STT는 미지원, 텍스트 입력 fallback
```

API 키나 Supabase 없이 **Demo 모드 + Mock AI**로 모든 화면과 흐름이 동작합니다.
로그인 화면에서 "Demo 모드로 시작하기"를 누르세요.

### 검증 명령어

```bash
npm run typecheck   # TypeScript 검사
npm run lint        # ESLint
npm test            # 단위 테스트 (39개)
npm run build:web   # Web/PWA 정적 빌드 (dist/)
```

## 환경변수

`.env.example`를 `.env`로 복사해 사용하세요. **`.env`는 Git에 커밋되지 않습니다.**

| 변수 | 위치 | 설명 |
|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | 클라이언트 | development / preview / production |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 | Supabase 연결 (없으면 Demo 모드) |
| `EXPO_PUBLIC_AI_ENABLED` | 클라이언트 | true면 서버 경유 실제 AI 사용 |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | Edge Function Secrets에만. 클라이언트 금지 ⚠️ |
| `ANTHROPIC_API_KEY` | **서버 전용** | Edge Function Secrets에만. 클라이언트 금지 ⚠️ |
| `EXPO_PUBLIC_DAILY_AI_TURN_LIMIT` 등 | 양쪽 | 사용량 제한 (서버에서 재검증) |

## Supabase 연결 (Phase 2)

1. [supabase.com](https://supabase.com)에서 무료 프로젝트 생성 (**결제 수단 등록 불필요**)
2. `supabase link --project-ref <ref>` 후 마이그레이션 적용: `supabase db push`
   - `supabase/migrations/0001_init.sql` — 테이블/인덱스
   - `supabase/migrations/0002_rls.sql` — RLS 정책 (필수!)
3. Storage에서 **private** 버킷 `diary-photos` 생성
4. Edge Function 배포:
   ```bash
   supabase functions deploy ai-chat
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... AI_ENABLED=true
   ```
5. `.env`에 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` 설정

### Google / Apple 로그인

- Google: Supabase Dashboard → Authentication → Providers → Google에서 OAuth 클라이언트 ID 설정
- Apple: Apple 개발자 계정(유료, 연 $99) 필요 — 계정 준비 후 Supabase Apple Provider 설정
- 설정 전에는 앱에서 "설정 필요" 안내가 표시되고 Demo 모드를 사용할 수 있습니다.

## 💰 비용에 대한 정직한 안내

- **Claude Code 구독과 Anthropic API 비용은 별개입니다.** 앱의 AI 기능은 Anthropic API를
  사용하며, 사용량(토큰)에 따라 과금됩니다. Claude Code 구독으로 앱의 API 호출이 무료가
  되지 않습니다.
- MVP/친구 테스트 단계에서는 Anthropic API 외 비용이 발생하지 않도록 설계했습니다:
  - Supabase Free Plan (결제 수단 불필요), 기기 TTS/STT (무료), 로컬 알림 (무료)
  - 무료 한도 초과 시 자동 결제 구조 없음 — 한도 도달 전 기능 제한으로 전환
- **"완전 무료로 1만 명이 무제한 AI 대화와 사진 저장"은 현실적으로 불가능합니다.**
  단계별 병목과 비용 예상은 [docs/scaling.md](docs/scaling.md)를 참고하세요.
  실제 비용은 각 서비스의 공식 가격표에서 반드시 확인해야 합니다.
- 비용 보호 장치: 일일 AI 대화 20턴 / 일기 완성 3회 (기본값, 환경변수로 조절),
  입력 2,000자 제한, idempotency key로 중복 과금 방지, `AI_ENABLED` 스위치.

## 📱 내 폰에 설치하기 (PWA)

push할 때마다 GitHub Actions가 자동으로 빌드해 `gh-pages` 브랜치로 배포합니다.

1. **최초 1회만**: GitHub 저장소 → **Settings → Pages** → "Build and deployment"에서
   Source: **Deploy from a branch**, Branch: **gh-pages** / `/(root)` 선택 → Save
   (GitHub 정책상 이 첫 활성화만은 저장소 주인이 직접 눌러야 해요)
2. 1~2분 뒤 폰 브라우저에서 열기: **https://keun4jang.github.io/English-study/**
3. 홈 화면에 추가:
   - **Android (Chrome)**: 메뉴(⋮) → "홈 화면에 추가" 또는 "앱 설치"
   - **iPhone (Safari)**: 공유 버튼(□↑) → "홈 화면에 추가"

### 🔄 재설치 없는 업데이트

새 버전을 push하면 배포가 끝난 뒤 앱 안에서 자동으로 알려줍니다:

- 오늘 홈에 **"새 버전 vX.X.X이 준비됐어요 — 업데이트가 필요해요!"** 배너 표시
- **"지금 업데이트"** 버튼 한 번이면 재설치 없이 새 버전으로 갱신 (서비스 워커 교체 + 새로고침)
- 설정 → 지원 → **"업데이트 확인"**으로 언제든 수동 확인 가능
- 일기 데이터는 기기에 저장되므로 업데이트해도 유지됩니다

## 친구 테스트

우선순위: **① Web/PWA 링크(위 주소 공유) → ② Android APK → ③ Expo Dev Build → ④ TestFlight(Apple 계정 준비 후)**

- iPhone 친구에게는 우선 PWA를 권장합니다. Apple 개발자 계정 없이 여러 친구에게
  네이티브 앱을 지속 배포하는 것은 불가능합니다.
- 자세한 방법: [docs/friend-testing.md](docs/friend-testing.md)

## 문서

- [docs/architecture.md](docs/architecture.md) — 구조와 Adapter 패턴
- [docs/database.md](docs/database.md) — DB 스키마
- [docs/rls.md](docs/rls.md) — RLS 정책과 테스트 시나리오
- [docs/ai-provider.md](docs/ai-provider.md) — AI Provider 교체 방법
- [docs/speech.md](docs/speech.md) — TTS/STT 플랫폼 지원 현황
- [docs/scaling.md](docs/scaling.md) — 100명/1,000명/10,000명 병목 분석
- [docs/friend-testing.md](docs/friend-testing.md) — 친구 테스트 가이드
- [docs/privacy-checklist.md](docs/privacy-checklist.md) — 개인정보 체크리스트
- [docs/store-release-checklist.md](docs/store-release-checklist.md) — 스토어 출시 체크리스트

## 알려진 제한 (v0.1.0)

- **네이티브(Expo Go) 음성 인식 미지원** — Web 브라우저에서는 동작, 네이티브는 텍스트 입력
  fallback. Development Build + 네이티브 STT 모듈로 추후 지원 (docs/speech.md)
- 친구 공유/댓글은 UI 구조와 DB/RLS만 준비됨 (Phase 3에서 활성화)
- Demo 모드 데이터는 이 기기에만 저장됨 (Supabase 연결 후 계정 동기화)
- Mock AI는 제한된 규칙 기반 교정만 제공 (실제 품질은 Anthropic 연결 후)
- 종단간 암호화 미제공 — AI 교정 사용 시 텍스트가 서버/AI 제공자에 전송될 수 있음을
  앱 내에 고지함

## 버전 관리

- 요청된 변경이 완료될 때마다 `npm run version:patch` (0.1.0 → 0.1.1)
- 큰 기능 추가: `npm run version:minor`, 정식 출시: `npm run version:major`
- package.json / app.json / 앱 하단 footer / CHANGELOG.md가 함께 관리됩니다.

# 📖 D-log

> 말한 하루가 외국어 일기가 되는 데일리 로그

브이로그가 하루를 영상으로 남기듯, D-log는 하루를 **영어·일본어 문장**으로 남깁니다.

오늘 있었던 일을 배우고 싶은 언어로 말하거나 쓰면, AI 친구가 자연스럽게 대화해 주고,
틀린 표현을 부담스럽지 않게 고쳐 주며, 마지막에는 오늘의 대화가 하나의 예쁜 외국어
일기로 완성됩니다.

**현재 버전: v0.7.x** · 외부 서비스 없이 기기 안에서 완전히 동작합니다 (영구 무료)

## 주요 기능

- 💬 **AI 대화로 일기 쓰기** — 기기 안의 내장 AI와 티키타카 대화 (인터넷 없이도 동작)
- ✏️ **부담 없는 교정** — 시제·수 일치·관사·전치사·자연스러움을 한 문장에서 함께 봐 주고,
  쉬운 한국어로 이유를 설명해요 (맞는 문장은 건드리지 않습니다)
- 🎙️ **다시 말하기 연습** — 교정 문장을 듣고 따라 말하면 목표 문장 일치도로 확인 (참고용 지표)
- 🔊 **기기 TTS** — 영어/일본어 음성 재생, 속도 조절, 천천히 듣기 (비용 0원)
- 💌 **최종 일기 완성** — 쉬운/자연스러운/원문 버전 중 선택, 반드시 사용자 승인 후 저장
- 📅 **달력·타임라인·검색** — 감정 아이콘, 하루 여러 일기, 즐겨찾기
- 📚 **단어장 퀴즈 복습** (간격 반복) · 🎯 하루 목표 · 🔁 다시 말해보기 연습 · 📊 기록 잔디
- 🔒 **개인정보 우선** — 일기 기본 비공개, 음성 원본 미저장, 사진 EXIF 위치 정보 제거

## 기술 스택

- **앱**: Expo SDK 57 · React Native 0.86 · Expo Router · TypeScript(strict) · Zustand · Zod
- **폰트**: SUIT(한국어·UI) + Lora(영어 일기) — 둘 다 SIL OFL 1.1, 앱에 번들(런타임 CDN 호출 없음)
- **음성**: expo-speech(TTS), Web Speech API(STT, 브라우저) + 플랫폼 Adapter
- **백엔드(Phase 2)**: Supabase (Auth / PostgreSQL + RLS / Storage / Edge Functions)
- **AI**: 내장 규칙 엔진(`src/ai/rules/`) + 주제 사전(`src/ai/topics.ts`) — 외부 API 호출 없음.
  Provider Adapter라 나중에 외부 AI로 교체 가능(선택, 기본 꺼짐)

## 빠른 시작 (키 없이 실행 가능)

```bash
npm install
npm run web       # 브라우저에서 실행 (STT 포함 전체 체험 가능)
npm start         # Expo Go (Android/iOS) — 네이티브 STT는 미지원, 텍스트 입력 fallback
```

API 키도, 서버도, 계정도 필요 없습니다. 로그인 화면에서 "Demo 모드로 시작하기"를 누르면
모든 기능이 바로 동작합니다.

### 검증 명령어

```bash
npm run typecheck   # TypeScript 검사
npm run lint        # ESLint
npm test            # 단위 테스트
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

## 💰 비용 정책 — 영구 무료 (0원)

이 앱은 **어떤 상황에서도 비용이 발생하지 않도록** 설계되어 있습니다. "무료 한도를 넘으면
과금" 되는 구조 자체를 만들지 않았습니다.

| 기능 | 어떻게 동작하나 | 비용 |
|---|---|---|
| AI 대화·교정 | **내장 AI** — 기기 안에서 도는 규칙 엔진 (`src/ai/rules/`) | 0원, 오프라인 가능 |
| 일기 공유 | 기기의 공유 시트(카톡·메모 등)로 내보내기 | 0원, 서버 없음 |
| 음성 듣기(TTS) | 기기 내장 음성 합성 (expo-speech) | 0원 |
| 음성 인식(STT) | 브라우저/기기 내장 인식 | 0원 |
| 일기 저장 | 기기 로컬 저장 (AsyncStorage) | 0원 |
| 앱 배포·업데이트 | GitHub Pages (공개 저장소 무료) | 0원 |
| 사진 | 기기에 저장, 업로드 없음 | 0원 |

- 가입한 유료 서비스, 등록된 결제 수단, 무료 체험 후 자동 과금되는 항목이 **하나도 없습니다.**
- 서버가 없으므로 사용자가 늘어도 비용이 늘지 않습니다. 트래픽 한도를 넘겨 앱이 멈추는
  일도 없습니다.
- 데이터가 기기에만 있으므로 **설정 → 계정 → 백업 내보내기**로 직접 백업하고, 새 기기에서
  **백업 가져오기**로 복원하세요.

### 외부 AI를 쓰고 싶다면 (선택 사항, 기본 꺼짐)

`src/ai/remoteProvider.ts`와 `supabase/functions/ai-chat`에 Anthropic 연동 코드가 준비되어
있지만 **기본값이 완전히 비활성**이고, 배포 파이프라인도 관련 환경변수를 설정하지 않습니다.
켜려면 본인이 직접 API 키를 발급하고 `EXPO_PUBLIC_AI_ENABLED=true`를 설정해야 하며, 그
순간부터 사용량만큼 **본인에게** 과금됩니다. 켜지 않으면 영원히 0원입니다.

> Claude Code 구독과 Anthropic API 요금은 별개입니다. 구독이 있어도 앱의 API 호출은 무료가
> 되지 않습니다.

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

## 알려진 제한

- **네이티브(Expo Go) 음성 인식 미지원** — Web 브라우저에서는 동작, 네이티브는 텍스트 입력
  fallback. Development Build + 네이티브 STT 모듈로 추후 지원 (docs/speech.md)
- 앱 안의 친구 목록/댓글은 서버가 필요해 활성화하지 않았습니다 (DB 스키마·RLS만 준비됨).
  대신 일기 상세 → 더보기 → **일기 공유하기**로 카톡·메모 등에 내보낼 수 있습니다
- 데이터는 기기에만 저장됩니다 — 기기 변경 전 백업 내보내기가 필요합니다
- 내장 AI는 규칙 기반이라 자주 나오는 오류 패턴 위주로 교정합니다. 모든 문장을
  사람처럼 이해하지는 못합니다 (그 대신 비용이 0원이고 오프라인에서 동작합니다)
- **한국어 번역은 제공하지 않습니다** — 규칙 엔진으로는 번역을 할 수 없어서, 그럴듯한
  가짜 번역을 넣는 대신 비워 둡니다. AI가 해 주는 교정 설명은 한국어로 나옵니다.
- 종단간 암호화는 제공하지 않습니다 (기기 저장이라 외부 전송은 없습니다)

## 버전 관리

- 요청된 변경이 완료될 때마다 `npm run version:patch` (0.1.0 → 0.1.1)
- 큰 기능 추가: `npm run version:minor`, 정식 출시: `npm run version:major`
- package.json / app.json / 앱 하단 footer / CHANGELOG.md가 함께 관리됩니다.

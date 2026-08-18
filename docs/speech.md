# 음성 기능 (TTS / STT)

## TTS — 기기 내장 음성 합성 (expo-speech)

- 비용 0원, 오프라인 동작(기기 음성 설치 시)
- 언어 코드: 영어 `en-US`, 일본어 `ja-JP` (BCP 47)
- 속도: 느리게 0.7 / 보통 0.95 / 빠르게 1.2, 천천히 듣기 0.55
- 긴 문장은 문장 단위 분할 재생 (`splitIntoChunks`)
- 중복 재생 방지: 새 재생 전 `Speech.stop()`, 화면 이탈 시 정지
- `getVoicesForLanguage()`로 언어별 기기 음성 필터링
- **iOS 주의**: 무음 모드(측면 스위치)에서는 소리가 나지 않을 수 있음 — 앱에서 안내 필요

## STT — 플랫폼별 지원 현황 (정직한 상태)

| 플랫폼 | 지원 | 구현 |
|---|---|---|
| Web (Chrome/Edge/Safari 일부) | ✅ | `WebSpeechAdapter` (Web Speech API, 무료) |
| Expo Go (Android/iOS) | ❌ | `UnsupportedSttAdapter` → 텍스트 입력 fallback |
| Development Build | 🔜 | 네이티브 STT 모듈(예: `@react-native-voice/voice` 또는 `expo-speech-recognition`)을 `src/speech/stt/index.ts`에 어댑터로 등록 |

**Expo Go에서 음성 인식이 되지 않는 것은 정상입니다.** Expo Go는 커스텀 네이티브
모듈을 실행할 수 없습니다. 친구 테스트에서 음성 기능을 쓰려면:

1. **Web/PWA 링크 사용 (권장)** — 브라우저 STT로 전체 흐름 체험 가능
2. Development Build 생성 후 네이티브 STT 어댑터 추가:
   ```bash
   npx expo run:android   # 또는 eas build --profile development
   ```

## 발음 평가에 대한 정직한 원칙

- 음소 단위 전문 평가가 없으므로 **"발음 점수"라고 표시하지 않는다.**
- 대신 "목표 문장 일치도"(문자열 유사도 60% + 핵심 단어 포함률 40%)를 **참고용 지표**로 표시.
- STT confidence가 제공되지 않는 플랫폼에서 가짜 confidence를 만들지 않는다
  (`SttResult.confidence`는 optional — 실제 제공 시에만 존재).

## 비교 정규화 규칙 (`src/lib/textSimilarity.ts`)

- 대소문자/구두점 무시, 다중 공백 정리
- 영어 축약형 정규화 (I'm ↔ I am 등 24종)
- 일본어는 공백 차이 무시, 핵심어는 2-gram 포함률로 판정
- 통과 임계값은 설정에서 조절 (너그럽게 0.6 / 보통 0.75 / 엄격 0.85)
- 실패 시에도 "틀렸다" 대신 "한 번만 더 천천히 말해볼까요?" — 건너뛰기 항상 제공

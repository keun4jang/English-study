# Changelog

Mellow Diary의 모든 주요 변경 사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고,
버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

<!-- next-version -->

## [0.1.2] - 2026-08-18

### 추가

- Mock AI가 사용자 발화의 키워드(더위, 피곤함, 영상, 음식, 친구, 일/공부, 감정, 날씨 등)를
  인식해 관련된 공감·질문으로 답변 (고정 로테이션 제거)
- 주제 미감지 시 사용자의 핵심 단어를 인용해 질문하는 fallback
- 교정 규칙 추가: 주어 없는 형용사 시작 문장 ("so tired because very hot" →
  "I'm so tired because it's very hot.")

### 수정

- TTS가 이모지를 소리 내어 읽는 문제 수정 — 음성 재생 전 이모지/기호 제거
  (예: "Hi! 😊" 재생 시 "smiling face"를 읽지 않음)

## [0.1.1] - 2026-08-18

### 추가

- PWA 설치 지원: manifest.json, 앱 아이콘(180/192/512), 서비스 워커(오프라인 shell)
- 앱 내 업데이트 확인: 새 버전이 배포되면 오늘 홈에 "업데이트가 필요해요" 배너 자동 표시
- 설정 → 지원에 "업데이트 확인" 버튼 (현재/최신 버전 비교, 즉시 업데이트)
- Web/PWA는 재설치 없이 버튼 한 번으로 업데이트 (서비스 워커 갱신 + 새로고침)
- GitHub Pages 자동 배포 워크플로 (push 시 lint/test/build 후 배포)
- 빌드 후처리 스크립트: version.json 생성, SW 버전 치환, SPA 404 처리

### 변경

- build:web 스크립트가 PWA 후처리를 포함하도록 변경
- app.config.js 도입 (GitHub Pages 하위 경로 배포용 baseUrl 환경변수 지원)

## [0.1.0] - 2026-08-18

### 추가

- 프로젝트 초기화 (Expo SDK 57, TypeScript strict, Expo Router)
- 감성 디자인 시스템: 테마 토큰(크림/라벤더/로즈/세이지), 다크모드, 시스템 테마 연동, 폰트 확대
- 온보딩: 닉네임, 학습 언어(영어/일본어), 실력, 목적, 교정 강도/타이밍, 말하기 속도
- Demo 로그인 (계정 없이 로컬 저장 체험) + Google/Apple/이메일 로그인 구조(설정 필요 안내)
- 오늘 홈: 오늘의 질문, 연속 작성일, 작성 중 임시 저장 복구, 복습 알림
- 직접 일기 쓰기: 자동 임시 저장, 감정/태그, 사진 추가(압축 + EXIF 위치 정보 제거), 글자 수 제한
- Mock AI 대화: 티키타카 대화, 교정 카드(원문/교정문/한국어 설명/핵심 표현), 교정 타이밍 설정 반영
- 교정 문장 다시 말하기: STT(Web Speech API) + 텍스트 fallback, 목표 문장 일치도(참고용 지표)
- 기기 TTS(expo-speech): 영어/일본어, 속도 조절, 천천히 듣기, 문장 분할 재생
- 대화 → 최종 일기 완성: 제목 후보, 쉬운/자연스러운/원문/직접 수정 버전 선택, 사용자 승인 후 저장
- 달력(감정 표시, 월 이동, 하루 여러 일기), 타임라인, 일기 상세/수정, 검색(debounce), 즐겨찾기
- 단어장 + 간단한 간격 반복 복습, 학습 통계(측정 가능한 값만)
- 휴지통(soft delete + 보관 기간), 데이터 내보내기(JSON), 계정/데이터 삭제
- 세분화된 설정: 계정/학습/음성/일기/디자인/알림/개인정보/개발
- AI 사용량 제한(일일 대화 20턴, 일기 완성 3회 기본값, 환경변수로 조절) 및 한도 초과 시 안내
- AI Provider Adapter (Mock / Anthropic 서버 경유) + Zod 응답 스키마 검증 + fallback
- Supabase 마이그레이션(23개 테이블) + 전체 RLS 정책 + Storage 정책
- Anthropic Edge Function (서버 전용 키, 사용량 재검증, idempotency)
- 버전 관리 스크립트(version:patch/minor/major), 앱 하단 버전 표시
- 단위 테스트 39개 (문장 정규화/유사도, 날짜/시간대, 사용량 제한, AI 스키마, Mock Provider)

### 보안

- API 키 클라이언트 노출 금지 구조 (.env.example 문서화)
- 일기 기본 비공개, 음성 원본 기본 미저장, 사진 EXIF 제거
- RLS: 본인 데이터만 접근, 공유/차단/댓글 권한 정책

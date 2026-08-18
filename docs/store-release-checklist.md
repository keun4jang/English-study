# 스토어 출시 체크리스트 (1.0.0 목표)

## 공통

- [ ] 앱 이름/아이콘/스플래시 확정 (`src/config/appConfig.ts` + `app.json` + assets 교체)
- [ ] 개인정보 처리방침 URL 준비 (양 스토어 필수)
- [ ] 연령 등급 설문 (일기+UGC 공유 기능 → 소셜 기능 항목 체크 필요)
- [ ] docs/privacy-checklist.md의 "출시 전 필수" 완료
- [ ] 실제 AI 연결 상태에서 E2E 테스트 통과
- [ ] 접근성 점검: 스크린리더 주요 흐름, 대비, 폰트 확대, 44px 터치 영역
- [ ] 오프라인/저속 네트워크 시나리오 점검
- [ ] 신고/차단 기능 동작 (UGC 앱 심사 요건)

## Google Play

- [ ] Play Console 개발자 계정 ($25 1회)
- [ ] AAB 빌드: `eas build --platform android --profile production`
- [ ] 서명키 백업 (분실 시 업데이트 불가)
- [ ] 데이터 보안 섹션 작성 (수집: 일기 텍스트/사진/이메일, AI 전송 고지)
- [ ] 내부 테스트 → 비공개 테스트 → 프로덕션 단계 배포

## App Store

- [ ] Apple 개발자 계정 ($99/년)
- [ ] `eas build --platform ios` → TestFlight 검증
- [ ] App Privacy 라벨 작성
- [ ] 심사 노트에 Demo 계정 정보 제공
- [ ] 마이크/음성인식/사진 권한 문구(app.json infoPlist) 심사 기준 확인

## 출시 직전

- [ ] `npm run version:major` (1.0.0) + CHANGELOG 작성
- [ ] AI 일일 한도 프로덕션 값 확정 (비용 시뮬레이션 후)
- [ ] Supabase 유료 플랜 전환 여부 판단 (docs/scaling.md)
- [ ] 크래시/오류 모니터링 도입 (Sentry 무료 티어 등 — 일기 내용 전송 금지 설정)

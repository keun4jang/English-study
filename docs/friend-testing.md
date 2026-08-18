# 친구 테스트 가이드

Apple 개발자 계정 없이도 친구들과 테스트할 수 있는 방법, 우선순위 순.

## 1. Web/PWA 링크 (가장 쉬움, iPhone 포함 전원 가능) ✅

```bash
npm run build:web        # dist/ 생성
```

`dist/`를 무료 정적 호스팅에 올리고 링크를 공유한다. 예:

- **Cloudflare Pages** (무료, 결제 수단 불필요): `npx wrangler pages deploy dist`
- **GitHub Pages**: dist를 gh-pages 브랜치로 push
- **Netlify Drop**: 드래그&드롭

친구 안내:

- 브라우저(Chrome/Safari)에서 링크 열기 → "홈 화면에 추가"로 앱처럼 사용
- **마이크(음성 입력)는 Chrome/Edge에서 가장 잘 동작.** iOS Safari는 버전에 따라
  음성 인식이 제한될 수 있음 — 안 되면 텍스트 입력으로 자동 전환됨
- 데이터는 각자 기기(브라우저)에 저장됨 — 브라우저 데이터 삭제 시 일기도 삭제됨을 안내

## 2. Android APK

```bash
# 로컬 빌드 (Android Studio/SDK 필요)
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

- **서명키(.jks)는 절대 Git에 올리지 않는다** (.gitignore에 이미 포함)
- APK 전달 시 안내: "출처를 알 수 없는 앱 설치" 허용이 필요하며,
  신뢰하는 사람에게 직접 받은 파일만 설치할 것
- 업데이트: 새 APK를 같은 서명키로 빌드해 덮어 설치

## 3. Expo Development Build (음성 인식 네이티브 테스트용)

```bash
npx expo run:android          # 또는 eas build --profile development
```

네이티브 STT 어댑터를 추가한 뒤에는 이 방식으로만 음성 인식 테스트 가능 (Expo Go 불가).

## 4. iPhone — 정직한 안내

- **Apple 개발자 계정 없이 여러 친구에게 네이티브 앱을 지속 배포할 수 없다.**
  (무료 계정의 사이드로드는 7일 만료 + 기기 제한)
- 초기에는 **PWA(방법 1)를 권장**한다.
- Apple 개발자 계정($99/년) 준비 후: `eas build --platform ios` → App Store Connect →
  TestFlight 내부 테스터 초대 (최대 100명, 심사 불필요)

## 테스트 체크리스트

- [ ] 온보딩 완료 → Demo 로그인
- [ ] 오늘 홈에서 "영어로 이야기하기" → Mock AI와 3턴 이상 대화
- [ ] `I go cafe with my friend yesterday.` 입력 → 교정 카드 확인
- [ ] "다시 말하기" (Web은 마이크, 그 외 텍스트 입력) → 성공 표시
- [ ] "대화 마치고 일기 만들기" → 버전 선택 → 저장
- [ ] 달력에서 오늘 일기 확인, 상세에서 듣기(🔊) 동작
- [ ] 직접 쓰기 → 사진 추가 → 저장
- [ ] 설정에서 다크모드/글자 크기 변경
- [ ] 앱 하단 버전 표시 확인 (예: Mellow Diary v0.1.0)

## 버그 제보

- 설정 → 지원 → "의견 보내기" (이메일 앱 열림)
- 또는 GitHub Issues에 다음 포함: 기기/브라우저, 앱 버전(하단 표시), 재현 절차, 스크린샷

## 개인정보 주의

- 테스트 중에도 실제 개인정보(주소, 전화번호 등)는 일기에 쓰지 않도록 안내
- Demo 모드 데이터는 각 기기에만 저장되며 서버로 전송되지 않음
- 테스트 데이터 초기화: 설정 → 계정 → "계정 및 데이터 삭제"

## 새 버전 확인

- 하단 버전 표기가 바뀌었는지 확인 (PWA는 새로고침 2회 또는 재설치)

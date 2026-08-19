# 번들 폰트

## SUIT (한국어 UI)

- 출처: https://github.com/sun-typeface/SUIT — **공식 저장소** (계정 `sun-typeface`)
  릴리스: `SUIT-woff2.zip` (파일 날짜 2024-06-29)
- 라이선스: SIL Open Font License 1.1 (`LICENSE-SUIT.txt`) — 상업적 사용·번들·재배포 가능
- Reserved Font Name: **SUIT**. 글리프를 수정하거나 서브셋을 만들면 다른 이름을 써야 한다.
  지금은 **원본 그대로** 쓰므로 family name도 `SUIT`를 유지한다.
- 포함한 웨이트: Regular(400) / SemiBold(600) / Bold(700) — 합계 498 KiB
  (앱이 실제로 쓰는 세 개만. 나머지 6개 웨이트는 넣지 않았다)

> ⚠️ `sunn-us/SUIT`는 공식 저장소가 아니다. 폰트 파일이 없고 CSS 안에 외부 추적
> 픽셀만 들어 있다. 폰트를 갱신할 때 반드시 `sun-typeface`인지 확인할 것.

## Gaegu (개구 — 감정 문구 전용 손글씨)

- 출처: https://github.com/google/fonts/tree/main/ofl/gaegu (디자이너: JIKJI SOFT)
- 라이선스: SIL Open Font License 1.1 (`LICENSE-Gaegu.txt`) — 상업적 사용·번들·수정·재배포 가능
- Reserved Font Name: **없음**. 저작권 표기가 "Copyright 2018 The Gaegu Project Authors"뿐이라
  RFN 조항이 걸리지 않으므로, 서브셋을 만들어도 family name `Gaegu`를 그대로 쓸 수 있다.
- 포함한 웨이트: Regular(400) / Bold(700) — 서브셋 후 합계 약 131 KiB
  (원본 전체는 woff2로도 Regular 290KB / Bold 485KB다)

### 서브셋

앱 소스(`src/**/*.ts(x)`)에 실제로 등장하는 한글 음절만 남겼다. 재생성:

```bash
pip install fonttools brotli
python3 scripts/subset-hand-font.py <Gaegu 원본 ttf 폴더>
```

**이 폰트는 고정 문구에만 쓴다** — 닉네임·일기 본문 같은 사용자 입력에는 쓰지 않는다.
서브셋에 없는 글자는 브라우저가 그 한 글자만 SUIT로 떨어뜨려 한 단어 안에서 글씨체가
섞이기 때문이다. `src/theme/__tests__/handFontCharset.test.ts`가 소스의 한글이 전부
서브셋 안에 있는지 감시한다.

## Lora (영어 일기 본문)

`@expo-google-fonts/lora` npm 패키지로 번들한다 (SIL OFL 1.1). 400Regular / 600SemiBold만 사용.

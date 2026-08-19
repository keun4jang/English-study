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

## Lora (영어 일기 본문)

`@expo-google-fonts/lora` npm 패키지로 번들한다 (SIL OFL 1.1). 400Regular / 600SemiBold만 사용.

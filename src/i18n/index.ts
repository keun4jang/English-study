import { ko, TranslationShape } from './ko';

/**
 * i18n 구조 — 앱 인터페이스 언어.
 * 현재는 한국어가 기본이며, 영어/일본어 UI 번역을 추가하려면
 * en.ts / ja.ts 파일을 만들어 아래 맵에 등록하면 된다.
 * (화면 문자열은 점진적으로 이 모듈로 이전 중)
 */

export type UiLocale = 'ko' | 'en' | 'ja';

const translations: Record<UiLocale, TranslationShape> = {
  ko,
  // 영어/일본어 UI 번역 파일을 추가하면 여기 등록한다. 미번역 시 한국어로 fallback.
  en: ko,
  ja: ko,
};

let currentLocale: UiLocale = 'ko';

export function setLocale(locale: UiLocale): void {
  currentLocale = locale;
}

export function getLocale(): UiLocale {
  return currentLocale;
}

/** 사용 예: t().common.save */
export function t(): TranslationShape {
  return translations[currentLocale];
}

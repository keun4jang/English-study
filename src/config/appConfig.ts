import Constants from 'expo-constants';

/**
 * 앱 브랜드/기본 설정을 한 곳에서 관리한다.
 * 이름, 설명, 컬러를 바꾸려면 이 파일과 theme/tokens.ts만 수정하면 된다.
 */
export const appConfig = {
  /** 앱 표시 이름 */
  appName: 'D-log',
  /** 짧은 설명 (스토어/온보딩용) */
  tagline: '말한 하루가 외국어 일기가 되는 데일리 로그',
  /** 앱 버전 — app.json(expo.version)과 package.json에서 동기화됨 */
  version: Constants.expoConfig?.version ?? '0.0.0',
  /** GitHub 저장소 (버그 제보 링크) */
  repositoryUrl: 'https://github.com/keun4jang/English-study',
  /**
   * 업데이트 확인용 배포 주소 (version.json 위치).
   * Web/PWA에서는 상대 경로를 쓰므로 이 값은 네이티브(APK)에서만 사용된다.
   * EXPO_PUBLIC_UPDATE_URL 환경변수로 재정의 가능.
   */
  defaultUpdateUrl: 'https://keun4jang.github.io/English-study',
} as const;

export type AppEnv = 'development' | 'preview' | 'production';

export function getAppEnv(): AppEnv {
  const env = process.env.EXPO_PUBLIC_APP_ENV;
  if (env === 'production' || env === 'preview') return env;
  return 'development';
}

/** 실제 백엔드(Supabase)가 구성되어 있는지 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * 실제 AI(서버 경유 Anthropic)가 활성화되어 있는지.
 * 키가 없거나 비활성화 상태면 Mock AI Provider가 사용된다.
 * (Anthropic API Key는 절대 클라이언트에 넣지 않는다 — 서버/Edge Function 전용)
 */
export function isRemoteAiEnabled(): boolean {
  return process.env.EXPO_PUBLIC_AI_ENABLED === 'true' && isSupabaseConfigured();
}

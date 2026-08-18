import Constants from 'expo-constants';

/**
 * 앱 브랜드/기본 설정을 한 곳에서 관리한다.
 * 이름, 설명, 컬러를 바꾸려면 이 파일과 theme/tokens.ts만 수정하면 된다.
 */
export const appConfig = {
  /** 앱 표시 이름 */
  appName: 'Mellow Diary',
  /** 짧은 설명 (스토어/온보딩용) */
  tagline: 'AI 친구와 대화하며 완성하는 외국어 일기',
  /** 앱 버전 — app.json(expo.version)과 package.json에서 동기화됨 */
  version: Constants.expoConfig?.version ?? '0.0.0',
  /** 피드백 수신 이메일 (의견 보내기 메뉴에서 사용) */
  feedbackEmail: 'feedback@example.com',
  /** GitHub 저장소 (버그 제보 링크) */
  repositoryUrl: 'https://github.com/keun4jang/english-study',
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

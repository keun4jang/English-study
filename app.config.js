/**
 * 동적 Expo 설정 — app.json을 기반으로 환경에 따라 일부만 재정의한다.
 *
 * EXPO_WEB_BASE_URL: GitHub Pages처럼 하위 경로(/English-study)에 배포할 때
 * 자산 경로 프리픽스를 지정한다 (CI에서만 설정, 로컬 빌드는 루트 기준).
 */
module.exports = ({ config }) => {
  if (process.env.EXPO_WEB_BASE_URL) {
    config.experiments = {
      ...config.experiments,
      baseUrl: process.env.EXPO_WEB_BASE_URL,
    };
  }
  return config;
};

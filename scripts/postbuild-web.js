#!/usr/bin/env node
/**
 * 웹 빌드 후처리 — PWA 구성 요소를 dist/에 주입한다.
 * `npm run build:web`이 expo export 후 자동 실행한다.
 *
 * 하는 일:
 * 1. dist/version.json 생성 (앱 내 업데이트 확인용)
 * 2. dist/sw.js의 __APP_VERSION__을 실제 버전으로 치환 (캐시 무효화 트리거)
 * 3. dist/index.html에 manifest/아이콘/테마 태그 + 서비스 워커 등록 스크립트 주입
 *
 * (public/ 폴더는 expo export가 dist/로 자동 복사한다)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;

if (!fs.existsSync(dist)) {
  console.error('dist/가 없습니다. 먼저 expo export --platform web을 실행하세요.');
  process.exit(1);
}

// 1. version.json — 앱 내 업데이트 확인 API
fs.writeFileSync(
  path.join(dist, 'version.json'),
  JSON.stringify(
    {
      version,
      builtAt: new Date().toISOString(),
      // 새 버전 안내에 보여줄 짧은 메시지 (CHANGELOG 최신 항목 요약을 직접 적어도 됨)
      noteKo: '새로운 기능과 개선 사항이 담긴 업데이트예요.',
      // Android APK를 배포하는 경우 다운로드 URL을 적는다 (없으면 null)
      apkUrl: null,
    },
    null,
    2,
  ) + '\n',
);

// 2. sw.js 버전 치환 (public/ → dist/ 복사본)
const swPath = path.join(dist, 'sw.js');
if (fs.existsSync(swPath)) {
  fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace(/__APP_VERSION__/g, version));
} else {
  console.warn('경고: dist/sw.js가 없습니다 (public/sw.js 확인).');
}

// 3. index.html 태그 주입
const htmlPath = path.join(dist, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const headTags = [
  '<link rel="manifest" href="./manifest.json"/>',
  '<meta name="theme-color" content="#9B8AC4"/>',
  '<link rel="apple-touch-icon" href="./icons/icon-180.png"/>',
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>',
  '<meta name="apple-mobile-web-app-title" content="Mellow"/>',
].join('');

const swRegister = `<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  });
}
</script>`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', headTags + '</head>');
}
if (!html.includes('serviceWorker')) {
  html = html.replace('</body>', swRegister + '</body>');
}
fs.writeFileSync(htmlPath, html);

// 4. SPA 라우팅용 404.html (GitHub Pages에서 새로고침/딥링크 시 index로 서빙)
fs.copyFileSync(htmlPath, path.join(dist, '404.html'));

console.log(`PWA 후처리 완료 — v${version} (manifest/sw/version.json/404 주입)`);

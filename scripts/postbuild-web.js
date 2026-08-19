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

/**
 * 배포 기준 경로. 반드시 절대 경로로 만들어 주입한다.
 *
 * 상대 경로("./fonts/...")를 쓰면 문서 URL 기준으로 풀리기 때문에, /write/chat 같은
 * 중첩 라우트에서 /write/fonts/... 를 찾다가 404가 난다. 그러면 그 화면에서만 폰트가
 * 안 뜨고(세리프로 폴백), manifest와 서비스 워커까지 사라져서 홈 화면에 추가할 때
 * 앱 이름·아이콘이 엉뚱하게 잡힌다. 실제로 그 버그를 겪었다.
 */
const baseUrl = (() => {
  const raw = process.env.EXPO_WEB_BASE_URL || '/';
  const withLead = raw.startsWith('/') ? raw : `/${raw}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
})();

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

// SUIT — 로컬 woff2만 사용한다. 외부 CDN(Google Fonts 등)을 호출하지 않으므로
// 오프라인에서도 폰트가 뜨고, 외부 서비스 장애나 과금에 영향받지 않는다.
// 하나의 family에 굵기 3개를 등록한다(굵기별로 family를 나누면 브라우저가 가짜 볼드를
// 덧씌운다). 앱 토큰은 fontFamily:'SUIT' + fontWeight로 굵기를 고른다.
const fontFaces = [
  [400, 'suit-regular'],
  [600, 'suit-semibold'],
  [700, 'suit-bold'],
]
  .map(
    ([weight, file]) => `@font-face{font-family:"SUIT";` +
      `src:url("${baseUrl}fonts/${file}.woff2") format("woff2");` +
      // 폰트를 받는 동안 글자가 사라지지 않도록(FOIT 방지) 시스템 폰트로 먼저 보여 준다
      `font-weight:${weight};font-style:normal;font-display:swap;}`,
  )
  .join('');

/**
 * 한국어 줄바꿈 교정.
 *
 * 브라우저 기본값은 한글을 글자 단위로 끊어서 "내가 선택한 친구 / 에게만"처럼 어절
 * 중간에서 줄이 바뀐다. keep-all로 어절을 지키고, 대신 띄어쓰기 없이 긴 영어 단어가
 * 칸을 넘치지 않도록 overflow-wrap을 함께 둔다.
 */
const koreanWrapCss =
  'body,#root{word-break:keep-all;overflow-wrap:break-word;}';

const headTags = [
  // 첫 화면에서 바로 쓰는 두 굵기만 미리 받는다. Bold까지 preload하면 초기 네트워크 경쟁이 커진다.
  `<link rel="preload" href="${baseUrl}fonts/suit-regular.woff2" as="font" type="font/woff2" crossorigin/>`,
  `<link rel="preload" href="${baseUrl}fonts/suit-semibold.woff2" as="font" type="font/woff2" crossorigin/>`,
  `<style>${fontFaces}${koreanWrapCss}</style>`,
  `<link rel="manifest" href="${baseUrl}manifest.json"/>`,
  '<meta name="theme-color" content="#E0A82E"/>',
  `<link rel="apple-touch-icon" href="${baseUrl}icons/icon-180.png"/>`,
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>',
  '<meta name="apple-mobile-web-app-title" content="D-log"/>',
].join('');

const swRegister = `<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('${baseUrl}sw.js', { scope: '${baseUrl}' }).catch(function () {});
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

// 주입한 경로에 상대 경로가 남아 있으면 중첩 라우트(/write/chat 등)에서 404가 난다.
// 화면이 멀쩡해 보여서 놓치기 쉬우므로 빌드에서 막는다.
const injected = headTags + swRegister;
const relativeRefs = injected.match(/(?:href=|src=|url\(|register\()\s*["']?\.\//g);
if (relativeRefs) {
  console.error(
    `오류: 주입 태그에 상대 경로가 남아 있습니다 (${relativeRefs.length}건). ` +
      '중첩 라우트에서 404가 나므로 baseUrl을 붙여야 합니다.',
  );
  process.exit(1);
}

// 폰트가 빠지면 조용히 시스템 폰트로 떨어져 눈치채기 어렵다 — 빌드에서 바로 잡는다
const requiredFonts = ['suit-regular.woff2', 'suit-semibold.woff2', 'suit-bold.woff2'];
const missingFonts = requiredFonts.filter(
  (name) => !fs.existsSync(path.join(dist, 'fonts', name)),
);
if (missingFonts.length > 0) {
  console.error(`오류: dist/fonts에 폰트가 없습니다 — ${missingFonts.join(', ')}`);
  process.exit(1);
}

console.log(`PWA 후처리 완료 — v${version} (manifest/sw/version.json/404/폰트 주입)`);

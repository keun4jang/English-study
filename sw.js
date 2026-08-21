/*
 * D-log 서비스 워커 — PWA 설치 + 재설치 없는 업데이트.
 *
 * 동작 방식:
 * - 빌드 시 postbuild-web.js가 아래 0.13.2을 실제 버전으로 치환한다.
 * - 버전이 바뀌면 캐시 이름이 바뀌어 새 SW가 설치되고,
 *   앱은 "새 버전이 있어요" 배너를 띄운다. 사용자가 업데이트를 누르면
 *   SKIP_WAITING 메시지로 즉시 전환 후 새로고침된다.
 * - 전략: HTML/버전 파일은 network-first(항상 최신 확인),
 *   그 외 정적 자산은 cache-first(오프라인 shell).
 */
const APP_VERSION = '0.13.2';
const CACHE_NAME = 'dlog-v' + APP_VERSION;

self.addEventListener('install', (event) => {
  // 기다리지 않고 바로 새 워커로 교체한다.
  // 예전에는 모든 창이 닫힐 때까지 옛 워커가 계속 응답했는데, 그 사이 옛 manifest가
  // 서빙되면서 홈 화면에 옛 앱 이름이 박히는 문제가 있었다.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        './',
        './manifest.json',
        // 폰트를 미리 받아 둬야 오프라인에서 처음 열 때도 글자가 시스템 폰트로 안 튄다
        './fonts/suit-regular.woff2',
        './fonts/suit-semibold.woff2',
        './fonts/suit-bold.woff2',
      ]),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate';
  const isVersionFile = url.pathname.endsWith('/version.json');
  // manifest는 앱 이름·아이콘의 원본이다. 캐시에서 주면 이름을 바꿔도 홈 화면에
  // 옛 이름이 그대로 박힌다(재설치해도 안 바뀐다). 반드시 네트워크를 먼저 본다.
  const isManifest = url.pathname.endsWith('/manifest.json');

  if (isNavigation || isVersionFile || isManifest) {
    // network-first: 항상 최신 확인, 오프라인이면 캐시
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached ?? caches.match('./'))),
    );
    return;
  }

  // cache-first: 정적 자산
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ??
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

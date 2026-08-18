/*
 * Mellow Diary 서비스 워커 — PWA 설치 + 재설치 없는 업데이트.
 *
 * 동작 방식:
 * - 빌드 시 postbuild-web.js가 아래 __APP_VERSION__을 실제 버전으로 치환한다.
 * - 버전이 바뀌면 캐시 이름이 바뀌어 새 SW가 설치되고,
 *   앱은 "새 버전이 있어요" 배너를 띄운다. 사용자가 업데이트를 누르면
 *   SKIP_WAITING 메시지로 즉시 전환 후 새로고침된다.
 * - 전략: HTML/버전 파일은 network-first(항상 최신 확인),
 *   그 외 정적 자산은 cache-first(오프라인 shell).
 */
const APP_VERSION = '__APP_VERSION__';
const CACHE_NAME = 'mellow-diary-v' + APP_VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', './manifest.json'])),
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

  if (isNavigation || isVersionFile) {
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

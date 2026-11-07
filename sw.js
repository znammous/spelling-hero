// يحفظ ملفات اللعبة على الجهاز لتعمل بدون إنترنت
// غيّر رقم الإصدار عند تعديل أي ملف حتى يحدَّث الكاش
const CACHE = 'spelling-hero-v34';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'css/world.css',
  'fonts/baloo-bhaijaan-2-arabic.woff2',
  'fonts/baloo-bhaijaan-2-latin.woff2',
  'js/background.js',
  'js/data.js',
  'js/store.js',
  'js/world.js',
  'js/sound.js',
  'js/speech.js',
  'js/engine.js',
  'js/online.js',
  'js/brain.js',
  'js/sync.js',
  'js/winner.js',
  'js/group.js',
  'js/vendor/qrcode.js',
  'js/vendor/jsQR.js',
  'js/app.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // الشبكة أولاً حتى يصل كل تحديث فوراً، والمحفوظ عند انقطاع الإنترنت
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html')))
  );
});

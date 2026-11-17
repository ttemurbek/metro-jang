// Metro Jang — oflayn ishlash uchun service worker (fayllarni keshlaydi)
const CACHE = 'metro-jang-v13';
const FILES = ['./', './index.html', './lib/phaser.min.js', './lib/three-gltf.min.js', './assets/models.js', './assets/female.js', './assets/anims.js', './assets/mocap.js', './settings.js', './audio.js', './music.js', './stage.js', './fighter.js', './story.js', './modes.js', './touch.js', './tutorial.js', './extra.js', './online.js', './arena3d.js', './finishers.js', './game.js', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});

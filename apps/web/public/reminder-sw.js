// Empty service worker to satisfy browser requests for /reminder-sw.js
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    return self.clients.claim();
});

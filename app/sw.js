// Service worker for the home-screen app. Network first, so a release shows up on the next open;
// the last good copy is used only when offline.
// Push: Firebase Messaging shows each reminder and opens its link when tapped.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js", "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
firebase.initializeApp({"apiKey":"AIzaSyCSXKB82V0RtKBV8f6IM7AA7wp1gsPcwYQ","authDomain":"upward-spiral-of-awesomeness.firebaseapp.com","projectId":"upward-spiral-of-awesomeness","appId":"1:445813281061:web:8982a5466586bce7828acc","messagingSenderId":"445813281061"});
firebase.messaging();

const CACHE = "spiral-629f2e1849";
const SHELL = ["/", "/routines", "/work", "/progress", "/app.css?v=629f2e1849", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/__/")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: false }).then((hit) => hit || caches.match("/"))),
  );
});

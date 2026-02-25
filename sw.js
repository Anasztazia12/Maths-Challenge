const CACHE_VERSION = "2026-02-25ai";
const CACHE_NAME = `maths-challenge-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "index.html",
  "game.html",
  "play.html",
  "weekly.html",
  "addition.html",
  "subtraction.html",
  "multiplication.html",
  "division.html",
  "mixed.html",
  "style.css",
  "game.js",
  "arcade.js",
  "weekly.js",
  "pophunters.webp",
  "background_game.webp",
  "background_operations.webp",
  "background_weekly.webp",
  "correct.mp3",
  "wrong.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => caches.match("index.html"));
    })
  );
});

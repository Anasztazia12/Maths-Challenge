const CACHE_VERSION = "2026-04-16-cloud-sync-fix-v5";
const CACHE_NAME = `maths-challenge-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "index.html",
  "home.html",
  "game.html",
  "play.html",
  "weekly.html",
  "shop.html",
  "addition.html",
  "subtraction.html",
  "multiplication.html",
  "division.html",
  "mixed.html",
  "assets/css/style.css",
  "game.js",
  "profile-manager.js",
  "shop.js",
  "arcade.js",
  "weekly.js",
  "assets/image/pophunters.webp",
  "assets/image/avatar.png",
  "assets/image/avata.png",
  "assets/image/avatar2.png",
  "assets/image/avatar3.png",
  "assets/image/avatar4.png",
  "assets/image/avatar5.png",
  "assets/image/avatar6.png",
  "assets/accessories/hat.png",
  "assets/accessories/hat2.png",
  "assets/accessories/hat3.png",
  "assets/accessories/sunglasses.png",
  "assets/accessories/sunglasses2.png",
  "assets/accessories/sunglasses3.png",
  "assets/image/background_game.webp",
  "assets/image/background_operations.webp",
  "assets/image/background_weekly.webp",
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

  const isDocumentRequest =
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    requestUrl.pathname.endsWith(".html") ||
    requestUrl.pathname === "/" ||
    requestUrl.pathname.endsWith("/");

  const isScriptOrStyleRequest =
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    requestUrl.pathname.endsWith(".js") ||
    requestUrl.pathname.endsWith(".css");

  if (isDocumentRequest) {
    event.respondWith(
      fetch(new Request(event.request, { cache: "no-store" }))
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
    );
    return;
  }

  if (isScriptOrStyleRequest) {
    event.respondWith(
      fetch(new Request(event.request, { cache: "no-store" }))
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

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
        .catch(() => caches.match(event.request));
    })
  );
});

const CACHE_NAME = "tetris-party-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/globe.svg",
  "/window.svg",
  "/file.svg",
  "/next.svg",
  "/vercel.svg",
  "/_next/static/chunks/main.js",
  "/_next/static/chunks/app.js",
  "/_next/static/css/app.css",
  "/app/lib/tetris/constants.js",
  "/app/lib/tetris/reducer.js",
  "/app/lib/tetris/utils.js",
  "/app/lib/tetris/types.js",
  "/app/components/tetris.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request)
        .then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/");
          }
          if (
            event.request.url.includes("partysocket") ||
            event.request.url.includes("partykit")
          ) {
            return new Response(
              JSON.stringify({
                type: "OFFLINE_MODE",
                isMultiplayerMode: false,
                gameStarted: false,
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            );
          }
          return new Response("Offline mode: Unable to fetch resource");
        });
    })
  );
});

self.addEventListener("push", function (event) {
  const options = {
    body: event.data.text(),
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Open App",
        icon: "/icons/icon-192x192.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("Tetris Party", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});

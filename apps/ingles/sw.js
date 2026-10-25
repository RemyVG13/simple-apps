const SHELL_CACHE = "ingles-shell-v2";
const MEDIA_CACHE = "ingles-media-v2";

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./data/cards.json",
];

function slug(word) {
  return String(word)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isMedia(url) {
  return /\/(images|audio)\//.test(url.pathname);
}

async function cacheMediaFromCards(cache) {
  try {
    const response = await fetch("./data/cards.json");
    if (!response.ok) return;
    const cards = await response.json();
    if (!Array.isArray(cards)) return;
    await Promise.all(
      cards.map(async (card) => {
        const urls = [];
        if (card && typeof card.image === "string" && card.image.trim()) {
          urls.push(new URL(card.image, self.registration.scope).href);
        }
        if (card && typeof card.word === "string" && slug(card.word)) {
          urls.push(new URL(`audio/${slug(card.word)}.mp3`, self.registration.scope).href);
        }
        await Promise.all(
          urls.map(async (url) => {
            try {
              const file = await fetch(url);
              if (file.ok) await cache.put(url, file);
            } catch (error) {
              /* Una tarjeta nueva puede llegar antes que su archivo. */
            }
          })
        );
      })
    );
  } catch (error) {
    /* Sin red no se precargan las tarjetas. La app sigue en línea. */
  }
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const home = await cache.match("./index.html");
      if (home) return home;
    }
    return new Response("Sin conexión", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request.url);
  if (response && response.ok && response.status !== 206) {
    cache.put(request.url, response.clone());
  }
  return response;
}

async function cacheUrls(cache, urls) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok || response.redirected) return;
        await cache.put(url, response);
      } catch (error) {
        /* Un archivo que todavía no existe no impide instalar la app. */
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      await cacheUrls(shell, SHELL);
      const media = await caches.open(MEDIA_CACHE);
      await cacheMediaFromCards(media);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== MEDIA_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isMedia(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request));
});

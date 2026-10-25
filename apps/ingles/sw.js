const MEDIA_CACHE = "ingles-media-v6";

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

async function cacheFirst(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.status !== 206) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    return new Response("", { status: 504 });
  }
}

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
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
      await Promise.all(keys.filter((key) => key !== MEDIA_CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!isMedia(url)) return;
  event.respondWith(cacheFirst(request));
});

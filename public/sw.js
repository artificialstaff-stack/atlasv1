/**
 * Atlas Platform — Service Worker
 * Cache-first for static assets, Network-first for API calls.
 */

const CACHE_NAME = "atlas-v1";
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
];

// Install — pre-cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — temizle eski cache'leri
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

// Fetch — strateji seçimi
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API istekleri: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // _next/static: cache-first (immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Diğer: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ─── Caching Strategies ───

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Arka planda güncelle — fire and forget
    fetchPromise.catch(() => {});
    return cached;
  }

  const response = await fetchPromise;
  if (response) return response;

  // Offline fallback
  return (await caches.match("/offline")) || new Response("Offline", { status: 503 });
}

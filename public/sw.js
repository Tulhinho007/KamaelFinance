// Service Worker para Kamael Finance PWA
const CACHE_NAME = "kamael-pwa-v2";
const OFFLINE_URL = "/";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/favicon.ico"
];

// Instalação do Service Worker e cache dos recursos essenciais
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia Network-First para garantir que dados financeiros nunca fiquem desatualizados
self.addEventListener("fetch", (event) => {
  // Ignora requisições que não sejam GET (como Server Actions POST ou mutations)
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ignora requisições de API internas do Next ou extensões de terceiros
  if (url.origin !== self.location.origin) return;

  // Navegações (SSR), payloads RSC, assets do Next e APIs vão direto para a rede,
  // sem interceptação: evita "Failed to convert value to 'Response'".
  if (
    event.request.mode === "navigate" ||
    event.request.headers.get("RSC") ||
    event.request.headers.get("Next-Router-State-Tree") ||
    url.searchParams.has("_rsc") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return new Response("", { status: 504, statusText: "Offline" });
      })
  );
});

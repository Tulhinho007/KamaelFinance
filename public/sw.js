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

  // O SW só atua sobre os assets estáticos do PWA. Páginas, RSC, rotas dinâmicas
  // e dados financeiros vão SEMPRE direto para a rede (sem interceptação).
  const STATIC_PATHS = ["/manifest.json", "/icon.svg", "/favicon.ico"];
  if (!STATIC_PATHS.includes(url.pathname)) return;

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

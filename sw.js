// /sw.js  (sem cache propositalmente)

self.addEventListener("install", (event) => {
  // instala e ativa rápido
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch handler obrigatório para alguns fluxos de "install prompt" no Chromium,
// mas aqui NÃO fazemos cache: só repassamos para a rede.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

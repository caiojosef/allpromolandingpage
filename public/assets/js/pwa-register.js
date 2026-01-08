// /public/assets/js/pwa-register.js
(() => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("[PWA] Service Worker registrado (sem cache).");
    } catch (e) {
      console.warn("[PWA] Falha ao registrar SW:", e);
    }
  });
})();

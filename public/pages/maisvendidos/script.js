// public/pages/maisvendidos/script.js
(() => {
  window.__page = {
    init() {
      console.log("[Mais Vendidos] init");

      const spaView = document.getElementById("spa-view");
      if (!spaView) return console.error("Não achei #spa-view.");

      if (window.Components?.Section?.rehydrate) {
        window.Components.Section.rehydrate(spaView);
      } else if (window.Components?.Section?.hydrateAll) {
        // fallback (se você remover rehydrate depois)
        window.Components.Section.hydrateAll(spaView);
      } else {
        console.error("Section component não carregou.");
      }
    },
    destroy() {},
  };
})();

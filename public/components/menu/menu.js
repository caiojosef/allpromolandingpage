// public/components/menu/menu.js
(() => {
  "use strict";

  const SELECTOR_DECL = "menu[data-name][href]";
  const MOUNT_SELECTOR = "[data-menu-mount]";
  const IDS = {
    root: "catMenuRoot",
    trigger: "catMenuTrigger",
    overlay: "catMenuOverlay",
    drawer: "catMenuDrawer",
    closeBtn: "catMenuClose",
    list: "catMenuList",
  };

  /**
   * Resolve a URL do menu.css baseado no src do próprio menu.js.
   * Ex.: .../public/components/menu/menu.js -> .../public/components/menu/menu.css
   */
  function getCssUrl() {
    const scriptEl =
      document.currentScript ||
      Array.from(document.scripts).find((s) =>
        (s.src || "").includes("/public/components/menu/menu.js")
      ) ||
      Array.from(document.scripts).find((s) =>
        (s.src || "").endsWith("public/components/menu/menu.js")
      ) ||
      Array.from(document.scripts).find((s) =>
        (s.src || "").endsWith("/menu.js")
      );

    const jsSrc = scriptEl?.src;
    if (!jsSrc) {
      // fallback (se por algum motivo não der para detectar)
      return "public/components/menu/menu.css";
    }

    const jsUrl = new URL(jsSrc, window.location.href);
    return new URL("menu.css", jsUrl).toString();
  }

  function ensureStyles() {
    const cssUrl = getCssUrl();

    // Evita duplicar (procura link já existente com esse href)
    const alreadyLoaded = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]')
    ).some((l) => {
      try {
        return (
          new URL(l.href, window.location.href).toString() ===
          new URL(cssUrl, window.location.href).toString()
        );
      } catch {
        return l.href === cssUrl;
      }
    });

    if (alreadyLoaded) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    link.setAttribute("data-menu-css", "1");
    document.head.appendChild(link);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readDeclarations() {
    const nodes = Array.from(document.querySelectorAll(SELECTOR_DECL));
    if (!nodes.length) return [];

    const items = nodes.map((el) => {
      const name = el.getAttribute("data-name") || "";
      const href = el.getAttribute("href") || "#";
      const icon = el.getAttribute("icon-img") || "";
      const target = el.getAttribute("target") || "";
      const rel = el.getAttribute("rel") || "";
      return { name, href, icon, target, rel };
    });

    // remove as declarações do DOM (não poluir layout)
    nodes.forEach((el) => el.remove());

    return items;
  }

  function buildTemplate(items) {
    const linksHtml = items
      .map((it) => {
        const name = escapeHtml(it.name);
        const href = escapeHtml(it.href);
        const icon = escapeHtml(it.icon);
        const targetAttr = it.target
          ? ` target="${escapeHtml(it.target)}"`
          : "";
        const relAttr = it.rel ? ` rel="${escapeHtml(it.rel)}"` : "";

        return `
          <a class="cat-item" href="${href}"${targetAttr}${relAttr}>
            ${
              icon
                ? `<img class="cat-item__icon" src="${icon}" alt="" loading="lazy" />`
                : `<span class="cat-item__icon cat-item__icon--fallback" aria-hidden="true"></span>`
            }
            <span class="cat-item__text">${name}</span>
          </a>
        `;
      })
      .join("");

    return `
      <div class="cat-root" id="${IDS.root}">
        <button class="cat-trigger" id="${
          IDS.trigger
        }" type="button" aria-haspopup="dialog" aria-controls="${
      IDS.drawer
    }" aria-expanded="false">
          
          <span class="cat-hamburger" aria-hidden="true">
            <i></i><i></i><i></i>
          </span>
        </button>

        <div class="cat-overlay" id="${IDS.overlay}" hidden></div>

        <aside class="cat-drawer" id="${
          IDS.drawer
        }" role="dialog" aria-modal="true" aria-label="Categorias" aria-hidden="true">
          <div class="cat-drawer__header">
            <div class="cat-drawer__title">Categorias</div>
            <button class="cat-close" id="${
              IDS.closeBtn
            }" type="button" aria-label="Fechar">×</button>
          </div>

          <nav class="cat-nav" id="${IDS.list}">
            ${
              linksHtml ||
              `<div class="cat-empty">Nenhuma categoria configurada.</div>`
            }
          </nav>
        </aside>
      </div>
    `;
  }

  function ensureMount() {
    let mount = document.querySelector(MOUNT_SELECTOR);
    if (mount) return mount;

    const anchor = document.querySelector("main") || document.body;
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-menu-mount", "");
    anchor.parentNode.insertBefore(wrapper, anchor);
    return wrapper;
  }

  function init() {
    ensureStyles();

    const items = readDeclarations();
    if (!items.length) return;

    // evita duplicar
    if (document.getElementById(IDS.root)) return;

    const mount = ensureMount();
    mount.insertAdjacentHTML("afterbegin", buildTemplate(items));

    const trigger = document.getElementById(IDS.trigger);
    const overlay = document.getElementById(IDS.overlay);
    const drawer = document.getElementById(IDS.drawer);
    const closeBtn = document.getElementById(IDS.closeBtn);

    if (!trigger || !overlay || !drawer || !closeBtn) return;

    let isOpen = false;

    function open() {
      if (isOpen) return;
      isOpen = true;

      trigger.setAttribute("aria-expanded", "true");
      drawer.setAttribute("aria-hidden", "false");
      overlay.hidden = false;

      document.documentElement.classList.add("cat-menu-open");
      document.body.classList.add("cat-menu-open");

      drawer.tabIndex = -1;
      drawer.focus({ preventScroll: true });
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;

      trigger.setAttribute("aria-expanded", "false");
      drawer.setAttribute("aria-hidden", "true");
      overlay.hidden = true;

      document.documentElement.classList.remove("cat-menu-open");
      document.body.classList.remove("cat-menu-open");

      trigger.focus({ preventScroll: true });
    }

    function toggle() {
      isOpen ? close() : open();
    }

    trigger.addEventListener("click", toggle);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a.cat-item");
      if (a) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

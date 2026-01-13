// public/components/menu/menu.js
(() => {
  "use strict";

  const API_URL =
    "https://vitrinedoslinks.com.br/app/api/listar-categorias.php";
  const MOUNT_SELECTOR = "[data-menu-mount]";

  const IDS = {
    root: "catMenuRoot",
    trigger: "catMenuTrigger",
    overlay: "catMenuOverlay",
    drawer: "catMenuDrawer",
    closeBtn: "catMenuClose",
    list: "catMenuList",
  };

  const ICON_BASE = "public/images/icons/";

  /**
   * Mapeia slug da ROOT -> arquivo do ícone.
   * Você controla aqui os arquivos na sua pasta.
   */
  const ROOT_ICON_MAP = {
    inicio: "house-door-fill.svg",
    academia: "gym.svg",
    // exemplos:
    // eletronicos: "eletronicos.png",
    // moda: "moda.png",
    // "casa-e-decoracao": "casa.png",
  };

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
    if (!jsSrc) return "public/components/menu/menu.css";
    const jsUrl = new URL(jsSrc, window.location.href);
    return new URL("menu.css", jsUrl).toString();
  }

  function ensureStyles() {
    const cssUrl = getCssUrl();
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

  function ensureMount() {
    let mount = document.querySelector(MOUNT_SELECTOR);
    if (mount) return mount;

    const anchor = document.querySelector("main") || document.body;
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-menu-mount", "");
    anchor.parentNode.insertBefore(wrapper, anchor);
    return wrapper;
  }

  function normalizeUrl(url) {
    const u = String(url ?? "").trim();
    return u || null;
  }

  function hasChildren(node) {
    const mains = node?.mains || [];
    const subs = node?.subs || [];
    return (
      (Array.isArray(mains) && mains.length > 0) ||
      (Array.isArray(subs) && subs.length > 0)
    );
  }

  function buildNodeHtml(node, level) {
    const name = escapeHtml(node?.name || "");
    const url = normalizeUrl(node?.url);
    const children = level === 0 ? node?.mains || [] : node?.subs || [];
    const hasKids = Array.isArray(children) && children.length > 0;

    const iconKind =
      level === 0 ? ROOT_ICON_MAP[node?.slug] || "fallback" : null;
    const iconHtml = (() => {
      if (level !== 0) return "";

      const file = ROOT_ICON_MAP[node?.slug];
      if (!file) {
        // Fallback (se preferir "sem nada", retorne "" aqui)
        return `<span class="cat-icon cat-icon--fallback" aria-hidden="true"></span>`;
      }

      const src = escapeHtml(ICON_BASE + file);
      return `
    <span class="cat-icon" aria-hidden="true">
      <img src="${src}" alt="" loading="lazy" />
    </span>
  `;
    })();

    const linkTagOpen = url
      ? `<a class="cat-link" href="${escapeHtml(url)}">`
      : `<span class="cat-link" role="link" aria-disabled="true" tabindex="-1">`;

    const linkTagClose = url ? `</a>` : `</span>`;

    const chevronBtn = hasKids
      ? `<button class="cat-chevron" type="button" aria-label="Expandir/Fechar">
       <i class="bi bi-arrow-right-circle" aria-hidden="true"></i>
     </button>`
      : `<button class="cat-chevron" type="button" aria-hidden="true" tabindex="-1"></button>`;

    const childrenHtml = hasKids
      ? children.map((ch) => buildNodeHtml(ch, level + 1)).join("")
      : "";

    // tudo começa fechado: aria-expanded="false"
    return `
      <section class="cat-node" data-level="${level}" data-has-children="${
      hasKids ? "1" : "0"
    }" aria-expanded="false">
        <div class="cat-row">
          ${linkTagOpen}
            ${iconHtml}
            <span class="cat-text">${name}</span>
          ${linkTagClose}
          ${chevronBtn}
        </div>

        <div class="cat-children" aria-hidden="true">
          ${childrenHtml}
        </div>
      </section>
    `;
  }

  function setExpanded(nodeEl, expanded) {
    nodeEl.setAttribute("aria-expanded", expanded ? "true" : "false");
    setChevronIcon(nodeEl, expanded);

    function setChevronIcon(nodeEl, expanded) {
      const icon = nodeEl.querySelector(":scope > .cat-row .cat-chevron i");
      if (!icon) return;

      // remove ambos por segurança
      icon.classList.remove("bi-arrow-right-circle", "bi-arrow-down-circle");
      icon.classList.add(
        expanded ? "bi-arrow-down-circle" : "bi-arrow-right-circle"
      );
    }

    const childrenEl = nodeEl.querySelector(":scope > .cat-children");
    if (!childrenEl) return;

    childrenEl.setAttribute("aria-hidden", expanded ? "false" : "true");

    // Animação por height
    if (expanded) {
      // medir o scrollHeight e aplicar
      const h = childrenEl.scrollHeight;
      childrenEl.style.height = h + "px";
      // após a transição, deixar auto para responder conteúdo (opcional)
      const onEnd = (e) => {
        if (e.propertyName === "height") {
          childrenEl.style.height = "auto";
          childrenEl.removeEventListener("transitionend", onEnd);
        }
      };
      childrenEl.addEventListener("transitionend", onEnd);
    } else {
      // se estava auto, setar altura atual antes de fechar
      const current = childrenEl.scrollHeight;
      childrenEl.style.height = current + "px";
      // força reflow
      void childrenEl.offsetHeight;
      childrenEl.style.height = "0px";
    }
  }

  function closeAllDescendants(nodeEl) {
    const opened = nodeEl.querySelectorAll('.cat-node[aria-expanded="true"]');
    opened.forEach((el) => setExpanded(el, false));
  }

  function buildShell() {
    return `
      <div class="cat-root" id="${IDS.root}">
      
        <button class="cat-trigger" id="${IDS.trigger}" type="button"
          aria-haspopup="dialog" aria-controls="${IDS.drawer}" aria-expanded="false">
          <span class="cat-hamburger" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>

        <div class="cat-overlay" id="${IDS.overlay}" hidden></div>

        <aside class="cat-drawer" id="${IDS.drawer}"
          role="dialog" aria-modal="true" aria-label="Categorias" aria-hidden="true">
          <div class="cat-drawer__header">
            <div class="cat-drawer__title">Categorias</div>
            <button class="cat-close" id="${IDS.closeBtn}" type="button" aria-label="Fechar">×</button>
          </div>

          <nav class="cat-nav" id="${IDS.list}">
            <div class="cat-empty" data-state="loading">Carregando categorias…</div>
          </nav>
        </aside>
      </div>
    `;
  }

  function resetMenuState() {
    const list = document.getElementById(IDS.list);
    if (!list) return;

    const nodes = list.querySelectorAll(".cat-node");
    nodes.forEach((node) => {
      // fecha semanticamente
      node.setAttribute("aria-expanded", "false");

      // ajusta ícone do chevron para estado fechado (se existir)
      const icon = node.querySelector(":scope > .cat-row .cat-chevron i");
      if (icon) {
        icon.classList.remove("bi-arrow-down-circle");
        icon.classList.add("bi-arrow-right-circle");
      }

      // fecha visualmente (height 0)
      const children = node.querySelector(":scope > .cat-children");
      if (children) {
        children.setAttribute("aria-hidden", "true");
        children.style.height = "0px";
      }
    });
  }

  async function fetchCategories() {
    const res = await fetch(API_URL, { method: "GET" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!data || data.ok !== true || !Array.isArray(data.roots)) {
      throw new Error("JSON inválido (roots)");
    }
    return data.roots;
  }

  function initDrawerBehavior() {
    const trigger = document.getElementById(IDS.trigger);
    const overlay = document.getElementById(IDS.overlay);
    const drawer = document.getElementById(IDS.drawer);
    const closeBtn = document.getElementById(IDS.closeBtn);
    const list = document.getElementById(IDS.list);

    if (!trigger || !overlay || !drawer || !closeBtn || !list) return;

    let isOpen = false;

    function open() {
      if (isOpen) return;
      isOpen = true;

      trigger.setAttribute("aria-expanded", "true");
      drawer.setAttribute("aria-hidden", "false");
      overlay.hidden = false;

      document.documentElement.classList.add("cat-menu-open");
      document.body.classList.add("cat-menu-open");
      resetMenuState();

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

    trigger.addEventListener("click", () => (isOpen ? close() : open()));
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    // Delegação: expandir só quando clicar na setinha
    list.addEventListener("click", (e) => {
      const chevron = e.target.closest(".cat-chevron");
      if (!chevron) return;

      const node = chevron.closest(".cat-node");
      if (!node) return;

      // Se não tem filhos, ignora
      if (node.getAttribute("data-has-children") !== "1") return;

      e.preventDefault();
      e.stopPropagation();

      const expanded = node.getAttribute("aria-expanded") === "true";

      // fecha descendentes ao fechar o pai
      if (expanded) {
        closeAllDescendants(node);
        setExpanded(node, false);
      } else {
        setExpanded(node, true);
      }
    });

    // Se clicar em um LINK real (href), fecha o drawer
    list.addEventListener("click", (e) => {
      const a = e.target.closest("a.cat-link");
      if (!a) return;
      close();
    });
  }

  async function hydrateMenu() {
    const list = document.getElementById(IDS.list);
    if (!list) return;

    try {
      const roots = await fetchCategories();

      const html = roots.map((r) => buildNodeHtml(r, 0)).join("");
      list.innerHTML =
        html || `<div class="cat-empty">Nenhuma categoria encontrada.</div>`;
    } catch (err) {
      console.error("[menu] erro ao carregar categorias:", err);
      list.innerHTML = `
        <div class="cat-empty">
          Não foi possível carregar as categorias.<br/>
          Verifique a API ou o CORS.
        </div>
      `;
    }
    resetMenuState();
  }

  function init() {
    ensureStyles();

    // evita duplicar
    if (document.getElementById(IDS.root)) return;

    const mount = ensureMount();
    mount.insertAdjacentHTML("afterbegin", buildShell());

    initDrawerBehavior();
    hydrateMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

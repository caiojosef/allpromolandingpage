// public/components/category-tabs/category-tabs.js
(() => {
  "use strict";

  const IDS = {
    root: "catTabs",
    main: "catTabsMain",
  };

  // ---------- Utils ----------
  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseHash() {
    const hash = window.location.hash || "#/inicio";
    const raw = hash.replace(/^#/, "");
    const [pathRaw, qsRaw] = raw.split("?");
    const path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;

    const params = {};
    if (qsRaw) {
      const sp = new URLSearchParams(qsRaw);
      for (const [k, v] of sp.entries()) params[k] = v;
    }

    return { path, params, full: `#${raw}` };
  }

  function hrefToPath(href) {
    // pega apenas o path base do href do tipo "#/rota?..."
    if (!href || typeof href !== "string") return "";
    if (!href.startsWith("#/")) return "";
    const raw = href.replace(/^#/, "");
    const [pathRaw] = raw.split("?");
    return pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;
  }

  // ---------- Resolver URLs (css/json) com base no src do JS ----------
  function getThisScriptUrl() {
    const cur = document.currentScript;
    if (cur && cur.src) return new URL(cur.src, window.location.href);

    // fallback: encontra por final do arquivo
    const found = Array.from(document.scripts).find((s) => {
      const src = s.src || "";
      return (
        src.endsWith("/public/components/category-tabs/category-tabs.js") ||
        src.endsWith("public/components/category-tabs/category-tabs.js") ||
        src.endsWith("/category-tabs.js")
      );
    });

    return found?.src ? new URL(found.src, window.location.href) : null;
  }

  function getAssetUrl(fileName) {
    const jsUrl = getThisScriptUrl();
    if (!jsUrl) return `public/components/category-tabs/${fileName}`;
    return new URL(fileName, jsUrl).toString(); // mesma pasta do JS
  }

  function ensureStyles() {
    const cssUrl = getAssetUrl("category-tabs.css");

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
    link.setAttribute("data-category-tabs-css", "1");
    document.head.appendChild(link);
  }

  async function loadConfig() {
    const jsonUrl = getAssetUrl("category-tabs.json");
    try {
      const res = await fetch(jsonUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar config`);
      const data = await res.json();

      // validações mínimas
      if (!data || !Array.isArray(data.main))
        throw new Error("Config inválida: campo main ausente");
      if (!data.sub || typeof data.sub !== "object") data.sub = {};

      return data;
    } catch (err) {
      console.error("[category-tabs] Falha ao carregar JSON:", err);
      return { main: [], sub: {} };
    }
  }

  // ---------- Render ----------
  function buildMainRow(CONFIG) {
    return (CONFIG.main || [])
      .map((it) => {
        const cls = ["cat-tab", it.primary ? "is-primary" : ""]
          .filter(Boolean)
          .join(" ");

        const attrs = [
          `class="${cls}"`,
          `href="${esc(it.href || "#")}"`,
          `data-key="${esc(it.key || "")}"`,
          it.toggle ? `data-toggle="${esc(it.toggle)}"` : "",
          it.external ? `target="_blank" rel="noopener"` : "",
          it.toggle ? `aria-expanded="false"` : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `<a ${attrs}><i class="bi ${esc(
          it.icon || "bi-dot"
        )}"></i><span>${esc(it.label || "")}</span></a>`;
      })
      .join("");
  }

  function buildSubRow(CONFIG, group) {
    const items = (CONFIG.sub && CONFIG.sub[group]) || [];
    return items
      .map((it) => {
        return `
          <a class="cat-tab" href="${esc(it.href || "#")}" data-sub="${esc(
          group
        )}">
            <i class="bi ${esc(it.icon || "bi-dot")}"></i>
            <span>${esc(it.label || "")}</span>
          </a>
        `;
      })
      .join("");
  }

  function injectUI(CONFIG) {
    const spaView = document.getElementById("spa-view");
    if (!spaView) return;

    // evita duplicar
    if (document.getElementById(IDS.root)) return;

    const groups = Object.keys(CONFIG.sub || {});

    const subHtml = groups
      .map((group) => {
        return `
          <div class="cat-tabs__sub" data-group="${esc(group)}">
            <div class="cat-tabs__row">
              ${buildSubRow(CONFIG, group)}
            </div>
          </div>
        `;
      })
      .join("");

    const html = `
      <div class="cat-tabs" id="${IDS.root}" aria-label="Categorias">
        <div class="cat-tabs__row" id="${IDS.main}">
          ${buildMainRow(CONFIG)}
        </div>
        ${subHtml}
      </div>
    `;

    spaView.insertAdjacentHTML("beforebegin", html);

    // eventos
    const root = document.getElementById(IDS.root);
    root.addEventListener("click", (e) => {
      const a = e.target.closest("a.cat-tab");
      if (!a) return;

      const toggle = a.getAttribute("data-toggle");
      const href = a.getAttribute("href") || "";

      if (toggle) {
        e.preventDefault();

        // navega para rota base do grupo (se for interna)
        if (href.startsWith("#/")) window.location.hash = href;

        // comportamento de toggle manual (clique abre/fecha),
        // mas ao mudar de aba (hashchange) o estado será corrigido pela regra.
        toggleGroup(toggle);
        return;
      }

      // links internos: deixa o router trabalhar via hash
      if (href.startsWith("#/")) {
        e.preventDefault();
        window.location.hash = href;
      }
      // externos seguem normal
    });
  }

  // ---------- Estado / comportamento ----------
  function toggleGroup(group) {
    const sub = document.querySelector(`.cat-tabs__sub[data-group="${group}"]`);
    if (!sub) return;

    const isOpen = sub.classList.toggle("is-open");
    const toggleBtn = document.querySelector(
      `.cat-tab[data-toggle="${group}"]`
    );
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", String(isOpen));
  }

  function closeAllGroups() {
    document
      .querySelectorAll(".cat-tabs__sub")
      .forEach((el) => el.classList.remove("is-open"));
    document
      .querySelectorAll(".cat-tab[data-toggle]")
      .forEach((el) => el.setAttribute("aria-expanded", "false"));
  }

  function setActiveMainByPath(CONFIG, path) {
    document
      .querySelectorAll(`#${IDS.main} .cat-tab`)
      .forEach((a) => a.classList.remove("is-active"));

    // tenta achar item cujo href base bate com a rota atual
    const match = (CONFIG.main || []).find(
      (it) => hrefToPath(it.href) === path
    );
    if (!match) return null;

    const btn = document.querySelector(
      `#${IDS.main} .cat-tab[data-key="${CSS.escape(match.key)}"]`
    );
    if (btn) btn.classList.add("is-active");

    return match;
  }

  function setActiveSubByHash(fullHash) {
    // marca subitem ativo por hash completo (inclui query string)
    document
      .querySelectorAll(`.cat-tabs__sub .cat-tab`)
      .forEach((a) => a.classList.remove("is-active"));

    const selector = `.cat-tabs__sub .cat-tab[href="${CSS.escape(fullHash)}"]`;
    const hit = document.querySelector(selector);
    if (hit) hit.classList.add("is-active");
  }

  function updateFromRoute(CONFIG) {
    const root = document.getElementById(IDS.root);
    if (!root) return;

    const { path, full } = parseHash();

    // ativa main conforme rota
    const currentMain = setActiveMainByPath(CONFIG, path);

    // regra principal: subcategorias fechadas quando não estiver na aba base do grupo
    closeAllGroups();

    // se a rota atual é a rota base de um item com toggle, abre o grupo correspondente
    if (currentMain && currentMain.toggle) {
      const group = currentMain.toggle;

      const sub = document.querySelector(
        `.cat-tabs__sub[data-group="${CSS.escape(group)}"]`
      );
      if (sub) sub.classList.add("is-open");

      const toggleBtn = document.querySelector(
        `.cat-tab[data-toggle="${CSS.escape(group)}"]`
      );
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");

      // opcional: marcar sub ativo se bater exatamente o hash
      setActiveSubByHash(full);
    }
  }

  // ---------- Boot ----------
  async function boot() {
    ensureStyles();

    const CONFIG = await loadConfig();
    if (!CONFIG.main || !CONFIG.main.length) {
      console.warn("[category-tabs] Config sem itens em main.");
      return;
    }

    injectUI(CONFIG);
    updateFromRoute(CONFIG);

    window.addEventListener("hashchange", () => updateFromRoute(CONFIG));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

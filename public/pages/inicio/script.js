// public/pages/inicio/sections.js (ou onde você estiver colocando o JS das sections)
(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  const API_PRODUTOS =
    "https://vitrinedoslinks.com.br/app/api/listar-produtos.php";

  // feeds "tipo" (mantém como na SPA)
  const FEEDS = {
    "mais-vendidos": {
      url: "https://vitrinedoslinks.com.br/app/api/listar-mais-vendidos.php",
      title: "MAIS VENDIDOS",
      loader: "Carregando mais vendidos...",
    },
    "frete-gratis": {
      url: "https://vitrinedoslinks.com.br/app/api/listar-frete-gratis.php",
      title: "FRETE GRÁTIS",
      loader: "Carregando frete grátis...",
    },
  };

  // =========================
  // HELPERS
  // =========================
  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toUpperSafe(s) {
    return String(s ?? "").toUpperCase();
  }

  function forceShowFadeIns(scope = document) {
    scope
      .querySelectorAll(".fade-in")
      .forEach((el) => el.classList.add("visible"));
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
    return res.json();
  }

  function loaderHtml(texto) {
    return `
      <div class="section-loader">
        <div class="spinner" aria-hidden="true"></div>
        <div>
          <div class="loader-text">${esc(texto)}</div>
        </div>
      </div>
    `;
  }

  // TÍTULO + BOTÃO: MESMAS CLASSES DA SPA
  function renderHeader({ title, btnHtml, cardsHtml }) {
    return `
      <h2 class="section-title text-center fade-in flex-grow-1 mb-0">
        ${esc(title)}
        ${btnHtml || ""}
      </h2>
      <div class="product-grid mt-3">
        ${cardsHtml}
      </div>
    `;
  }

  function renderMessage(sectionEl, title, sub) {
    sectionEl.innerHTML = `
      <div class="section-loader">
        <div>
          <div class="loader-text">${esc(title)}</div>
          ${sub ? `<div class="loader-sub">${esc(sub)}</div>` : ""}
        </div>
      </div>
    `;
  }

  function ensureCardComponent() {
    if (!window.Components?.renderCard) {
      console.error(
        "Components.renderCard não carregou. Verifique o path do card.js."
      );
      return false;
    }
    return true;
  }

  function pickItems(json) {
    // compatível com variações da sua API
    return json?.items || json?.products || json?.data || [];
  }

  // =========================
  // RENDER: data-type (feeds)
  // =========================
  async function renderByType(sectionEl) {
    if (!ensureCardComponent()) {
      renderMessage(sectionEl, "Erro", "Componente de card não carregou.");
      return;
    }

    const type = (sectionEl.dataset.type || "").trim();
    const def = FEEDS[type];

    if (!def) {
      renderMessage(
        sectionEl,
        "Erro",
        `Tipo "${type}" não cadastrado em FEEDS.`
      );
      return;
    }

    const limit = Number(sectionEl.dataset.limit || 10);

    // override opcional via HTML
    const apiUrl = (sectionEl.dataset.api || def.url).trim();
    const title = (sectionEl.dataset.title || def.title).trim();

    // monta URL com limit
    const url = new URL(apiUrl);
    url.searchParams.set("limit", String(limit));

    sectionEl.innerHTML = loaderHtml(def.loader);

    const json = await fetchJson(url.toString());
    const items = pickItems(json);
    const list = Array.isArray(items) ? items.slice(0, limit) : [];

    if (!list.length) {
      renderMessage(sectionEl, "Vazio", "Nenhum produto encontrado.");
      return;
    }

    const cardsHtml = list
      .map((it) => window.Components.renderCard(it))
      .join("");

    // feeds NÃO precisam de "Mostrar todos" (se quiser no futuro, adiciona aqui)
    sectionEl.innerHTML = renderHeader({
      title: toUpperSafe(title),
      btnHtml: "",
      cardsHtml,
    });

    forceShowFadeIns(sectionEl);
  }

  // =========================
  // RENDER: data-root/data-main/data-sub (listar-produtos.php)
  // =========================
  async function renderMainSub(sectionEl) {
    if (!ensureCardComponent()) {
      renderMessage(sectionEl, "Erro", "Componente de card não carregou.");
      return;
    }

    const root = (sectionEl.dataset.root || "").trim();
    const main = (sectionEl.dataset.main || "").trim();
    const sub = (sectionEl.dataset.sub || "").trim();

    if (!main || !sub) {
      renderMessage(sectionEl, "Erro", "Faltou data-main e/ou data-sub.");
      return;
    }

    const days = Number(sectionEl.dataset.days || 5);
    const limit = Number(sectionEl.dataset.limit || 5);

    const url = new URL(API_PRODUTOS);

    // root é opcional
    if (root) url.searchParams.set("root", root);

    url.searchParams.set("main", main);
    url.searchParams.set("sub", sub);
    url.searchParams.set("days", String(days));
    url.searchParams.set("limit", String(limit));

    sectionEl.innerHTML = loaderHtml(
      "Buscando as melhores ofertas para você..."
    );

    const json = await fetchJson(url.toString());
    const items = pickItems(json);
    const list = Array.isArray(items) ? items.slice(0, limit) : [];

    if (!list.length) {
      renderMessage(sectionEl, "Vazio", "Nenhum produto encontrado.");
      return;
    }

    const cardsHtml = list
      .map((it) => window.Components.renderCard(it))
      .join("");

    const label = (sectionEl.dataset.label || sub).trim();

    // URL do banco (compatível com suas variações)
    const categoryUrl =
      json?.category_url ||
      json?.filters?.category_url ||
      list.find((i) => i && i.category_url)?.category_url ||
      "";

    // prioridade: data-link (manual) > categoryUrl (banco)
    const preferredUrl = (sectionEl.dataset.link || "").trim() || categoryUrl;

    // BOTÃO: MESMAS CLASSES DA SPA
    const btnHtml = preferredUrl
      ? `<a href="${esc(
          preferredUrl
        )}" class="btn btn-warning ms-3" target="_blank" rel="noopener">Mostrar todos</a>`
      : "";

    sectionEl.innerHTML = renderHeader({
      title: toUpperSafe(label),
      btnHtml,
      cardsHtml,
    });

    forceShowFadeIns(sectionEl);
  }

  // =========================
  // HYDRATE AUTOMÁTICO
  // =========================
  async function hydrateSections() {
    const typeSections = document.querySelectorAll("section[data-type]");
    const mainSubs = document.querySelectorAll("section[data-main][data-sub]");

    const jobs = [];

    typeSections.forEach((sec) => {
      jobs.push(
        renderByType(sec).catch((err) => {
          console.error("Erro data-type:", sec.dataset.type, err);
          renderMessage(
            sec,
            "Erro",
            `Não foi possível carregar: ${sec.dataset.type}`
          );
        })
      );
    });

    mainSubs.forEach((sec) => {
      jobs.push(
        renderMainSub(sec).catch((err) => {
          console.error("Erro seção:", sec.dataset.main, sec.dataset.sub, err);
          renderMessage(
            sec,
            "Erro",
            `Não foi possível carregar: ${sec.dataset.main}/${sec.dataset.sub}`
          );
        })
      );
    });

    await Promise.all(jobs);
    forceShowFadeIns(document);
    console.log("[Sections] hydrate concluído");
  }

  document.addEventListener("DOMContentLoaded", hydrateSections);
})();

// public/components/section/section.js
(() => {
  "use strict";

  // Namespace
  window.Components = window.Components || {};
  window.Components.Section = window.Components.Section || {};

  // Defaults (usado apenas quando NÃO houver data-api)
  const DEFAULT_PRODUCTS_API =
    "https://vitrinedoslinks.com.br/app/api/listar-produtos.php";

  // =========================
  // Helpers
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

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
    return res.json();
  }

  function pickItems(json) {
    return (
      (Array.isArray(json?.items) && json.items) ||
      (Array.isArray(json?.products) && json.products) ||
      (Array.isArray(json?.data) && json.data) ||
      []
    );
  }

  function pickCategoryUrl(json, items) {
    return (
      json?.category_url ||
      json?.filters?.category_url ||
      (Array.isArray(items)
        ? items.find((i) => i && i.category_url)?.category_url
        : "") ||
      ""
    );
  }

  // ✅ mesmo botão do SPA (mesmas classes)
  function buildBtnHtml(sectionEl) {
    const link = (sectionEl.dataset.link || "").trim();

    // ✅ Regra: sem data-link, sem botão
    if (!link) return "";

    const text = (sectionEl.dataset.linkText || "").trim() || "Mostrar todos";

    const isInternal = link.startsWith("#/") || link.startsWith("/");
    const dataLinkAttr = isInternal ? ' data-link="1"' : "";

    return `<a href="${esc(
      link
    )}"${dataLinkAttr} class="btn btn-warning ms-3" rel="noopener">${esc(
      text
    )}</a>`;
  }

  function renderHeader({ title, btnHtml, cardsHtml }) {
    return `
      <div class="vd-section-head">
        <h2 class="section-title text-center fade-in flex-grow-1 mb-0">
          ${esc(title)}
          ${btnHtml || ""}
        </h2>
      </div>

      <div class="product-grid mt-3">
        ${cardsHtml}
      </div>
    `;
  }

  function renderCards(items, limit) {
    if (!window.Components?.renderCard) {
      console.error(
        "Components.renderCard não carregou. Verifique o path do card.js."
      );
      return `<p style="padding:10px 0; color:#ff6b6b;">Erro: card component não carregou.</p>`;
    }

    const list = Array.isArray(items) ? items : [];

    // ✅ respeita data-limit (se vier NaN, cai para list.length)
    const n = Number(limit);
    const safeLimit = Number.isFinite(n) && n > 0 ? n : list.length;

    const finalList = list.slice(0, safeLimit);

    if (!finalList.length) {
      return `<p style="padding:10px 0; color:#aaa;">Nenhum produto encontrado.</p>`;
    }

    return finalList.map((it) => window.Components.renderCard(it)).join("");
  }

  // =========================
  // URL builder
  // =========================
  function buildUrlFromSection(sectionEl) {
    const limit = Number(sectionEl.dataset.limit || 10);

    const apiBase = (sectionEl.dataset.api || "").trim();
    if (!apiBase) return "";

    const url = new URL(apiBase);

    // sempre aplica limit
    url.searchParams.set("limit", String(limit));

    // opcionais: só inclui se existir
    const root = (sectionEl.dataset.root || "").trim();
    const main = (sectionEl.dataset.main || "").trim();
    const sub = (sectionEl.dataset.sub || "").trim();
    const days = (sectionEl.dataset.days || "").trim();

    if (root) url.searchParams.set("root", root);
    if (main) url.searchParams.set("main", main);
    if (sub) url.searchParams.set("sub", sub);
    if (days) url.searchParams.set("days", String(Number(days) || 5));

    return url.toString();
  }

  // =========================
  // Render (1 section)
  // =========================
  async function renderSection(sectionEl) {
    // ==========================================================
    // ✅ SPA-safe: re-render somente se a "URL final" mudar
    // (ex.: home limit=5 -> página mais-vendidos limit=100)
    // ==========================================================
    const label =
      sectionEl.dataset.label ||
      sectionEl.dataset.title ||
      sectionEl.dataset.sub ||
      "SEÇÃO";
    const title = toUpperSafe(label);

    const url = buildUrlFromSection(sectionEl);
    if (!url) {
      sectionEl.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">
      Section inválida: informe <code>data-api</code> ou <code>data-main</code> + <code>data-sub</code>.
    </p>`;
      return;
    }

    // Se já renderizou com essa mesma URL (mesmo limit), não faz nada
    const lastUrl = (sectionEl.dataset.lastUrl || "").trim();
    if (lastUrl && lastUrl === url) {
      // opcional: debug
      // console.log("[Section skip] mesma URL:", url);
      return;
    }

    // loader
    sectionEl.innerHTML = loaderHtml("Carregando produtos...");

    const json = await fetchJson(url);
    const items = pickItems(json);

    // respeita data-limit (se vier inválido, usa items.length)
    const n = Number(sectionEl.dataset.limit);
    const limit = Number.isFinite(n) && n > 0 ? n : items.length;

    const cardsHtml = renderCards(items, limit);

    const btnHtml = buildBtnHtml(sectionEl);

    sectionEl.innerHTML = renderHeader({
      title,
      btnHtml,
      cardsHtml,
    });

    // ✅ marca a URL usada (chave real do cache)
    sectionEl.dataset.lastUrl = url;
    sectionEl.dataset.lastRenderAt = String(Date.now());

    // diagnóstico
    // console.log("[Section OK]", {
    //   label: title,
    //   url,
    //   api_count: json?.count,
    //   items_len: items.length,
    //   data_limit: sectionEl.dataset.limit,
    //   rendered: sectionEl.querySelectorAll(".product-cell").length,
    // });

    forceShowFadeIns(sectionEl);
  }

  // =========================
  // Hydrate (scope)
  // =========================
  async function hydrateAllSections(scope = document) {
    const sections = Array.from(
      scope.querySelectorAll("section[data-api], section[data-main][data-sub]")
    );
    if (!sections.length) return;

    await Promise.all(
      sections.map((sec) =>
        renderSection(sec).catch((err) => {
          console.error("[Section] erro:", err);
          sec.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">
            Erro ao carregar seção: ${esc(
              sec.dataset.label || sec.dataset.api || ""
            )}
          </p>`;
        })
      )
    );

    forceShowFadeIns(scope);
  }

  // expõe
  window.Components.Section.hydrateAll = hydrateAllSections;

  // =========================
  // ✅ SPA-safe auto-hydrate via MutationObserver
  // (funciona quando o router injeta HTML depois)
  // =========================
  const obs = new MutationObserver((mutations) => {
    const spaView = document.getElementById("spa-view");

    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        // ✅ Se existe SPA, só reage a mudanças dentro do #spa-view
        if (spaView && !spaView.contains(node)) continue;

        if (node.matches?.("section[data-api], section[data-main][data-sub]")) {
          window.Components.Section.rehydrate(spaView || document);
          continue;
        }

        if (
          node.querySelector?.(
            "section[data-api], section[data-main][data-sub]"
          )
        ) {
          window.Components.Section.rehydrate(spaView || node);
        }
      }
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });

  obs.observe(document.body, { childList: true, subtree: true });

  // ✅ limpa flags para permitir re-render (SPA)
  function resetHydration(scope = document) {
    const sections = scope.querySelectorAll(
      "section[data-api], section[data-main][data-sub]"
    );
    sections.forEach((sec) => {
      sec.dataset.hydrated = "0";
    });
  }

  // ✅ rehidrata SEM depender de DOMContentLoaded
  async function rehydrate(scope = document) {
    resetHydration(scope);
    await hydrateAllSections(scope);
  }

  // expõe
  window.Components.Section.reset = resetHydration;
  window.Components.Section.rehydrate = rehydrate;

  // fallback para páginas não-SPA
  document.addEventListener("DOMContentLoaded", () => {
    hydrateAllSections(document);
  });
})();

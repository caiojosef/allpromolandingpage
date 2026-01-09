window.__page = {
  init() {
    // =========================
    // 1) CONFIG SIMPLES (você só mexe aqui)
    // =========================

    const API_PRODUTOS =
      "https://vitrinedoslinks.com.br/app/api/listar-produtos.php";

    // NOVAS APIS "tipo feed" (limit apenas)
    // Para adicionar outra API no futuro:
    // FEEDS["nome-do-type"] = { url:"...", title:"...", loader:"..." }
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
    // 2) HELPERS
    // =========================

    function forceShowFadeIns(scope = document) {
      scope
        .querySelectorAll(".fade-in")
        .forEach((el) => el.classList.add("visible"));
    }

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

    async function fetchJson(url) {
      const res = await fetch(url, { cache: "no-store" });
      return res.json();
    }

    // =========================
    // 3) RENDER POR TIPO (data-type)
    // =========================
    async function renderByType(sectionEl) {
      const type = sectionEl.dataset.type;
      const def = FEEDS[type];

      if (!def) {
        sectionEl.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">
          Tipo "${esc(type)}" não cadastrado em FEEDS.
        </p>`;
        return;
      }

      const limit = Number(sectionEl.dataset.limit || 5);

      // permite override via HTML:
      // <section data-type="x" data-api="https://..." ...>
      const apiUrl = sectionEl.dataset.api || def.url;

      // permite override do título via HTML:
      // <section data-type="x" data-title="..." ...>
      const title = sectionEl.dataset.title || def.title;

      const url = new URL(apiUrl);
      url.searchParams.set("limit", String(limit));

      sectionEl.innerHTML = loaderHtml(def.loader);

      const json = await fetchJson(url.toString());
      sessionStorage.setItem(`${type}:limit:${limit}`, JSON.stringify(json));

      const items = Array.isArray(json.items) ? json.items : [];
      const cardsHtml = items
        .map((it) => window.Components.renderCard(it))
        .join("");

      sectionEl.innerHTML = renderHeader({
        title,
        btnHtml: "",
        cardsHtml,
      });

      forceShowFadeIns(sectionEl);
    }

    // =========================
    // 4) RENDER MAIN/SUB (data-main + data-sub)
    // =========================
    async function renderMainSub(sectionEl) {
      const main = sectionEl.dataset.main;
      const sub = sectionEl.dataset.sub;

      const days = Number(sectionEl.dataset.days || 5);
      const limit = Number(sectionEl.dataset.limit || 5);

      const url = new URL(API_PRODUTOS);
      url.searchParams.set("main", main);
      url.searchParams.set("sub", sub);
      url.searchParams.set("days", String(days));
      url.searchParams.set("limit", String(limit));

      sectionEl.innerHTML = loaderHtml(
        "Buscando as melhores ofertas para você..."
      );

      const json = await fetchJson(url.toString());
      sessionStorage.setItem(
        `products:${main}:${sub}:${days}:${limit}`,
        JSON.stringify(json)
      );

      const items = Array.isArray(json.items) ? json.items : [];
      const cardsHtml = items
        .map((it) => window.Components.renderCard(it))
        .join("");

      const label = sectionEl.dataset.label ? sectionEl.dataset.label : sub;

      const categoryUrl =
        json?.category_url ||
        json?.filters?.category_url ||
        items.find((i) => i && i.category_url)?.category_url ||
        "";

      const btnHtml = categoryUrl
        ? `<a href="${esc(
            categoryUrl
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
    // 5) HYDRATE HOME (automático pelo HTML)
    // =========================
    async function hydrateHome() {
      const typeSections = document.querySelectorAll("section[data-type]");
      const mainSubs = document.querySelectorAll(
        "section[data-main][data-sub]"
      );

      const jobs = [];

      typeSections.forEach((sec) => {
        jobs.push(
          renderByType(sec).catch((err) => {
            console.error("Erro data-type:", sec.dataset.type, err);
            sec.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">Erro ao carregar ${esc(
              sec.dataset.type
            )}</p>`;
          })
        );
      });

      mainSubs.forEach((sec) => {
        jobs.push(
          renderMainSub(sec).catch((err) => {
            console.error(
              "Erro seção:",
              sec.dataset.main,
              sec.dataset.sub,
              err
            );
            sec.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">Erro ao carregar ${esc(
              sec.dataset.main
            )}/${esc(sec.dataset.sub)}</p>`;
          })
        );
      });

      await Promise.all(jobs);
      forceShowFadeIns(document);
      console.log("[Home] hydrate concluído");
    }

    hydrateHome();
  },

  destroy() {},
};

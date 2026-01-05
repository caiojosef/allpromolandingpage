window.__page = {
  init() {
    const API_PRODUTOS =
      "https://vitrinedoslinks.com.br/app/api/listar-produtos.php";
    const API_MAIS_VENDIDOS =
      "https://vitrinedoslinks.com.br/app/api/listar-mais-vendidos.php";

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

    async function renderMaisVendidos(sectionEl) {
      const limit = Number(sectionEl.dataset.limit || 10);

      const url = new URL(API_MAIS_VENDIDOS);
      url.searchParams.set("limit", String(limit));

      sectionEl.innerHTML = loaderHtml("Carregando mais vendidos...");

      const json = await fetchJson(url.toString());
      sessionStorage.setItem(
        `mais-vendidos:limit:${limit}`,
        JSON.stringify(json)
      );

      const items = Array.isArray(json.items) ? json.items : [];
      const cardsHtml = items
        .map((it) => window.Components.renderCard(it))
        .join("");

      sectionEl.innerHTML = renderHeader({
        title: "MAIS VENDIDOS",
        btnHtml: "",
        cardsHtml,
      });

      // garante que o que acabou de ser injetado fique visível
      forceShowFadeIns(sectionEl);
    }

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

      // título: usa data-label se existir (ex.: Pré-treino)
      const label = sectionEl.dataset.label ? sectionEl.dataset.label : sub;

      // botão "Mostrar todos" só se existir URL
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

      // garante visibilidade
      forceShowFadeIns(sectionEl);
    }

    async function hydrateHome() {
      const maisVendidos = document.querySelectorAll(
        'section[data-type="mais-vendidos"]'
      );

      const mainSubs = document.querySelectorAll(
        "section[data-main][data-sub]"
      );

      const jobs = [];

      maisVendidos.forEach((sec) => {
        jobs.push(
          renderMaisVendidos(sec).catch((err) => {
            console.error("Erro mais-vendidos:", err);
            sec.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">Erro ao carregar Mais Vendidos</p>`;
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
            sec.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">Erro ao carregar ${sec.dataset.main}/${sec.dataset.sub}</p>`;
          })
        );
      });

      await Promise.all(jobs);

      // garante que qualquer fade-in restante apareça (caso algum html tenha sido criado fora das sections)
      forceShowFadeIns(document);

      console.log("[Home] hydrate concluído");
    }

    hydrateHome();
  },

  destroy() {
    // Se depois você adicionar listeners específicos da Home, remova aqui.
  },
};

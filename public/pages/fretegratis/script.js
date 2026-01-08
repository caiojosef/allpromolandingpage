// public/pages/fretegratis/script.js
window.__page = (() => {
  const FEED_URL =
    "https://vitrinedoslinks.com.br/app/api/listar-frete-gratis.php";

  let version = 0;

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function renderSection({ title, btnHtml, cardsHtml }) {
    return `
      <h2 class="section-title text-center fade-in flex-grow-1 mb-0">
        ${esc(title)}
        ${btnHtml || ""}
      </h2>
      <div class="product-grid mt-3">${cardsHtml}</div>
    `;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao buscar ${url} (${res.status})`);
    return res.json();
  }

  async function renderFreteGratis(sectionEl, v = 0) {
    if (
      !window.Components ||
      typeof window.Components.renderCard !== "function"
    ) {
      sectionEl.innerHTML = `
        <p style="padding:10px 0; color:#ff6b6b;">
          Erro: Components.renderCard não está disponível. Verifique se /public/components/card/card.js carrega antes do SPA.
        </p>
      `;
      return;
    }

    const limit = Number(sectionEl.dataset.limit || 50);

    const url = new URL(FEED_URL);
    url.searchParams.set("limit", String(limit));

    // Sempre mostra loader e SEMPRE busca
    sectionEl.innerHTML = loaderHtml("Carregando frete grátis...");

    const json = await fetchJson(url.toString());

    // Se o usuário trocou de rota enquanto carregava, ignora este resultado
    if (v !== version) return;

    const items = Array.isArray(json.items) ? json.items : [];
    const cardsHtml = items
      .map((it) => window.Components.renderCard(it))
      .join("");

    const allUrl =
      json?.category_url ||
      json?.filters?.category_url ||
      json?.url ||
      items.find((i) => i && i.category_url)?.category_url ||
      "";

    const btnHtml = allUrl
      ? `<a href="${esc(
          allUrl
        )}" class="btn btn-warning ms-3" target="_blank" rel="noopener">Mostrar todos</a>`
      : "";

    sectionEl.innerHTML = renderSection({
      title: "FRETE GRÁTIS",
      btnHtml,
      cardsHtml,
    });

    forceShowFadeIns(sectionEl);
  }

  async function applyState() {
    const v = ++version;

    const sec = document.querySelector('section[data-type="frete-gratis"]');
    if (!sec) {
      console.warn(
        '[Frete Grátis] Nenhuma section[data-type="frete-gratis"] encontrada.'
      );
      return;
    }

    await renderFreteGratis(sec, v).catch((err) => {
      if (v !== version) return;
      console.error("[Frete Grátis] erro:", err);
      sec.innerHTML = `
        <p style="padding:10px 0; color:#ff6b6b;">
          Erro ao carregar frete grátis.
        </p>
      `;
    });

    if (v !== version) return;
    forceShowFadeIns(document);
    console.log("[Frete Grátis] carregado");
  }

  return {
    init() {
      applyState();
    },
    onRouteChange() {
      applyState();
    },
    destroy() {
      version++; // invalida respostas em voo
    },
  };
})();

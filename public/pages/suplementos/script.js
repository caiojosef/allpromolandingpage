// public/pages/suplementos/script.js
window.__page = (() => {
  const API_PRODUTOS =
    "https://vitrinedoslinks.com.br/app/api/listar-produtos.php";

  let version = 0;

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
        <div><div class="loader-text">${esc(texto)}</div></div>
      </div>
    `;
  }

  function renderHeader({ title, btnHtml, cardsHtml }) {
    return `
      <h2 class="section-title text-center fade-in flex-grow-1 mb-0">
        ${esc(title)}
        ${btnHtml || ""}
      </h2>
      <div class="product-grid mt-3">${cardsHtml}</div>
    `;
  }

  function setVisible(el, show) {
    el.style.display = show ? "" : "none";
  }

  function getRelatedDividers(sectionEl) {
    const related = [];
    const prev = sectionEl.previousElementSibling;
    const next = sectionEl.nextElementSibling;

    if (prev && prev.tagName === "HR" && prev.classList.contains("gc-divider"))
      related.push(prev);
    if (next && next.tagName === "HR" && next.classList.contains("gc-divider"))
      related.push(next);

    return related;
  }

  function sameSub(a, b) {
    return (
      String(a || "")
        .trim()
        .toLowerCase() ===
      String(b || "")
        .trim()
        .toLowerCase()
    );
  }

  function applyFilter(sections, sub) {
    sections.forEach((sec) => {
      const match = sub === "__all__" ? true : sameSub(sec.dataset.sub, sub);
      setVisible(sec, match);
      getRelatedDividers(sec).forEach((hr) => setVisible(hr, match));
    });
  }

  function getState(route) {
    const q = route?.query || window.__route?.query || {};
    const sub = q.sub ? String(q.sub) : "__all__";
    const limit = q.limit ? Number(q.limit) : 100;
    return { sub, limit: Number.isFinite(limit) ? limit : 100 };
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao buscar ${url} (${res.status})`);
    return res.json();
  }

  async function renderMainSub(sectionEl, limitOverride = null, v = 0) {
    const main = sectionEl.dataset.main;
    const sub = sectionEl.dataset.sub;

    const days = Number(sectionEl.dataset.days || 5);
    const limit = Number(limitOverride ?? sectionEl.dataset.limit ?? 10);

    const url = new URL(API_PRODUTOS);
    url.searchParams.set("main", main);
    url.searchParams.set("sub", sub);
    url.searchParams.set("days", String(days));
    url.searchParams.set("limit", String(limit));

    // Sempre mostra loader e SEMPRE busca
    sectionEl.innerHTML = loaderHtml(
      "Buscando as melhores ofertas para você..."
    );

    const json = await fetchJson(url.toString());

    // Se o usuário clicou em outra sub enquanto carregava, ignora este resultado
    if (v !== version) return;

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

  async function applyState(state) {
    const v = ++version;

    const sections = Array.from(
      document.querySelectorAll('section[data-main="suplementos"][data-sub]')
    );
    if (!sections.length) return;

    const { sub, limit } = state;

    if (sub === "__all__") {
      applyFilter(sections, "__all__");

      await Promise.all(
        sections.map((sec) =>
          renderMainSub(sec, null, v).catch((err) => {
            if (v !== version) return;
            console.error("Erro seção:", sec.dataset.sub, err);
            sec.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">Erro ao carregar ${esc(
              sec.dataset.sub
            )}</p>`;
          })
        )
      );

      if (v !== version) return;
      forceShowFadeIns(document);
      return;
    }

    // sub específica: mostra só a section escolhida e faz fetch com limit override (ex: 100)
    applyFilter(sections, sub);

    const sec = sections.find((s) => sameSub(s.dataset.sub, sub));
    if (!sec) return;

    await renderMainSub(sec, limit || 100, v).catch((err) => {
      if (v !== version) return;
      console.error("Erro seção:", sub, err);
      sec.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">Erro ao carregar ${esc(
        sub
      )}</p>`;
    });

    if (v !== version) return;
    forceShowFadeIns(document);
  }

  return {
    init() {
      applyState(getState(window.__route));
    },
    onRouteChange(route) {
      applyState(getState(route));
    },
    destroy() {
      version++; // invalida respostas em voo
    },
  };
})();

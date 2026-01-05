document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // CONFIG
  // =========================
  const API_BASE = "https://vitrinedoslinks.com.br/app/api/listar-produtos.php";

  const spaView = document.getElementById("spa-view");
  if (!spaView) {
    console.error("Não encontrei #spa-view no HTML.");
    return;
  }

  // =========================
  // FADE-IN (opcional)
  // =========================
  const fadeObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  function observeFadeIns(scope = document) {
    scope
      .querySelectorAll(".fade-in:not(.visible)")
      .forEach((el) => fadeObserver.observe(el));
  }

  // =========================
  // HELPERS (simples)
  // =========================
  function buildUrl(main, sub, days, limit) {
    const url = new URL(API_BASE);
    url.searchParams.set("main", main);
    url.searchParams.set("sub", sub);
    url.searchParams.set("days", String(days));
    url.searchParams.set("limit", String(limit));
    return url.toString();
  }

  function toUpperSafe(s) {
    return String(s ?? "").toUpperCase();
  }

  function dotToCommaMoney(v) {
    const s = String(v ?? "");
    return s.includes(".") ? s.replace(".", ",") : s;
  }

  function normalizeDiscount(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "";
    return `-${n}%`;
  }

  // evita quebrar HTML se tiver aspas/sinais
  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // =========================
  // RENDER (AGORA COM ${})
  // =========================

  function renderHeader({ sub, btnHtml, cardsHtml }) {
    return `
      <h2 class="section-title text-center fade-in flex-grow-1 mb-0">
        ${esc(sub)}
        ${btnHtml}
      </h2>
      <div class="product-grid mt-3">
        ${cardsHtml}
      </div>
    `;
  }

  function renderCard(item) {
    // pega do JSON -> variáveis
    const affiliate_url = item.affiliate_url || item.product_url || "#";
    const title = item.title || "";
    const source_image_url =
      item.source_image_url || item.local_image_path || "";
    const shipping_label = item.shipping_label || "";

    const rating_avg = item.rating_avg ?? "";
    const rating_count = item.rating_count ?? "";

    const price_original = dotToCommaMoney(item.price_original ?? "");
    const discount_percent = normalizeDiscount(item.discount_percent);
    const price_current = dotToCommaMoney(item.price_current ?? "");

    const installments_max = item.installments_max
      ? `${item.installments_max}x`
      : "";
    const installment_value = dotToCommaMoney(item.installment_value ?? "");

    const marketplace = item.marketplace || "";

    const tag1 = item.badge_top_seller === "1" ? "Top vendas" : "";
    const tag2 = item.badge_mercado_lider === "1" ? "Mercado Líder" : "";
    const tag3 = item.badge_oficial === "1" ? "Loja oficial" : "";

    // ---- condicionais para não imprimir coisa vazia (adeus quadradinho)
    const badgeFreteHtml = shipping_label
      ? `<span class="product-badge product-badge--frete">${esc(
          shipping_label
        )}</span>`
      : "";

    const priceRowHtml =
      price_original || discount_percent
        ? `
        <div class="price-row">
          <span class="price-old">${esc(price_original)}</span>
          <span class="price-pill">${esc(discount_percent)}</span>
        </div>
      `
        : "";

    const installmentsHtml =
      installments_max && installment_value
        ? `ou <strong>${esc(installments_max)}</strong> de <strong>R$ ${esc(
            installment_value
          )}</strong>`
        : "";

    const tagsArr = [tag1, tag2, tag3].filter(Boolean);
    const tagsHtml = tagsArr.length
      ? tagsArr.map((t) => `<span class="tag">${esc(t)}</span>`).join("")
      : "";

    return `
      <div class="product-cell fade-in">
        <a href="${esc(
          affiliate_url
        )}" target="_blank" class="product-link" aria-label="Abrir produto: ${esc(
      title
    )}">
          <div class="product-card">

            <div class="product-badges">
              ${badgeFreteHtml}
            </div>

            <div class="product-media">
              <img src="${esc(
                source_image_url
              )}" class="product-img" alt="${esc(title)}" loading="lazy" />
            </div>

            <div class="product-body">
              <h3 class="product-title">${esc(title)}</h3>

              <div class="product-rating">
              </div>
              
              <div class="product-prices">
              <span class="rating-stars">★★★★☆</span>
              <span class="rating-text">${esc(rating_avg)}</span>
             <!-- <span class="rating-text">${esc(rating_avg)} (${esc(
    rating_count
  )})</span> -->
                ${priceRowHtml}

                <div class="price-main">R$ ${esc(price_current)}</div>

                <div class="price-meta">
                  <div class="price-pix">À vista: <strong>R$ ${esc(
                    price_current
                  )}</strong></div>
                  <div class="price-installments">${installmentsHtml}</div>
                </div>
              </div>

              <!-- <div class="product-seller">Vendido por: <strong>${esc(
                marketplace
              )}</strong></div>

              <div class="product-tags">
                ${tagsHtml}
              </div> -->
            </div>

            <!--<div class="product-footer">
              <span class="product-btn" role="button">Ver produto</span>
            </div> -->

          </div>
        </a>
      </div>
    `;
  }

  // =========================
  // FETCH + RENDER SECTION
  // =========================
  async function renderOneSection(sectionEl) {
    const main = sectionEl.dataset.main;
    const sub = sectionEl.dataset.sub;

    const days = Number(sectionEl.dataset.days || 5);
    const limit = Number(sectionEl.dataset.limit || 5);

    const url = buildUrl(main, sub, days, limit);

    // loader
    sectionEl.innerHTML = `
      <div class="section-loader">
        <div class="spinner" aria-hidden="true"></div>
        <div>
          <div class="loader-text">Estamos buscando as melhores ofertas para você!!!</div>
        </div>
      </div>
    `;

    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    // cache p/ debug
    const cacheKey = `products:${main}:${sub}:${days}:${limit}`;
    sessionStorage.setItem(cacheKey, JSON.stringify(json));
    console.log("[FETCH OK]", cacheKey, json);

    const items = Array.isArray(json.items) ? json.items : [];

    // tenta achar category_url em qualquer lugar
    const categoryUrl =
      json?.category_url ||
      json?.filters?.category_url ||
      items.find((i) => i && i.category_url)?.category_url ||
      "";

    // monta cards
    const cardsHtml = items.map(renderCard).join("");

    // botão mostrar todos (só se tiver URL)
    const btnHtml = categoryUrl
      ? `<a href="${esc(
          categoryUrl
        )}" class="btn btn-warning ms-3" target="_blank" rel="noopener">Mostrar todos</a>`
      : "";

    // monta header + grid
    sectionEl.innerHTML = renderHeader({
      sub: toUpperSafe(sub),
      btnHtml,
      cardsHtml,
    });
  }

  function humanize(text) {
    return String(text ?? "")
      .split("-")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");
  }

  function buildMainCategoriesUI() {
    const spaView = document.getElementById("spa-view");
    const allSections = Array.from(
      spaView.querySelectorAll("section[data-main][data-sub]")
    );

    if (!allSections.length) return;

    // Agrupa por main
    const groups = new Map();
    allSections.forEach((sec) => {
      const main = sec.dataset.main;
      if (!groups.has(main)) groups.set(main, []);
      groups.get(main).push(sec);
    });

    // Para scroll + active
    const subButtonsIndex = new Map(); // key: `${main}|${sub}` -> button

    // Reestrutura o DOM: cria um wrapper por main
    groups.forEach((sections, main) => {
      const wrapper = document.createElement("div");
      wrapper.className = "main-block";
      wrapper.dataset.main = main;

      const header = document.createElement("div");
      header.className = "main-header";

      const title = document.createElement("h1");
      title.className = "main-title";
      title.textContent = String(main).toUpperCase();

      const subnav = document.createElement("div");
      subnav.className = "subnav";

      // Gera botões das subs
      sections.forEach((sec) => {
        const sub = sec.dataset.sub;

        // garante um id para scroll
        if (!sec.id) sec.id = `sec-${main}-${sub}`.replaceAll(" ", "-");

        const label = sec.dataset.label || humanize(sub);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "subnav-btn";
        btn.textContent = label;

        btn.addEventListener("click", () => {
          document
            .querySelectorAll(`.main-block[data-main="${main}"] .subnav-btn`)
            .forEach((b) => b.classList.remove("is-active"));

          btn.classList.add("is-active");
          sec.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        subButtonsIndex.set(`${main}|${sub}`, btn);
        subnav.appendChild(btn);
      });

      header.appendChild(title);
      header.appendChild(subnav);

      const body = document.createElement("div");
      body.className = "main-body";

      // Move as sections (e também HRs imediatamente antes delas, se você usar)
      sections.forEach((sec) => {
        const prev = sec.previousElementSibling;
        if (prev && prev.tagName === "HR") body.appendChild(prev);
        body.appendChild(sec);
      });

      wrapper.appendChild(header);
      wrapper.appendChild(body);

      // Insere o wrapper antes da primeira seção do grupo (que já foi movida, então usa spaView)
      spaView.appendChild(wrapper);

      // ativa a primeira sub do main como default
      const firstSub = sections[0]?.dataset.sub;
      if (firstSub)
        subButtonsIndex.get(`${main}|${firstSub}`)?.classList.add("is-active");
    });

    // Opcional: atualizar botão ativo conforme o scroll (melhor UX)
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const sec = entry.target;
          const main = sec.dataset.main;
          const sub = sec.dataset.sub;

          document
            .querySelectorAll(`.main-block[data-main="${main}"] .subnav-btn`)
            .forEach((b) => b.classList.remove("is-active"));

          const btn = subButtonsIndex.get(`${main}|${sub}`);
          if (btn) btn.classList.add("is-active");
        });
      },
      { threshold: 0.35 }
    );

    allSections.forEach((sec) => io.observe(sec));
  }

  async function hydrateIndexSections() {
    const sections = spaView.querySelectorAll("section[data-main][data-sub]");
    if (!sections.length) {
      console.warn(
        "Nenhuma <section data-main data-sub> encontrada dentro de #spa-view."
      );
      return;
    }

    await Promise.all(
      Array.from(sections).map((sec) =>
        renderOneSection(sec).catch((err) => {
          console.error(
            "Erro ao renderizar seção:",
            sec.dataset.main,
            sec.dataset.sub,
            err
          );
          sec.innerHTML = `<p style="padding:10px 0; color:#ff6b6b;">Erro ao carregar ${sec.dataset.main}/${sec.dataset.sub}</p>`;
        })
      )
    );

    observeFadeIns(spaView);
  }

  // =========================
  // INIT
  // =========================
 
  hydrateIndexSections();
});

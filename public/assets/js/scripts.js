/* ========================================================================
   /public/assets/js/scripts.js
   - Mantém seu script atual (ex: sponsorCarousel)
   - ADICIONA a hidratação da HOME (Mais Vendidos + Frete Grátis) no final
   ======================================================================== */

/* --- SEU CÓDIGO ATUAL (exemplo: sponsor carousel) --- */
(() => {
  const root = document.getElementById("sponsorCarousel");
  const inner = document.getElementById("sponsorCarouselInner");
  const tpl = document.getElementById("tplSponsorSlide");

  if (!root || !inner || !tpl) return;

  const SPONSORS = [
    {
      desktopSrc: "public/images/glow.jpg",
      mobileSrc: "public/images/glow-mobile.webp",
      href: "glow.html",
      alt: "GlowCorps",
      badge: "Patrocínio",
    },
  ];

  inner.innerHTML = "";

  SPONSORS.forEach((s, idx) => {
    const frag = tpl.content.cloneNode(true);

    const item = frag.querySelector(".carousel-item");
    const link = frag.querySelector(".sponsor-link");
    const badge = frag.querySelector(".sponsor-badge");
    const img = frag.querySelector(".sponsor-img");
    const srcMobile = frag.querySelector(".sponsor-src-mobile");

    item.classList.toggle("active", idx === 0);

    link.href = s.href || "#";
    link.setAttribute(
      "aria-label",
      s.alt ? `Abrir: ${s.alt}` : "Abrir patrocinador"
    );

    badge.textContent = s.badge || "Patrocínio";
    img.src = s.desktopSrc;
    img.alt = s.alt || "Patrocinador";
    srcMobile.srcset = s.mobileSrc || s.desktopSrc;

    inner.appendChild(frag);
  });

  const controls = root.querySelectorAll(".sponsor-control");
  if (SPONSORS.length <= 1) {
    controls.forEach((btn) => (btn.style.display = "none"));
    root.removeAttribute("data-bs-ride");
  }

  const carousel = bootstrap.Carousel.getOrCreateInstance(root, {
    interval: 4500,
    pause: "hover",
    ride: SPONSORS.length > 1 ? "carousel" : false,
    touch: true,
  });

  const pause = () => carousel.pause();
  const play = () => carousel.cycle();

  root.addEventListener("mouseenter", pause);
  root.addEventListener("mouseleave", play);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", play);
})();

/* ========================================================================
   HOME: Mais Vendidos + Frete Grátis (usa Components.renderCard)
   IDs esperados no index.html:
   - #homeMaisVendidosGrid
   - #homeFreteGratisGrid
   ======================================================================== */
(() => {
  "use strict";

  const HOME = {
    limit: 10,
    endpoints: {
      maisVendidos:
        "https://vitrinedoslinks.com.br/app/api/listar-mais-vendidos.php",
      freteGratis:
        "https://vitrinedoslinks.com.br/app/api/listar-frete-gratis.php",
    },
  };

  function pickItems(json) {
    // Suporta os formatos mais comuns (ajuste fino quando você me mandar 1 resposta real)
    const direct =
      json?.items ||
      json?.products ||
      json?.data ||
      json?.rows ||
      json?.results ||
      json?.itens;

    if (Array.isArray(direct)) return direct;

    // Alguns endpoints devolvem dentro de "payload" ou "result"
    const nested =
      json?.payload?.items ||
      json?.payload?.products ||
      json?.result?.items ||
      json?.result?.products;

    if (Array.isArray(nested)) return nested;

    return [];
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
    return res.json();
  }

  function renderLoader(gridEl, sub) {
    gridEl.innerHTML = `
      <div class="section-loader">
        <span class="spinner" aria-hidden="true"></span>
        <div>
          <div class="loader-text">Carregando…</div>
          <div class="loader-sub">${sub}</div>
        </div>
      </div>
    `;
  }

  function renderMessage(gridEl, title, sub) {
    gridEl.innerHTML = `
      <div class="section-loader">
        <div>
          <div class="loader-text">${title}</div>
          <div class="loader-sub">${sub}</div>
        </div>
      </div>
    `;
  }

  function renderCards(gridEl, items) {
    if (!window.Components?.renderCard) {
      console.error(
        "Components.renderCard não carregou. Verifique o path do card.js."
      );
      renderMessage(gridEl, "Erro", "Componente de card não carregou.");
      return;
    }

    const list = Array.isArray(items) ? items.slice(0, HOME.limit) : [];
    if (!list.length) {
      renderMessage(gridEl, "Vazio", "Nenhum produto encontrado.");
      return;
    }

    gridEl.innerHTML = list
      .map((it) => window.Components.renderCard(it))
      .join("");

    // Fade-in automático (sem depender do seu observer global)
    requestAnimationFrame(() => {
      gridEl
        .querySelectorAll(".fade-in")
        .forEach((el) => el.classList.add("visible"));
    });
  }

  async function hydrate(gridId, url, loaderSub) {
    const gridEl = document.getElementById(gridId);
    if (!gridEl) return;

    renderLoader(gridEl, loaderSub);

    try {
      const json = await fetchJson(url);

      // Se sua API tiver "ok": false, já mostra mensagem amigável
      if (json && json.ok === false) {
        renderMessage(
          gridEl,
          "Erro",
          json.message || "A API retornou ok=false."
        );
        return;
      }

      const items = pickItems(json);
      renderCards(gridEl, items);
    } catch (e) {
      console.error(e);
      renderMessage(gridEl, "Erro", "Não foi possível carregar os produtos.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    hydrate(
      "homeMaisVendidosGrid",
      HOME.endpoints.maisVendidos,
      "Buscando os mais vendidos."
    );
    hydrate(
      "homeFreteGratisGrid",
      HOME.endpoints.freteGratis,
      "Buscando ofertas com frete grátis."
    );
  });
})();

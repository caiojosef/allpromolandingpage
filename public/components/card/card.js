// public/components/card.js
(() => {
  // cria namespace (se não existir)
  window.Components = window.Components || {};

  // helpers locais (component deve ser independente)
  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  window.Components.renderCard = function renderCard(item) {
    // pega do JSON -> variáveis (seu código, só isolado)
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

    // condicionais
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

              <div class="product-prices">
                <span class="rating-stars">★★★★☆</span>
                <span class="rating-text">${esc(rating_avg)}<!-- (${esc(
      rating_count
    )}) --></span>

                ${priceRowHtml}

                <div class="price-main">R$ ${esc(price_current)}</div>

                <div class="price-meta">
                  <div class="price-pix">À vista: <strong>R$ ${esc(
                    price_current
                  )}</strong></div>
                  <div class="price-installments">${installmentsHtml}</div>
                </div>
              </div>

              <!--
              <div class="product-seller">Vendido por: <strong>${esc(
                marketplace
              )}</strong></div>
              <div class="product-tags">${tagsHtml}</div>
              -->
            </div>

          </div>
        </a>
      </div>
    `;
  };
})();

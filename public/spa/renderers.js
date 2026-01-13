// public/spa/renderers.js

function escAttr(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function dataAttr(name, value) {
  if (value === undefined || value === null) return "";
  const s = String(value).trim();
  if (!s) return "";
  return ` data-${name}="${escAttr(s)}"`;
}

function dataAttrNum(name, value) {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return ` data-${name}="${n}"`;
}

function isParentRoute(route) {
  return Array.isArray(route?.children) && route.children.length > 0;
}

function getBackHref(route) {
  // prioridade: header.link > route.parent > vazio
  const explicit = (route?.header?.link || "").trim();
  if (explicit) return explicit;
  if (route?.parent) return `#${route.parent}`;
  return "";
}

function buildTrail(routesMap, path) {
  const trail = [];
  let current = path;
  const guard = new Set();

  while (current && routesMap[current] && !guard.has(current)) {
    guard.add(current);
    const r = routesMap[current];
    trail.unshift({ title: r.title || current, path: current });
    current = r.parent || "";
  }

  return trail;
}

function renderBreadcrumb(trail) {
  if (!trail.length) return "";

  const parts = trail.map((item, idx) => {
    const isLast = idx === trail.length - 1;

    if (isLast) {
      return `<span class="vd-bc-current">${escAttr(item.title)}</span>`;
    }

    return `<a class="vd-bc-link" href="#${escAttr(
      item.path
    )}" data-link="1">${escAttr(item.title)}</a>`;
  });

  return `
    <nav class="vd-breadcrumb" aria-label="breadcrumb">
      ${parts.join(`<span class="vd-bc-sep">/</span>`)}
    </nav>
  `;
}

function renderTop(routesMap, path, route) {
  const trail = buildTrail(routesMap, path);
  const breadcrumbHtml = renderBreadcrumb(trail);

  const backHref = getBackHref(route);
  const backText = escAttr(route?.header?.buttonText || "Voltar");

  const backBtn = backHref
    ? `<a href="${escAttr(
        backHref
      )}" data-link="1" class="btn btn-outline-warning btn-sm vd-route-btn">${backText}</a>`
    : "";

  // ✅ Pai: breadcrumb + H1 + botão
  if (isParentRoute(route)) {
    const title = escAttr(route?.header?.title || route.title || "");
    return `
      <header class="vd-route-head">
        <div class="vd-route-meta">
          ${breadcrumbHtml}
          <h1 class="vd-route-title">${title}</h1>
        </div>
        <div class="vd-route-actions">${backBtn}</div>
      </header>
    `;
  }

  // ✅ Filho: breadcrumb + botão (compacto, sem H1)
  return `
    <header class="vd-route-head vd-route-head--compact">
      <div class="vd-route-meta">
        ${breadcrumbHtml}
      </div>
      <div class="vd-route-actions">${backBtn}</div>
    </header>
  `;
}

export function renderSectionsRoute(viewEl, route, routesMap, path) {
  const sections = Array.isArray(route?.sections) ? route.sections : [];

  const topHtml = renderTop(routesMap, path, route);

  const sectionsHtml = sections
    .map((s) => {
      const hrTop = s.divider ? `<hr class="gc-divider"/>` : "";
      const hrBottom = s.divider ? `<hr class="gc-divider" />` : "";

      const api = (s.api || "").trim();
      const label = (s.label ?? s.title ?? "").toString();

      return `
        <hr class="gc-divider"/>
        <section
          ${dataAttr("api", api)}
          ${dataAttrNum("limit", s.limit ?? 10)}
          ${dataAttrNum("days", s.days)}
          ${dataAttr("label", label)}
          ${dataAttr("link", s.link)}
          ${dataAttr("link-text", s.buttonText)}
          ${dataAttr("root", s.root)}
          ${dataAttr("main", s.main)}
          ${dataAttr("sub", s.sub)}
        ></section>
        ${hrBottom}
      `;
    })
    .join("");

  // ✅ “grupo” só nos pais
  const html = isParentRoute(route)
    ? `
      ${topHtml}
      <div class="vd-group">
        <div class="vd-group__bar" aria-hidden="true"></div>
        <div class="vd-group__content">${sectionsHtml}</div>
      </div>
    `
    : `${topHtml}${sectionsHtml}`;

  viewEl.innerHTML = html;
}

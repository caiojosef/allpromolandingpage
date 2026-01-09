// public/spa/app.js
(() => {
  const spaView = document.getElementById("spa-view");
  if (!spaView) {
    console.error("Não encontrei #spa-view no HTML.");
    return;
  }

  const routes = {
    "/inicio": {
      title: "Início",
      icon: "bi-house-door",
      html: "public/pages/inicio/index.html",
      script: "public/pages/inicio/script.js",
    },
    "/mais-vendidos": {
      title: "Mais Vendidos",
      icon: "bi-trophy",
      html: "public/pages/maisvendidos/index.html",
      script: "public/pages/maisvendidos/script.js",
    },
    "/frete-gratis": {
      title: "Frete Grátis",
      icon: "bi-truck",
      html: "public/pages/fretegratis/index.html",
      script: "public/pages/fretegratis/script.js",
    },
    "/suplementos": {
      title: "Suplementos",
      icon: "bi-capsule",
      html: "public/pages/suplementos/index.html",
      script: "public/pages/suplementos/script.js",
      hasSubcats: true,
    },
  };

  const defaultRoute = "/inicio";

  const aliases = {
    "/maisvendidos": "/mais-vendidos",
    "/fretegratis": "/frete-gratis",
  };

  let currentScriptEl = null;
  let currentAbort = null;
  let currentPath = null;
  let currentQs = "";

  // ======= Barra global refs
  let barEl = null;
  let mainRow = null;
  let subRow = null;

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizePath(rawPath) {
    const p = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return aliases[p] || p;
  }

  function parseHash() {
    const h = window.location.hash || `#${defaultRoute}`;
    const raw = h.replace(/^#/, "");

    const [rawPath, rawQs] = raw.split("?");
    const path = normalizePath(rawPath || defaultRoute);

    const query = {};
    if (rawQs) {
      const sp = new URLSearchParams(rawQs);
      for (const [k, v] of sp.entries()) query[k] = v;
    }

    return {
      path,
      query,
      rawPath: rawPath || defaultRoute,
      rawQs: rawQs || "",
    };
  }

  function fixCanonicalHashIfNeeded() {
    const { rawPath, rawQs } = parseHash();
    const canonical = normalizePath(rawPath);
    if (canonical !== rawPath) {
      const qs = rawQs ? `?${rawQs}` : "";
      window.location.hash = `#${canonical}${qs}`;
      return true;
    }
    return false;
  }

  async function fetchHtml(url, signal) {
    const res = await fetch(url, { cache: "no-store", signal });
    if (!res.ok) throw new Error(`Falha ao carregar ${url} (${res.status})`);
    return res.text();
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `${url}?v=${Date.now()}`;
      s.defer = true;
      s.onload = () => resolve(s);
      s.onerror = () => reject(new Error(`Falha ao carregar script: ${url}`));
      document.body.appendChild(s);
    });
  }

  function abortInFlight() {
    if (currentAbort) {
      try {
        currentAbort.abort();
      } catch (_) {}
      currentAbort = null;
    }
  }

  function unloadPreviousPage() {
    if (window.__page && typeof window.__page.destroy === "function") {
      try {
        window.__page.destroy();
      } catch (e) {
        console.warn(e);
      }
    }
    window.__page = null;

    if (currentScriptEl) {
      currentScriptEl.remove();
      currentScriptEl = null;
    }
  }

  // =========================
  // Barra global (main + sub)
  // =========================
  function buildBarOnce() {
    if (barEl) return;

    barEl = document.createElement("div");
    barEl.id = "globalCatsBar";
    barEl.innerHTML = `
  <button id="globalCatsToggle" type="button" aria-expanded="false">
    <div class="gc-toggle-inner">
      <div class="gc-toggle-left">
        <i class="bi bi-list"></i>
        <span>Categorias</span>
      </div>
      <i class="bi bi-chevron-down gc-chevron"></i>
    </div>
  </button>

  <div id="globalCatsWrap">
    <div class="subcat-row" id="globalCatsMain"></div>
    <div class="subcat-row" id="globalCatsSub"></div>
  </div>
`;

    // insere antes do spa-view (dentro do main container)
    spaView.parentNode.insertBefore(barEl, spaView);

    mainRow = document.getElementById("globalCatsMain");
    subRow = document.getElementById("globalCatsSub");

    const toggleBtn = document.getElementById("globalCatsToggle");

    toggleBtn.addEventListener("click", () => {
      const isOpen = barEl.classList.toggle("is-open");
      toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Main chips (rotas)
    mainRow.innerHTML = Object.entries(routes)
      .map(
        ([path, r]) => `
        <button type="button" class="subcat-chip" data-path="${esc(path)}">
          <i class="bi ${esc(r.icon || "bi-grid")}"></i>
          <span>${esc(r.title)}</span>
        </button>
      `
      )
      .join("");

    mainRow.addEventListener("click", (e) => {
      const btn = e.target.closest(".subcat-chip");
      if (!btn) return;
      const path = btn.dataset.path;
      if (!path) return;
      window.location.hash = `#${path}`;
    });

    // Sub chips (subcategorias de suplementos)
    subRow.addEventListener("click", (e) => {
      const btn = e.target.closest(".subcat-chip");
      if (!btn) return;

      const sub = btn.dataset.sub || "__all__";
      const label = btn.dataset.label || "";

      if (sub === "__all__") {
        window.location.hash = "#/suplementos";
        return;
      }

      const sp = new URLSearchParams();
      sp.set("sub", sub);
      sp.set("limit", "100");
      if (label) sp.set("label", label);

      window.location.hash = `#/suplementos?${sp.toString()}`;
    });
  }

  function setActiveMain(path) {
    mainRow
      ?.querySelectorAll(".subcat-chip")
      .forEach((b) => b.classList.remove("is-active"));
    const btn = mainRow?.querySelector(
      `.subcat-chip[data-path="${CSS.escape(path)}"]`
    );
    if (btn) btn.classList.add("is-active");
  }

  function setActiveSub(sub) {
    subRow
      ?.querySelectorAll(".subcat-chip")
      .forEach((b) => b.classList.remove("is-active"));
    const btn = subRow?.querySelector(
      `.subcat-chip[data-sub="${CSS.escape(sub)}"]`
    );
    if (btn) btn.classList.add("is-active");
  }

  function labelFromSub(sub) {
    return String(sub)
      .split("-")
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
      .join(" ");
  }

  function iconForSub(sub) {
    const map = {
      __all__: "bi-grid",
      whey: "bi-lightning-charge",
      creatina: "bi-droplet",
      "pre-treino": "bi-fire",
    };
    return map[sub] || "bi-dot";
  }

  function rebuildSubcatsForSupp() {
    // cria a lista a partir do HTML carregado dentro do spa-view
    const secs = Array.from(
      spaView.querySelectorAll('section[data-main="suplementos"][data-sub]')
    );

    if (!secs.length) {
      subRow.innerHTML = "";
      return;
    }

    const seen = new Set();
    const subs = [];
    secs.forEach((s) => {
      const sub = String(s.dataset.sub || "").trim();
      if (!sub || seen.has(sub)) return;
      seen.add(sub);
      subs.push({
        sub,
        label: s.dataset.label ? String(s.dataset.label) : labelFromSub(sub),
      });
    });

    subRow.innerHTML = [
      `<button type="button" class="subcat-chip" data-sub="__all__" data-label="Todos">
        <i class="bi ${iconForSub("__all__")}"></i><span>Todos</span>
      </button>`,
      ...subs.map(
        (s) => `
        <button type="button" class="subcat-chip" data-sub="${esc(
          s.sub
        )}" data-label="${esc(s.label)}">
          <i class="bi ${esc(iconForSub(s.sub))}"></i><span>${esc(
          s.label
        )}</span>
        </button>
      `
      ),
    ].join("");
  }

  function updateBarUI(routeInfo) {
    setActiveMain(routeInfo.path);

    if (routeInfo.path === "/suplementos") {
      barEl.classList.add("is-sub-open");
      if (!subRow.innerHTML.trim()) rebuildSubcatsForSupp();

      const sub = routeInfo.query?.sub
        ? String(routeInfo.query.sub)
        : "__all__";
      setActiveSub(sub);
    } else {
      barEl.classList.remove("is-sub-open");
      setActiveSub("__all__");
    }
  }

  // =========================
  // Navegação
  // =========================
  async function navigate() {
    if (fixCanonicalHashIfNeeded()) return;

    buildBarOnce();

    const parsed = parseHash();
    const route = routes[parsed.path];

    if (!route) {
      window.location.hash = `#${defaultRoute}`;
      return;
    }

    // expõe rota para as páginas
    window.__route = { path: parsed.path, query: parsed.query };

    // mesma rota, mas mudou query -> não recarrega HTML/script
    if (currentPath === parsed.path) {
      if (currentQs !== parsed.rawQs) {
        currentQs = parsed.rawQs;
        updateBarUI(window.__route);

        if (
          window.__page &&
          typeof window.__page.onRouteChange === "function"
        ) {
          try {
            window.__page.onRouteChange(window.__route);
          } catch (e) {
            console.warn(e);
          }
        }
      } else {
        updateBarUI(window.__route);
      }
      return;
    }

    abortInFlight();

    document.title = `${route.title} | Vitrine dos Links`;
    spaView.innerHTML = `<div style="padding:16px;color:#aaa;">Carregando ${route.title}...</div>`;
    spaView.setAttribute("aria-busy", "true");

    unloadPreviousPage();

    const abort = new AbortController();
    currentAbort = abort;

    try {
      spaView.innerHTML = await fetchHtml(route.html, abort.signal);

      // se for suplementos, já monta as subcategorias a partir do HTML
      if (parsed.path === "/suplementos") {
        rebuildSubcatsForSupp();
      } else {
        subRow.innerHTML = "";
      }

      currentScriptEl = await loadScript(route.script);

      currentPath = parsed.path;
      currentQs = parsed.rawQs;

      updateBarUI(window.__route);

      if (window.__page && typeof window.__page.init === "function") {
        window.__page.init();
      }

      spaView.setAttribute("aria-busy", "false");
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error(err);
      spaView.innerHTML = `
        <div style="padding:16px;">
          <h2>Erro ao carregar</h2>
          <p>Não foi possível abrir esta página.</p>
        </div>
      `;
      spaView.setAttribute("aria-busy", "false");
    } finally {
      if (currentAbort === abort) currentAbort = null;
    }
  }

  window.addEventListener("hashchange", navigate);

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.location.hash) window.location.hash = `#${defaultRoute}`;
    navigate();
  });
})();

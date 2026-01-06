// public/spa/app.js
(() => {
  const spaView = document.getElementById("spa-view");
  if (!spaView) {
    console.error("Não encontrei #spa-view no HTML.");
    return;
  }

  // Rotas canônicas
  const routes = {
    "/inicio": {
      title: "Início",
      html: "public/pages/inicio/index.html",
      script: "public/pages/inicio/script.js",
    },
    "/mais-vendidos": {
      title: "Mais Vendidos",
      html: "public/pages/maisvendidos/index.html",
      script: "public/pages/maisvendidos/script.js",
    },
    "/frete-gratis": {
      title: "Frete Grátis",
      html: "public/pages/fretegratis/index.html",
      script: "public/pages/fretegratis/script.js", // garanta que exista
    },
    "/suplementos": {
      title: "Suplementos",
      html: "public/pages/suplementos/index.html",
      script: "public/pages/suplementos/script.js",
    },
  };

  const defaultRoute = "/inicio";

  // Aceita rotas antigas e converte para a canônica
  const aliases = {
    "/maisvendidos": "/mais-vendidos",
    "/fretegratis": "/frete-gratis",
  };

  let currentScriptEl = null;
  let currentAbort = null;
  let currentPath = null;

  function normalizePath(rawPath) {
    const p = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return aliases[p] || p;
  }

  function getPath() {
    const h = window.location.hash || `#${defaultRoute}`;
    const raw = h.replace(/^#/, "");
    return normalizePath(raw || defaultRoute);
  }

  function fixCanonicalHashIfNeeded() {
    const raw = (window.location.hash || "").replace(/^#/, "") || defaultRoute;
    const normalized = normalizePath(raw);
    if (normalized !== raw) {
      window.location.hash = `#${normalized}`;
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
    // destroy do padrão atual
    if (window.__page && typeof window.__page.destroy === "function") {
      try {
        window.__page.destroy();
      } catch (e) {
        console.warn(e);
      }
    }
    window.__page = null;

    // remove script anterior
    if (currentScriptEl) {
      currentScriptEl.remove();
      currentScriptEl = null;
    }
  }

  async function navigate() {
    // se veio por alias, já troca para a rota canônica
    if (fixCanonicalHashIfNeeded()) return;

    const path = getPath();
    const route = routes[path];

    if (!route) {
      window.location.hash = `#${defaultRoute}`;
      return;
    }
    if (currentPath === path) return;

    // cancela navegação anterior (HTML)
    abortInFlight();
    // disponibiliza rota + query para a página
    const raw = (window.location.hash || "#/inicio").replace(/^#/, "");
    const [pathPart, qsPart] = raw.split("?");
    const query = {};
    if (qsPart) {
      const sp = new URLSearchParams(qsPart);
      for (const [k, v] of sp.entries()) query[k] = v;
    }
    window.__route = { path: pathPart, query };

    // loader
    document.title = `${route.title} | Vitrine dos Links`;
    spaView.innerHTML = `<div style="padding:16px;color:#aaa;">Carregando ${route.title}...</div>`;
    spaView.setAttribute("aria-busy", "true");

    // limpa página anterior
    unloadPreviousPage();

    // abort controller desta navegação
    const abort = new AbortController();
    currentAbort = abort;

    try {
      spaView.innerHTML = await fetchHtml(route.html, abort.signal);
      currentScriptEl = await loadScript(route.script);

      if (window.__page && typeof window.__page.init === "function") {
        window.__page.init();
      }

      currentPath = path;
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

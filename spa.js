(() => {
  const spaView = document.getElementById("spa-view");
  if (!spaView) {
    console.error("Não encontrei #spa-view no HTML.");
    return;
  }

  // Rotas canônicas (mais "bonitas")
  const routes = {
    "/inicio": { folder: "inicio", title: "Início" },
    "/mais-vendidos": { folder: "maisvendidos", title: "Mais Vendidos" },
    "/suplementos": { folder: "suplementos", title: "Suplementos" },
    "/frete-gratis": { folder: "fretegratis", title: "Frete Grátis" },
  };

  const defaultRoute = "/inicio";

  // Aliases: aceita rotas antigas/sem hífen e redireciona para a canônica
  const aliases = {
    "/maisvendidos": "/mais-vendidos",
    "/fretegratis": "/frete-gratis",
  };

  let currentScriptEl = null;

  function normalizePath(rawPath) {
    const p = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return aliases[p] || p;
  }

  function getPath() {
    const h = window.location.hash || `#${defaultRoute}`;
    const raw = h.replace(/^#/, "");
    return normalizePath(raw);
  }

  async function fetchHtml(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar ${url} (${res.status})`);
    return res.text();
  }

  function unloadPreviousPage() {
    if (window.__page && typeof window.__page.destroy === "function") {
      try { window.__page.destroy(); } catch (e) { console.warn(e); }
    }
    window.__page = null;

    if (currentScriptEl) {
      currentScriptEl.remove();
      currentScriptEl = null;
    }
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url + `?v=${Date.now()}`;
      s.defer = true;
      s.onload = () => resolve(s);
      s.onerror = () => reject(new Error(`Falha ao carregar script: ${url}`));
      document.body.appendChild(s);
    });
  }

  async function navigate() {
    const path = getPath();

    // se caiu num alias, já corrige a URL para a canônica
    const currentRaw = (window.location.hash || "").replace(/^#/, "") || defaultRoute;
    const normalized = normalizePath(currentRaw);
    if (normalized !== currentRaw) {
      window.location.hash = `#${normalized}`;
      return;
    }

    const route = routes[path];
    if (!route) {
      window.location.hash = `#${defaultRoute}`;
      return;
    }

    document.title = `${route.title} | Vitrine dos Links`;

    const base = `public/pages/${route.folder}`;
    const htmlUrl = `${base}/index.html`;
    const jsUrl = `${base}/script.js`;

    spaView.innerHTML = `<div style="padding:16px;color:#aaa;">Carregando ${route.title}...</div>`;

    unloadPreviousPage();

    try {
      spaView.innerHTML = await fetchHtml(htmlUrl);
      currentScriptEl = await loadScript(jsUrl);

      if (window.__page && typeof window.__page.init === "function") {
        window.__page.init();
      }
    } catch (err) {
      console.error(err);
      spaView.innerHTML = `
        <div style="padding:16px;">
          <h2>Erro ao carregar</h2>
          <p>Não foi possível abrir esta página.</p>
        </div>
      `;
    }
  }

  window.addEventListener("hashchange", navigate);

  document.addEventListener("DOMContentLoaded", () => {
    // se abrir como /index.html, isso continua aparecendo, mas o hash fica bonito
    if (!window.location.hash) window.location.hash = `#${defaultRoute}`;
    navigate();
  });
})();

(() => {
  const spaView = document.getElementById("spa-view");
  if (!spaView) {
    console.error("Não encontrei #spa-view no HTML.");
    return;
  }

  // Rotas -> public/pages/<folder>/index.html + script.js
  const routes = {
    "/inicio": { folder: "inicio", title: "Início" },
    "/maisvendidos": { folder: "maisvendidos", title: "Mais Vendidos" },
    "/suplementos": { folder: "suplementos", title: "Suplementos" },
    // adicione novas aqui:
    // "/contato": { folder: "contato", title: "Contato" },
    // "/sobre": { folder: "sobre", title: "Sobre" },
  };

  const defaultRoute = "/inicio";

  let currentScriptEl = null;

  function getPath() {
    const h = window.location.hash || `#${defaultRoute}`;
    const path = h.replace(/^#/, "");
    return path.startsWith("/") ? path : `/${path}`;
  }

  async function fetchHtml(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar ${url} (${res.status})`);
    return res.text();
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

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url + `?v=${Date.now()}`; // evita cache no dev
      s.defer = true;
      s.onload = () => resolve(s);
      s.onerror = () => reject(new Error(`Falha ao carregar script: ${url}`));
      document.body.appendChild(s);
    });
  }

  async function navigate() {
    const path = getPath();
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
    if (!window.location.hash) window.location.hash = `#${defaultRoute}`;
    navigate();
  });
})();

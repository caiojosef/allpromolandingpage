// public/spa/router.js
export class Router {
  constructor({
    viewEl,
    appTitle = "Vitrine dos Links",
    defaultRoute = "/inicio",
    routes = {},
    aliases = {},
    notFoundRoute = null, // ex: "/404" ou null para redirecionar ao default
    cacheHtml = true,
  }) {
    if (!viewEl) throw new Error("Router: viewEl é obrigatório.");

    this.viewEl = viewEl;
    this.appTitle = appTitle;
    this.defaultRoute = defaultRoute;
    this.routes = routes;
    this.aliases = aliases;
    this.notFoundRoute = notFoundRoute;
    this.cacheHtml = cacheHtml;

    this._current = {
      path: null,
      module: null,
      styles: [],
      abort: null,
    };

    this._htmlCache = new Map();

    this._onHashChange = this._onHashChange.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  start() {
    window.addEventListener("hashchange", this._onHashChange);
    document.addEventListener("click", this._onClick);

    // garante hash inicial
    if (!window.location.hash) {
      window.location.hash = `#${this.defaultRoute}`;
      return;
    }

    this.navigate(this._getPathFromHash(), { replaceHashIfCanonical: true });
  }

  stop() {
    window.removeEventListener("hashchange", this._onHashChange);
    document.removeEventListener("click", this._onClick);
    this._unloadCurrent();
  }

  // navegação programática
  go(path) {
    window.location.hash = `#${path}`;
  }

  async navigate(rawPath, { replaceHashIfCanonical = false } = {}) {
    const path = this._normalizePath(rawPath);

    // Corrige a URL se veio por alias
    if (replaceHashIfCanonical) {
      const currentRaw = this._getPathFromHash();
      const canonical = this._normalizePath(currentRaw);
      if (canonical !== currentRaw) {
        window.location.hash = `#${canonical}`;
        return;
      }
    }

    const route = this.routes[path];

    // 404 / fallback
    if (!route) {
      if (this.notFoundRoute && this.routes[this.notFoundRoute]) {
        this.go(this.notFoundRoute);
      } else {
        this.go(this.defaultRoute);
      }
      return;
    }

    // Evita recarregar a mesma rota
    if (this._current.path === path) return;

    // Cancela qualquer fetch anterior em andamento
    this._abortInFlight();

    // Mostra loader
    this._renderLoading(route.title);

    // descarrega página atual (destroy + estilos + etc.)
    await this._unloadCurrent();

    // prepara abort para esta navegação
    const abort = new AbortController();
    this._current.abort = abort;

    try {
      // título
      document.title = `${route.title} | ${this.appTitle}`;

      // CSS da rota (opcional)
      if (Array.isArray(route.css) && route.css.length) {
        this._current.styles = await this._loadStyles(route.css);
      }

      // HTML
      const html = await this._loadHtml(route.html, abort.signal);
      this.viewEl.innerHTML = html;

      // Módulo JS da página (opcional)
      let mod = null;
      if (route.module) {
        // cache-busting em dev (opcional): ?v=Date.now()
        mod = await import(`${route.module}?v=${Date.now()}`);
      }

      this._current.path = path;
      this._current.module = mod;

      // init padrão
      if (mod && typeof mod.init === "function") {
        await mod.init();
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // troca de rota rápida

      console.error("Router error:", err);
      this._renderError();
    } finally {
      // encerra abort desta navegação (não reutilizar)
      if (this._current.abort === abort) {
        this._current.abort = null;
      }
    }
  }

  /* ------------------------- Internals ------------------------- */

  _onHashChange() {
    this.navigate(this._getPathFromHash(), { replaceHashIfCanonical: true });
  }

  _onClick(e) {
    // Intercepta links internos com data-link
    const a = e.target.closest("a[data-link]");
    if (!a) return;

    const href = a.getAttribute("href") || "";
    // esperado: "#/inicio" ou "#/frete-gratis" ou "/inicio"
    const path = href.startsWith("#") ? href.replace(/^#/, "") : href;

    if (!path) return;

    e.preventDefault();
    this.go(this._normalizePath(path));
  }

  _getPathFromHash() {
    const h = window.location.hash || `#${this.defaultRoute}`;
    const raw = h.replace(/^#/, "");
    return raw || this.defaultRoute;
  }

  _normalizePath(rawPath) {
    const p = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return this.aliases[p] || p;
  }

  _renderLoading(title) {
    this.viewEl.innerHTML = `
      <div style="padding:16px;color:#aaa;">
        Carregando ${title}...
      </div>
    `;
  }

  _renderError() {
    this.viewEl.innerHTML = `
      <div style="padding:16px;">
        <h2>Erro ao carregar</h2>
        <p>Não foi possível abrir esta página.</p>
      </div>
    `;
  }

  _abortInFlight() {
    if (this._current.abort) {
      try {
        this._current.abort.abort();
      } catch (_) {}
      this._current.abort = null;
    }
  }

  async _unloadCurrent() {
    // destroy do módulo
    const mod = this._current.module;
    if (mod && typeof mod.destroy === "function") {
      try {
        await mod.destroy();
      } catch (e) {
        console.warn(e);
      }
    }

    // remove estilos da rota atual
    if (this._current.styles.length) {
      this._current.styles.forEach((linkEl) => linkEl.remove());
    }

    this._current.path = null;
    this._current.module = null;
    this._current.styles = [];
  }

  async _loadHtml(url, signal) {
    if (this.cacheHtml && this._htmlCache.has(url)) {
      return this._htmlCache.get(url);
    }

    const res = await fetch(url, { cache: "no-store", signal });
    if (!res.ok)
      throw new Error(`Falha ao carregar HTML: ${url} (${res.status})`);
    const html = await res.text();

    if (this.cacheHtml) this._htmlCache.set(url, html);
    return html;
  }

  async _loadStyles(urls) {
    const promises = urls.map(
      (href) =>
        new Promise((resolve, reject) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          link.onload = () => resolve(link);
          link.onerror = () =>
            reject(new Error(`Falha ao carregar CSS: ${href}`));
          document.head.appendChild(link);
        })
    );

    return Promise.all(promises);
  }
}

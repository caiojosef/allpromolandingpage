// public/spa/app.js
import { Router } from "./router.js";
import { ROUTES } from "./routes.config.js";
import { renderSectionsRoute } from "./renderers.js";

const viewEl = document.getElementById("spa-view");
if (!viewEl) throw new Error("Não encontrei #spa-view no HTML.");

function scrollToSpaTop(viewEl, { smooth = true, extraOffset = 8 } = {}) {
  if (!viewEl) return;

  const nav = document.querySelector(".navbar.sticky-top");
  const navH = nav ? nav.offsetHeight : 0;

  const y =
    viewEl.getBoundingClientRect().top + window.scrollY - navH - extraOffset;

  window.scrollTo({
    top: Math.max(0, y),
    behavior: smooth ? "smooth" : "auto",
  });
}

// Pequeno adaptador: Router "acha" a rota, e ao navegar chama render+rehydrate
class DynamicRouter extends Router {
  constructor(opts) {
    super(opts);
    this._scrollNext = false; // ✅ só liga quando houver clique
  }

  // ✅ marca scroll quando o usuário clica em link interno
  _onClick(e) {
    // pega links internos: data-link OU href="#/..."
    const a = e.target.closest('a[data-link], a[href^="#/"]');
    if (!a) return;

    const href = a.getAttribute("href") || "";
    const isInternal = href.startsWith("#/");

    if (isInternal) {
      this._scrollNext = true; // ✅ só em clique
    }

    // mantém o comportamento do Router base (intercepta data-link)
    return super._onClick(e);
  }

  async navigate(rawPath, opts = {}) {
    const { replaceHashIfCanonical = false } = opts;
    const path = this._normalizePath(rawPath);

    if (replaceHashIfCanonical) {
      const currentRaw = this._getPathFromHash();
      const canonical = this._normalizePath(currentRaw);
      if (canonical !== currentRaw) {
        window.location.hash = `#${canonical}`;
        return;
      }
    }

    const route = this.routes[path];
    if (!route) {
      if (this.notFoundRoute && this.routes[this.notFoundRoute])
        this.go(this.notFoundRoute);
      else this.go(this.defaultRoute);
      return;
    }

    if (this._current.path === path) return;

    this._abortInFlight();
    this._renderLoading(route.title);
    await this._unloadCurrent();

    const abort = new AbortController();
    this._current.abort = abort;

    try {
      document.title = `${route.title} | ${this.appTitle}`;

      if (Array.isArray(route.css) && route.css.length) {
        this._current.styles = await this._loadStyles(route.css);
      }

      if (route.layout === "sections") {
        renderSectionsRoute(this.viewEl, route, this.routes, path);

        if (window.Components?.Section?.rehydrate) {
          await window.Components.Section.rehydrate(this.viewEl);
        }

        // ✅ só sobe se veio de clique
        if (this._scrollNext) {
          scrollToSpaTop(this.viewEl, { smooth: true });
          this._scrollNext = false;
        }
      } else {
        if (route.html) {
          const html = await this._loadHtml(route.html, abort.signal);
          this.viewEl.innerHTML = html;

          if (window.Components?.Section?.rehydrate) {
            await window.Components.Section.rehydrate(this.viewEl);
          }

          if (this._scrollNext) {
            scrollToSpaTop(this.viewEl, { smooth: true });
            this._scrollNext = false;
          }
        }
      }

      this._current.path = path;
      this._current.module = null;
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Router error:", err);
      this._renderError();
    } finally {
      if (this._current.abort === abort) this._current.abort = null;
      // garantia: se der erro no meio, não deixar flag presa
      this._scrollNext = false;
    }
  }
}

const router = new DynamicRouter({
  viewEl,
  appTitle: "Vitrine dos Links",
  defaultRoute: "/inicio",
  routes: ROUTES,
  aliases: {
    "/": "/inicio",
    "/mais-vendidos": "/maisvendidos",
  },
  notFoundRoute: null,
  cacheHtml: false,
});

router.start();
window.SPA = { router };

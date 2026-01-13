// public/spa/app.js
import { Router } from "./router.js";
import { ROUTES } from "./routes.config.js";
import { renderSectionsRoute } from "./renderers.js";

const viewEl = document.getElementById("spa-view");
if (!viewEl) throw new Error("Não encontrei #spa-view no HTML.");


// Pequeno adaptador: Router "acha" a rota, e ao navegar chama render+rehydrate
class DynamicRouter extends Router {
  async navigate(rawPath, opts = {}) {
    const path = this._normalizePath(rawPath);

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

      // CSS opcional por rota
      if (Array.isArray(route.css) && route.css.length) {
        this._current.styles = await this._loadStyles(route.css);
      }

      // ✅ Render dinâmico (sem arquivo HTML)
      if (route.layout === "sections") {
        renderSectionsRoute(this.viewEl, route, this.routes, path);

        if (window.Components?.Section?.rehydrate) {
          await window.Components.Section.rehydrate(this.viewEl);
        }
      } else {
        // fallback: se você quiser ainda suportar html/module como antes
        if (route.html) {
          const html = await this._loadHtml(route.html, abort.signal);
          this.viewEl.innerHTML = html;
          if (window.Components?.Section?.rehydrate) {
            await window.Components.Section.rehydrate(this.viewEl);
          }
        }
      }

      this._current.path = path;
      this._current.module = null; // sem módulos por rota nesse modelo (por enquanto)
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Router error:", err);
      this._renderError();
    } finally {
      if (this._current.abort === abort) this._current.abort = null;
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

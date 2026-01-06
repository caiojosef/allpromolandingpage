// public/components/category-tabs/category-tabs.js
(() => {
  // Config central (você edita aqui)
  const CONFIG = {
    main: [
      {
        key: "inicio",
        label: "Início",
        icon: "bi-house-door",
        href: "#/inicio",
        primary: true,
      },
      {
        key: "mais",
        label: "Mais Vendidos",
        icon: "bi-trophy",
        href: "#/mais-vendidos",
      },
      {
        key: "frete",
        label: "Frete Grátis",
        icon: "bi-truck",
        href: "#/frete-gratis",
      },

      // “Toggle” que expande subcategorias
      {
        key: "suplementos",
        label: "Suplementos",
        icon: "bi-capsule",
        toggle: "suplementos",
        href: "#/suplementos",
      },

      // externos (opcional)
      {
        key: "amazon",
        label: "Ofertas Amazon",
        icon: "bi-cart",
        href: "https://www.amazon.com.br/shop/caiojosef?ref=ac_inf_tb_vh",
        external: true,
      },
      {
        key: "ml",
        label: "Ofertas ML",
        icon: "bi-cart-check",
        href: "https://mercadolivre.com/sec/16oBFtK",
        external: true,
      },
    ],

    // subcategorias por grupo
    sub: {
      suplementos: [
        { label: "Todos", icon: "bi-grid", href: "#/suplementos" },
        {
          label: "Whey",
          icon: "bi-lightning-charge",
          href: "#/suplementos?sub=whey&limit=100&label=Whey",
        },
        {
          label: "Creatina",
          icon: "bi-droplet",
          href: "#/suplementos?sub=creatina&limit=100&label=Creatina",
        },
        {
          label: "Pré-treino",
          icon: "bi-fire",
          href: "#/suplementos?sub=pre-treino&limit=100&label=Pré-treino",
        },
      ],
    },
  };

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseHash() {
    const hash = window.location.hash || "#/inicio";
    const raw = hash.replace(/^#/, "");
    const [pathRaw, qsRaw] = raw.split("?");
    const path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;

    const params = {};
    if (qsRaw) {
      const sp = new URLSearchParams(qsRaw);
      for (const [k, v] of sp.entries()) params[k] = v;
    }

    return { path, params };
  }

  function buildMainRow() {
    return CONFIG.main
      .map((it) => {
        const cls = ["cat-tab", it.primary ? "is-primary" : ""]
          .filter(Boolean)
          .join(" ");

        const attrs = [
          `class="${cls}"`,
          `href="${esc(it.href)}"`,
          `data-key="${esc(it.key)}"`,
          it.toggle ? `data-toggle="${esc(it.toggle)}"` : "",
          it.external ? `target="_blank" rel="noopener"` : "",
          it.toggle ? `aria-expanded="false"` : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `<a ${attrs}><i class="bi ${esc(it.icon)}"></i><span>${esc(
          it.label
        )}</span></a>`;
      })
      .join("");
  }

  function buildSubRow(group) {
    const items = CONFIG.sub[group] || [];
    return items
      .map((it) => {
        return `
        <a class="cat-tab" href="${esc(it.href)}" data-sub="${esc(group)}">
          <i class="bi ${esc(it.icon || "bi-dot")}"></i>
          <span>${esc(it.label)}</span>
        </a>
      `;
      })
      .join("");
  }

  function injectUI() {
    const spaView = document.getElementById("spa-view");
    if (!spaView) return;

    // evita duplicar
    if (document.getElementById("catTabs")) return;

    const html = `
      <div class="cat-tabs" id="catTabs" aria-label="Categorias">
        <div class="cat-tabs__row" id="catTabsMain">
          ${buildMainRow()}
        </div>

        <div class="cat-tabs__sub" id="catTabsSub-suple" data-group="suplementos">
          <div class="cat-tabs__row">
            ${buildSubRow("suplementos")}
          </div>
        </div>
      </div>
    `;

    spaView.insertAdjacentHTML("beforebegin", html);

    // eventos
    const root = document.getElementById("catTabs");
    root.addEventListener("click", (e) => {
      const a = e.target.closest("a.cat-tab");
      if (!a) return;

      const toggle = a.getAttribute("data-toggle");
      if (toggle) {
        e.preventDefault();

        // navegar para página base do grupo (ex: /suplementos)
        const href = a.getAttribute("href");
        if (href && href.startsWith("#/")) window.location.hash = href;

        toggleGroup(toggle);
        return;
      }

      // links internos: deixa o hashchange do router trabalhar
      const href = a.getAttribute("href") || "";
      if (href.startsWith("#/")) {
        e.preventDefault();
        window.location.hash = href;
      }
      // externos seguem normal
    });

    // atualiza estado inicial
    updateActiveFromRoute();
  }

  function toggleGroup(group) {
    const sub = document.querySelector(`.cat-tabs__sub[data-group="${group}"]`);
    if (!sub) return;

    const isOpen = sub.classList.toggle("is-open");
    const toggleBtn = document.querySelector(
      `.cat-tab[data-toggle="${group}"]`
    );
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", String(isOpen));
  }

  function closeAllGroups() {
    document
      .querySelectorAll(".cat-tabs__sub")
      .forEach((el) => el.classList.remove("is-open"));
    document
      .querySelectorAll(".cat-tab[data-toggle]")
      .forEach((el) => el.setAttribute("aria-expanded", "false"));
  }

  function updateActiveFromRoute() {
    const { path } = parseHash();

    // ativa botão principal
    document
      .querySelectorAll("#catTabsMain .cat-tab")
      .forEach((a) => a.classList.remove("is-active"));

    // regra: quando estiver em /suplementos, marca suplementos ativo e abre sub
    if (path === "/suplementos") {
      const sup = document.querySelector(
        '#catTabsMain .cat-tab[data-key="suplementos"]'
      );
      if (sup) sup.classList.add("is-active");

      // abre sub (sem fechar se já estiver aberto)
      closeAllGroups();
      const sub = document.querySelector(
        '.cat-tabs__sub[data-group="suplementos"]'
      );
      if (sub) sub.classList.add("is-open");
      const toggleBtn = document.querySelector(
        `.cat-tab[data-toggle="suplementos"]`
      );
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
      return;
    }

    // demais rotas
    const mapping = {
      "/inicio": "inicio",
      "/mais-vendidos": "mais",
      "/frete-gratis": "frete",
    };

    const key = mapping[path];
    if (key) {
      const btn = document.querySelector(
        `#catTabsMain .cat-tab[data-key="${key}"]`
      );
      if (btn) btn.classList.add("is-active");
    } else {
      // rota não mapeada: fecha grupos
      closeAllGroups();
    }
  }

  document.addEventListener("DOMContentLoaded", injectUI);
  window.addEventListener("hashchange", updateActiveFromRoute);
})();

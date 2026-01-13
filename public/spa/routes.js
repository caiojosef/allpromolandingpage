// public/spa/routes.js
export const routes = {
  "/inicio": {
    title: "Início",
    html: "/public/pages/inicio/index.html",
    // module: "/public/pages/inicio/index.js", // opcional
    // css: ["/public/pages/inicio/index.css"], // opcional
  },
  "/maisvendidos": {
    title: "Mais vendidos",
    html: "/public/pages/maisvendidos/index.html",
    // module: "/public/pages/maisvendidos/index.js", // opcional
  },
};

export const ALIASES = {
  "/whey": "/academia/suplementos/whey",
  "/creatina": "/academia/suplementos/creatina",
  "/suplementos": "/academia/suplementos",
};

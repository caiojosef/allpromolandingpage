export const ROUTES = {
  "/inicio": {
    title: "Início",
    layout: "sections",
    // raiz não precisa de parent
    sections: [
      {
        api: "https://vitrinedoslinks.com.br/app/api/listar-mais-vendidos.php",
        limit: 5,
        label: "MAIS VENDIDOS",
        link: "#/maisvendidos",
        buttonText: "Ver todos",
      },
      {
        api: "https://vitrinedoslinks.com.br/app/api/listar-frete-gratis.php",   
        
        limit: 5,
        label: "FRETE GRÁTIS",
        link: "#/fretegratis",
        buttonText: "Ver Todos",
      },
      {
        api: "https://vitrinedoslinks.com.br/app/api/listar-produtos.php",
        main: "suplementos",
        days: 5,
        limit: 5,
        label: "SUPLEMENTOS",
        link: "#/suplementos",
        buttonText: "Ver todos",
      },
    ],
  },

  "/fretegratis": {
    title: "FRETE GRÁTIS",
    layout: "sections",
    parent: "/inicio",
    sections: [
      {
        api: "https://vitrinedoslinks.com.br/app/api/listar-frete-gratis.php",
        limit: 100,
        label: "FRETE GRÁTIS",
        divider: true,
      },
    ],
  },

  "/maisvendidos": {
    title: "MAIS VENDIDOS",
    layout: "sections",
    parent: "/inicio",
    sections: [
      {
        api: "https://vitrinedoslinks.com.br/app/api/listar-mais-vendidos.php",
        limit: 100,
        label: "MAIS VENDIDOS",
        divider: true,
      },
    ],
  },

  // ✅ PAI
  "/suplementos": {
    title: "Suplementos",
    layout: "sections",
    parent: "/inicio",
    children: ["/whey", "/creatina"],

    header: {
      // título “grande” do pai (opcional; se não tiver, usa route.title)
      title: "SUPLEMENTOS",
      buttonText: "Voltar",
      // link do voltar pode ser omitido: ele usará o parent automaticamente
    },

    sections: [
      {
        api: "https://vitrinedoslinks.com.br/app/api/listar-produtos.php",
        main: "suplementos",
        days: 5,
        limit: 100,
        label: "SUPLEMENTOS",
        link: "#/suplementos",
        buttonText: "Ver todos",
      }
    ],
  },

  // ✅ FILHO (sem header grande)
  "/whey": {
    title: "Whey",
    layout: "sections",
    parent: "/suplementos",
    sections: [
      {
        api: "https://vitrinedoslinks.com.br/app/api/listar-produtos.php",
        sub: "whey",
        days: 5,
        limit: 100,
        label: "WHEY",
      },
    ],
  },

  // ✅ FILHO (sem header grande)
  "/creatina": {
    title: "Creatina",
    layout: "sections",
    parent: "/suplementos",
    sections: [
      {
        api: "https://vitrinedoslinks.com.br/app/api/listar-produtos.php",
        sub: "creatina",
        days: 5,
        limit: 100,
        label: "CREATINA",
      },
    ],
  },
};

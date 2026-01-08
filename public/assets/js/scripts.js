(() => {
  const root = document.getElementById("sponsorCarousel");
  const inner = document.getElementById("sponsorCarouselInner");
  const tpl = document.getElementById("tplSponsorSlide");

  if (!root || !inner || !tpl) return;

  // 1) Edite aqui: seus patrocinadores
  const SPONSORS = [
    {
      desktopSrc: "public/images/glow.jpg",
      mobileSrc: "public/images/glow-mobile.webp", // opcional (se não tiver, usa desktop)
      href: "glow.html",
      alt: "GlowCorps",
      badge: "Patrocínio",
    }
    
    
  ];

  // Limpa e renderiza
  inner.innerHTML = "";

  SPONSORS.forEach((s, idx) => {
    const frag = tpl.content.cloneNode(true);

    const item = frag.querySelector(".carousel-item");
    const link = frag.querySelector(".sponsor-link");
    const badge = frag.querySelector(".sponsor-badge");
    const img = frag.querySelector(".sponsor-img");
    const srcMobile = frag.querySelector(".sponsor-src-mobile");

    item.classList.toggle("active", idx === 0);

    link.href = s.href || "#";
    link.setAttribute(
      "aria-label",
      s.alt ? `Abrir: ${s.alt}` : "Abrir patrocinador"
    );

    badge.textContent = s.badge || "Patrocínio";

    img.src = s.desktopSrc;
    img.alt = s.alt || "Patrocinador";

    // Se não vier mobileSrc, reaproveita desktop
    srcMobile.srcset = s.mobileSrc || s.desktopSrc;

    inner.appendChild(frag);
  });

  // Se tiver 0/1 slide: esconde setas
  const controls = root.querySelectorAll(".sponsor-control");
  if (SPONSORS.length <= 1) {
    controls.forEach((btn) => (btn.style.display = "none"));
    root.removeAttribute("data-bs-ride");
  }

  // 2) Inicializa o Bootstrap Carousel com pausa no hover
  // (data-bs-pause="hover" já ajuda, mas aqui garantimos manualmente também)
  const carousel = bootstrap.Carousel.getOrCreateInstance(root, {
    interval: 4500,
    pause: "hover",
    ride: SPONSORS.length > 1 ? "carousel" : false,
    touch: true,
  });

  // Pausa ao passar mouse + quando focar (acessibilidade)
  const pause = () => carousel.pause();
  const play = () => carousel.cycle();

  root.addEventListener("mouseenter", pause);
  root.addEventListener("mouseleave", play);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", play);
})();

document.addEventListener("DOMContentLoaded", () => {
  // Tempo do slide inicial (texto)
  const heroDuration = 3000; // ajuste

  // Anunciantes (tempo por slide + imagem mobile)
  const ads = [
    {
      imgDesktop: "../../public/images/glow.jpg",
      imgMobile: "../../public/images/glow-mobile.jpg",
      alt: "Glow - Anunciante",
      href: "/public/glow.html",
      duration: 3000,
      badge: "Patrocinado",
    },
    // Quando tiver mais, só adicionar:
    // { imgDesktop:"images/x.webp", imgMobile:"../../public/images/x-mobile.webp", alt:"X", href:"x.html", duration:8000, badge:"Patrocinado" },
  ];

  const carouselEl = document.getElementById("heroRotator");
  const innerEl = document.getElementById("heroRotatorInner");
  const indicatorsEl = document.getElementById("heroRotatorIndicators");

  if (!carouselEl || !innerEl || !indicatorsEl) return;

  // Se não houver anúncios, remove setas/indicadores e encerra
  if (!ads.length) {
    carouselEl.querySelector(".carousel-control-prev")?.classList.add("d-none");
    carouselEl.querySelector(".carousel-control-next")?.classList.add("d-none");
    indicatorsEl.innerHTML = "";
    return;
  }

  // Remove anúncios existentes (evita duplicar)
  innerEl.querySelectorAll('[data-ad="true"]').forEach((n) => n.remove());

  // Injeta slides de anúncios (após o primeiro)
  ads.forEach((ad) => {
    const item = document.createElement("div");
    item.className = "carousel-item";
    item.dataset.ad = "true";

    item.innerHTML = `
      <a class="hero-ad-link" href="${ad.href}" aria-label="${ad.alt}">
        <div class="hero-ad-card">
          <picture>
            <source media="(max-width: 768px)" srcset="${ad.imgMobile}">
            <img src="${ad.imgDesktop}" alt="${ad.alt}" loading="lazy">
          </picture>
        </div>
        ${ad.badge ? `<span class="hero-ad-badge">${ad.badge}</span>` : ""}
      </a>
    `;

    innerEl.appendChild(item);
  });

  // Indicadores (hero + anúncios)
  const totalSlides = 1 + ads.length;
  indicatorsEl.innerHTML = "";
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("data-bs-target", "#heroRotator");
    dot.setAttribute("data-bs-slide-to", String(i));
    dot.setAttribute("aria-label", `Ir para o slide ${i + 1}`);
    if (i === 0) dot.classList.add("active");
    indicatorsEl.appendChild(dot);
  }

  // Carousel sem interval automático do Bootstrap (nós controlamos)
  const carousel = bootstrap.Carousel.getOrCreateInstance(carouselEl, {
    interval: false,
    ride: false,
    pause: false,
    touch: true,
    wrap: true,
  });

  let timerId = null;
  let heroShownOnce = false;

  function getItems() {
    return Array.from(carouselEl.querySelectorAll(".carousel-item"));
  }

  function getActiveIndex() {
    const items = getItems();
    const active = carouselEl.querySelector(".carousel-item.active");
    const idx = items.indexOf(active);
    return idx < 0 ? 0 : idx;
  }

  function setIndicators(index) {
    Array.from(indicatorsEl.querySelectorAll("button")).forEach((b, i) => {
      b.classList.toggle("active", i === index);
    });
  }

  function clearTimer() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  // Regra PROFISSIONAL:
  // - Slide 0 (hero) aparece 1 vez
  // - Depois roda SOMENTE anúncios (1..n). Se só tiver 1 anúncio, ele fica nele.
  function scheduleNext() {
    clearTimer();

    const idx = getActiveIndex();
    const totalSlides = 1 + ads.length; // hero + anúncios

    // duração do slide atual
    const duration =
      idx === 0 ? heroDuration : Number(ads[idx - 1]?.duration || 2000);

    timerId = setTimeout(() => {
      // próximo slide em loop (0 -> 1 -> 2 -> ... -> 0)
      const nextIdx = (idx + 1) % totalSlides;
      carousel.to(nextIdx);
    }, duration);
  }

  // Eventos do Bootstrap
  carouselEl.addEventListener("slide.bs.carousel", clearTimer);

  carouselEl.addEventListener("slid.bs.carousel", () => {
    const idx = getActiveIndex();
    setIndicators(idx);
    scheduleNext();
  });

  // Pausa no hover (desktop)
  carouselEl.addEventListener("mouseenter", clearTimer);
  carouselEl.addEventListener("mouseleave", scheduleNext);

  // Start: agenda a troca (hero -> anúncio)
  scheduleNext();
});

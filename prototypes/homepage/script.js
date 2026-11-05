(() => {
  "use strict";

  // Set first: the hidden state of the reveal lives under this class, so a page
  // where this script never runs keeps all of its content visible.
  document.documentElement.classList.add("js");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  initYear();
  initNavbar();
  initReveal();
  initPricing();
  initChaos();

  function initYear() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function initNavbar() {
    const nav = document.querySelector("[data-nav]");
    if (!nav) return;

    const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 16);
    window.addEventListener("scroll", update, { passive: true });
    // A reload in the middle of the page restores the scroll without a scroll event.
    update();
  }

  function initReveal() {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0 },
    );

    for (const element of document.querySelectorAll(".reveal")) observer.observe(element);
  }

  function initPricing() {
    const PLANS = {
      monthly: { price: "$8", period: "/month", note: "Billed monthly" },
      yearly: { price: "$72", period: "/year", note: "$6/mo, billed yearly" },
    };
    const FADE_MS = 150;

    const toggle = document.querySelector("[data-billing-toggle]");
    const price = document.querySelector("[data-price]");
    const period = document.querySelector("[data-period]");
    const note = document.querySelector("[data-billing-note]");
    if (!toggle || !price || !period || !note) return;

    const priceRow = price.parentElement;
    let fadeTimer = 0;

    const render = () => {
      const plan = toggle.getAttribute("aria-checked") === "true" ? PLANS.yearly : PLANS.monthly;
      price.textContent = plan.price;
      period.textContent = plan.period;
      note.textContent = plan.note;
      priceRow.classList.remove("is-swapping");
      note.classList.remove("is-swapping");
    };

    toggle.addEventListener("click", () => {
      const yearly = toggle.getAttribute("aria-checked") !== "true";
      toggle.setAttribute("aria-checked", String(yearly));

      window.clearTimeout(fadeTimer);
      if (reducedMotion.matches) {
        render();
        return;
      }
      priceRow.classList.add("is-swapping");
      note.classList.add("is-swapping");
      fadeTimer = window.setTimeout(render, FADE_MS);
    });

    // The shown price always comes from the control, also after Back and Forward.
    window.addEventListener("pageshow", render);
    render();
  }

  function initChaos() {
    const REPEL_RADIUS = 120;
    const REPEL_FORCE = 900;
    const MAX_SPEED = 220;
    const SPEED_RECOVERY = 1.5;
    const MAX_STEP = 0.032;
    const MAX_ROTATION = 10;
    const MAX_SCALE_CHANGE = 0.06;
    const GRID_COLUMNS = 4;
    const GRID_ROWS = 2;
    const TWO_PI = Math.PI * 2;

    const box = document.querySelector("[data-chaos]");
    if (!box) return;

    const between = (min, max) => min + Math.random() * (max - min);
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    let width = box.clientWidth;
    let height = box.clientHeight;
    let pointer = null;
    let inView = true;
    let frameId = 0;
    let lastFrame = 0;
    let clock = 0;

    const icons = [...box.querySelectorAll("[data-chaos-icon]")].map(createIcon);

    function createIcon(element, index) {
      const size = element.offsetWidth;
      const cellWidth = width / GRID_COLUMNS;
      const cellHeight = height / GRID_ROWS;
      const column = index % GRID_COLUMNS;
      const row = Math.floor(index / GRID_COLUMNS);
      const direction = between(0, TWO_PI);
      const cruise = between(18, 36);

      return {
        element,
        size,
        cruise,
        // Seeded on a jittered grid, so the icons never start in a clump.
        x: clamp(
          (column + 0.5) * cellWidth - size / 2 + between(-0.2, 0.2) * cellWidth,
          0,
          width - size,
        ),
        y: clamp(
          (row + 0.5) * cellHeight - size / 2 + between(-0.2, 0.2) * cellHeight,
          0,
          height - size,
        ),
        vx: Math.cos(direction) * cruise,
        vy: Math.sin(direction) * cruise,
        rotationPeriod: between(6, 10),
        rotationPhase: between(0, TWO_PI),
        scalePeriod: between(4, 7),
        scalePhase: between(0, TWO_PI),
      };
    }

    function repel(icon, step) {
      if (!pointer) return;
      const dx = icon.x + icon.size / 2 - pointer.x;
      const dy = icon.y + icon.size / 2 - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0 || distance >= REPEL_RADIUS) return;

      const push = REPEL_FORCE * (1 - distance / REPEL_RADIUS) ** 2 * step;
      icon.vx += (dx / distance) * push;
      icon.vy += (dy / distance) * push;
    }

    // Caps the speed, then eases it back to the icon's cruise speed.
    function settleSpeed(icon, step) {
      const speed = Math.hypot(icon.vx, icon.vy);
      if (speed === 0) return;
      const capped = Math.min(speed, MAX_SPEED);
      const next = capped + (icon.cruise - capped) * Math.min(1, SPEED_RECOVERY * step);
      icon.vx *= next / speed;
      icon.vy *= next / speed;
    }

    function bounce(icon) {
      const maxX = Math.max(width - icon.size, 0);
      const maxY = Math.max(height - icon.size, 0);
      if (icon.x <= 0) icon.vx = Math.abs(icon.vx);
      if (icon.x >= maxX) icon.vx = -Math.abs(icon.vx);
      if (icon.y <= 0) icon.vy = Math.abs(icon.vy);
      if (icon.y >= maxY) icon.vy = -Math.abs(icon.vy);
      icon.x = clamp(icon.x, 0, maxX);
      icon.y = clamp(icon.y, 0, maxY);
    }

    function draw(icon) {
      const rotation =
        MAX_ROTATION * Math.sin((TWO_PI * clock) / icon.rotationPeriod + icon.rotationPhase);
      const scale = reducedMotion.matches
        ? 1
        : 1 + MAX_SCALE_CHANGE * Math.sin((TWO_PI * clock) / icon.scalePeriod + icon.scalePhase);
      icon.element.style.transform = `translate(${icon.x}px, ${icon.y}px) rotate(${rotation}deg) scale(${scale})`;
    }

    function frame(now) {
      const step = lastFrame ? Math.min((now - lastFrame) / 1000, MAX_STEP) : 0;
      lastFrame = now;
      clock += step;

      for (const icon of icons) {
        repel(icon, step);
        settleSpeed(icon, step);
        icon.x += icon.vx * step;
        icon.y += icon.vy * step;
        bounce(icon);
        draw(icon);
      }
      frameId = window.requestAnimationFrame(frame);
    }

    // The loop runs only while someone can see it and motion is allowed.
    function syncLoop() {
      const shouldRun = inView && !document.hidden && !reducedMotion.matches;
      if (shouldRun && !frameId) {
        lastFrame = 0;
        frameId = window.requestAnimationFrame(frame);
      } else if (!shouldRun && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      if (reducedMotion.matches) icons.forEach(draw);
    }

    function measure() {
      width = box.clientWidth;
      height = box.clientHeight;
      for (const icon of icons) {
        icon.size = icon.element.offsetWidth;
        bounce(icon);
        draw(icon);
      }
    }

    // Mouse only: a finger on the box is scrolling the page.
    box.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const rect = box.getBoundingClientRect();
      pointer = {
        x: event.clientX - rect.left - box.clientLeft,
        y: event.clientY - rect.top - box.clientTop,
      };
    });
    box.addEventListener("pointerleave", () => {
      pointer = null;
    });

    new ResizeObserver(measure).observe(box);
    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      syncLoop();
    }).observe(box);
    document.addEventListener("visibilitychange", syncLoop);
    reducedMotion.addEventListener("change", syncLoop);

    icons.forEach(draw);
    syncLoop();
  }
})();

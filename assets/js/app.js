/* =========================================================================
   Er Dizajn — site behaviour. Vanilla ES2020, no dependencies.
   Every feature is progressive: the page works fully without this file.
   ========================================================================= */
(() => {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme -------------------------------------------------- */
  const THEME_KEY = "erd-theme";
  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = t === "light" ? "#ffffff" : "#0a0b0d";
    $$(".theme-toggle").forEach((b) =>
      b.setAttribute("aria-label", b.dataset[t === "light" ? "toDark" : "toLight"] || "Toggle theme")
    );
  };
  $$(".theme-toggle").forEach((btn) =>
    btn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
      applyTheme(next);
    })
  );
  applyTheme(document.documentElement.dataset.theme || "dark");

  /* ---------- Header state ------------------------------------------- */
  const header = $(".header");
  const toTop  = $(".to-top");
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle("is-stuck", y > 12);
    toTop?.classList.toggle("is-on", y > 700);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop?.addEventListener("click", () =>
    scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
  );

  /* ---------- Mobile drawer ------------------------------------------ */
  const drawer = $(".drawer");
  const burger = $(".burger");
  let lastFocus = null;

  const setDrawer = (open) => {
    if (!drawer || !burger) return;
    drawer.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
    // keep the rest of the page out of the tab order while the menu is over it
    $$("main, .footer, .actionbar").forEach((el) => (el.inert = open));

    if (open) {
      lastFocus = document.activeElement;
      $$(".drawer__link", drawer).forEach((l, i) => (l.style.animationDelay = `${60 + i * 45}ms`));
      // the drawer is still `visibility: hidden` on this frame, so wait for the
      // style change to land before moving focus into it
      requestAnimationFrame(() =>
        requestAnimationFrame(() => $(".drawer__link", drawer)?.focus({ preventScroll: true }))
      );
    } else {
      lastFocus?.focus?.({ preventScroll: true });
    }
  };
  burger?.addEventListener("click", () => setDrawer(!drawer.classList.contains("is-open")));
  $$(".drawer a").forEach((a) => a.addEventListener("click", () => setDrawer(false)));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer?.classList.contains("is-open")) setDrawer(false);
  });

  /* ---------- Scroll reveal ------------------------------------------ */
  const revealables = $$(".reveal, .reveal-group");
  if (revealables.length && !reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
        }
      },
      // threshold must stay 0: a tall gallery can be many viewports high and
      // would never reach a fractional ratio, so it would never reveal.
      { rootMargin: "0px 0px -12% 0px", threshold: 0 }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Years-in-business (evergreen) ---------------------------- */
  $$("[data-since]").forEach((el) => {
    const y = new Date().getFullYear() - parseInt(el.dataset.since, 10);
    el.dataset.count = String(y);
    el.dataset.suffix = "";
    el.textContent = reduceMotion ? y : "0";
  });

  /* ---------- Count-up stats ----------------------------------------- */
  const counters = $$("[data-count]");
  if (counters.length) {
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const dur = 1500, t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      const co = new IntersectionObserver(
        (entries, obs) => entries.forEach((e) => {
          if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); }
        }),
        { threshold: 0.4 }
      );
      counters.forEach((c) => co.observe(c));
    } else counters.forEach(run);
  }

  /* ---------- Lightbox ------------------------------------------------ */
  const lbLinks = $$("a[data-lb]");
  if (lbLinks.length) {
    const groups = {};
    lbLinks.forEach((a) => (groups[a.dataset.lb] ||= []).push(a));

    const lb = document.createElement("div");
    lb.className = "lb";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", document.documentElement.lang === "mk" ? "Преглед на слика" : "Image viewer");
    lb.innerHTML = `
      <div class="lb__bar">
        <span class="lb__count"></span>
        <button class="icon-btn lb__close" type="button" aria-label="Close">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="lb__stage">
        <div class="lb__spinner" aria-hidden="true"></div>
        <img class="lb__img" alt="">
        <button class="lb__nav lb__nav--prev" type="button" aria-label="Previous">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button class="lb__nav lb__nav--next" type="button" aria-label="Next">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <div class="lb__foot"><div class="lb__thumbs"></div></div>`;
    document.body.appendChild(lb);

    const img     = $(".lb__img", lb);
    const countEl = $(".lb__count", lb);
    const thumbs  = $(".lb__thumbs", lb);
    let list = [], idx = 0, opener = null;

    const preload = (i) => {
      const it = list[i];
      if (it) { const p = new Image(); p.src = it.href; }
    };

    const show = (i, dir = 0) => {
      idx = (i + list.length) % list.length;
      const link = list[idx];
      lb.classList.add("is-loading");
      img.classList.remove("is-ready");
      if (dir && !reduceMotion) {
        img.style.transition = "none";
        img.style.translate = `${dir * 24}px 0`;
        requestAnimationFrame(() => { img.style.transition = ""; img.style.translate = "0 0"; });
      }
      img.src = link.href;
      img.alt = link.querySelector("img")?.alt || "";
      countEl.textContent = `${idx + 1} / ${list.length}`;
      $$("img", thumbs).forEach((t, n) => t.setAttribute("aria-current", String(n === idx)));
      $$("img", thumbs)[idx]?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
      preload(idx + 1); preload(idx - 1);
    };

    img.addEventListener("load",  () => { lb.classList.remove("is-loading"); img.classList.add("is-ready"); });
    img.addEventListener("error", () => lb.classList.remove("is-loading"));

    const open = (link) => {
      list = groups[link.dataset.lb];
      opener = link;
      thumbs.innerHTML = "";
      list.forEach((l, n) => {
        const t = document.createElement("img");
        t.src = l.querySelector("img")?.src || l.href;
        t.alt = ""; t.loading = "lazy"; t.decoding = "async";
        t.addEventListener("click", () => show(n, n > idx ? 1 : -1));
        thumbs.appendChild(t);
      });
      lb.classList.add("is-open");
      document.body.classList.add("lb-open");
      show(list.indexOf(link));
      $(".lb__close", lb).focus({ preventScroll: true });
    };

    const close = () => {
      lb.classList.remove("is-open");
      document.body.classList.remove("lb-open");
      img.src = "";
      opener?.focus?.({ preventScroll: true });
    };

    lbLinks.forEach((a) =>
      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let users open in a new tab
        e.preventDefault();
        open(a);
      })
    );

    $(".lb__close", lb).addEventListener("click", close);
    $(".lb__nav--prev", lb).addEventListener("click", () => show(idx - 1, -1));
    $(".lb__nav--next", lb).addEventListener("click", () => show(idx + 1, 1));
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb__stage")) close(); });

    addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape")     { close(); }
      if (e.key === "ArrowRight") { show(idx + 1, 1); }
      if (e.key === "ArrowLeft")  { show(idx - 1, -1); }
      if (e.key === "Tab") {                                   // focus trap
        const f = $$("button, img[aria-current]", lb).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    let sx = 0, sy = 0, swiping = false;
    lb.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; swiping = true; }, { passive: true });
    lb.addEventListener("pointerup", (e) => {
      if (!swiping) return;
      swiping = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ---------- Contact form → e-mail ----------------------------------- */
  const form = $(".form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const d = new FormData(form);
      const get = (k) => (d.get(k) || "").toString().trim();
      const subject = `${form.dataset.subject || "Website enquiry"} — ${get("name")}`;
      const body = [
        `${form.dataset.lName || "Name"}: ${get("name")}`,
        `${form.dataset.lPhone || "Phone"}: ${get("phone")}`,
        `${form.dataset.lEmail || "Email"}: ${get("email")}`,
        `${form.dataset.lTopic || "Project"}: ${get("topic")}`,
        "",
        get("message"),
      ].join("\n");
      const status = $(".form__status", form);
      if (status) status.hidden = false;
      location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ---------- Current year -------------------------------------------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();

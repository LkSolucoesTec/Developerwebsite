/* ==========================================================================
   Reusable Animation System, Preloader, Text Splitter & Single Scroll Loop
   ========================================================================== */

// Central timing, threshold, easing & stagger config
export const ANIMATION_CONFIG = {
  preloaderHoldMs: 520,
  preloaderSlideMs: 550,
  heroHeadlineDuration: 1000,
  heroHeadlineStaggerMs: 120,
  heroHeadlineBaseDelayMs: 180,
  wordStaggerSec: 0.06,
  childStaggerSec: 0.1,
  revealEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  revealThreshold: 0.2,
  revealRootMargin: '0px 0px -10% 0px',
  headerScrolledThreshold: 80,
  desktopBreakpoint: 900,
  scrollLerp: 0.14,
};

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 1. Headline & Bio Text Splitter (preserves nested color spans & <br>) */
function splitHeadlineWords(root) {
  let i = 0;
  const walk = (node) => {
    const frag = document.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
          const mask = document.createElement('span');
          const word = document.createElement('span');
          mask.className = 'split-mask';
          word.className = 'split-word';
          word.textContent = part;
          word.style.setProperty('--word-i', String(i++));
          mask.appendChild(word);
          frag.appendChild(mask);
        });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const clone = child.cloneNode(false);
        if (child.tagName !== 'BR') clone.appendChild(walk(child));
        frag.appendChild(clone);
      }
    });
    return frag;
  };
  root.replaceChildren(walk(root));
}

function splitBioByLines(el) {
  const frag = document.createDocumentFragment();
  const spans = el.textContent.trim().split(/\s+/).map((w, idx, arr) => {
    const s = document.createElement('span');
    s.className = 'bio-word';
    s.textContent = w;
    frag.appendChild(s);
    if (idx < arr.length - 1) frag.appendChild(document.createTextNode(' '));
    return s;
  });
  el.replaceChildren(frag);
  const assign = () => {
    let line = -1;
    let lastTop = null;
    spans.forEach((s) => {
      if (lastTop === null || Math.abs(s.offsetTop - lastTop) > 4) { line += 1; lastTop = s.offsetTop; }
      s.style.setProperty('--line-i', String(line));
    });
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(assign);
  else assign();
}

/* 2. Preloader + Header Slide + Hero WAAPI Headline Mask Timeline */
export function initHeroTypographyReveal() {
  const hero = document.getElementById('hero');
  const header = document.getElementById('site-header');
  const preloader = document.getElementById('preloader');
  if (!hero) return;

  const lines = Array.from(hero.querySelectorAll('[data-hero-line]'));
  const startHero = () => {
    hero.classList.add('is-hero-ready', 'is-inview');
    if (header) header.classList.add('is-nav-ready');
    lines.forEach((line, idx) => {
      if (typeof line.animate !== 'function') return line.classList.add('is-line-revealed');
      line.style.willChange = 'transform, opacity';
      const anim = line.animate(
        [{ opacity: 0, transform: 'translateY(110%)' }, { opacity: 1, transform: 'translateY(0)' }],
        {
          duration: ANIMATION_CONFIG.heroHeadlineDuration,
          delay: ANIMATION_CONFIG.heroHeadlineBaseDelayMs + idx * ANIMATION_CONFIG.heroHeadlineStaggerMs,
          easing: ANIMATION_CONFIG.revealEasing,
          fill: 'both',
        }
      );
      const finish = () => {
        line.classList.add('is-line-revealed');
        line.style.willChange = '';
      };
      anim.finished.then(() => { finish(); anim.cancel(); }).catch(finish);
    });
    window.setTimeout(() => hero.classList.add('is-hero-settled'), 1550);
  };

  if (REDUCED_MOTION) {
    if (preloader) preloader.classList.add('is-done');
    hero.classList.add('is-hero-ready', 'is-hero-settled', 'is-inview');
    lines.forEach((l) => l.classList.add('is-line-revealed'));
    if (header) header.classList.add('is-nav-ready');
    return;
  }

  if (preloader) {
    window.setTimeout(() => {
      preloader.classList.add('is-leaving');
      requestAnimationFrame(() => requestAnimationFrame(startHero));
      window.setTimeout(() => preloader.classList.add('is-done'), ANIMATION_CONFIG.preloaderSlideMs);
    }, ANIMATION_CONFIG.preloaderHoldMs);
  } else {
    requestAnimationFrame(() => requestAnimationFrame(startHero));
  }
}

/* 3. IntersectionObserver Reveals + Offscreen Loop Play-State Gating */
export function initScrollReveals() {
  document.querySelectorAll('[data-split="lines"]').forEach(splitHeadlineWords);
  document.querySelectorAll('[data-split="bio-lines"]').forEach(splitBioByLines);

  document.querySelectorAll('[data-delay]').forEach((el) => {
    el.style.setProperty('--reveal-delay', `${parseFloat(el.dataset.delay) || 0}s`);
  });
  document.querySelectorAll('[data-stagger]').forEach((parent) => {
    const step = parseFloat(parent.dataset.stagger) || ANIMATION_CONFIG.childStaggerSec;
    const base = parseFloat(parent.dataset.delay) || 0;
    Array.from(parent.children).forEach((child, idx) => {
      const own = parseFloat(child.dataset.delay) || 0;
      child.style.setProperty('--reveal-delay', `${(base + own + idx * step).toFixed(2)}s`);
    });
  });

  const targets = document.querySelectorAll('[data-reveal], [data-split], #process-timeline');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible', 'is-settled'));
    return;
  }

  const revealObs = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        if (!REDUCED_MOTION) target.style.willChange = 'transform, opacity';
        target.classList.add('is-visible');
        const delayMs = (parseFloat(target.style.getPropertyValue('--reveal-delay')) || 0) * 1000;
        const settleMs = target.id === 'process-timeline' ? 2250 : REDUCED_MOTION ? 320 : delayMs + 1150;
        window.setTimeout(() => {
          target.classList.add('is-settled');
          target.style.willChange = '';
        }, settleMs);
        obs.unobserve(target);
      });
    },
    { threshold: ANIMATION_CONFIG.revealThreshold, rootMargin: ANIMATION_CONFIG.revealRootMargin }
  );
  targets.forEach((el) => revealObs.observe(el));

  // Pause CSS continuous animations outside the viewport
  const loops = document.querySelectorAll('#hero, .anim-float-loop, .anim-sway-loop, .btn-pulse-wrap, .nova-showcase-frame');
  const loopObs = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-inview', e.isIntersecting)),
    { threshold: 0 }
  );
  loops.forEach((el) => loopObs.observe(el));

  initScrollController();
}

/* 4. Single rAF-Throttled Scroll Listener (Progress, Header, Back-to-Top & Parallax) */
function initScrollController() {
  const header = document.getElementById('site-header');
  const progressBar = document.getElementById('scroll-progress');
  const floatTopBtn = document.getElementById('floating-top-btn');
  const hero = document.getElementById('hero');
  const ribbonCanvas = document.getElementById('hero-ribbon-canvas');
  const novaPersp = document.getElementById('nova-showcase-perspective');
  const novaFrame = document.getElementById('nova-showcase-frame');
  const aboutPortrait = document.getElementById('about-portrait-img');
  const accents = Array.from(document.querySelectorAll('[data-parallax]'));
  let lastY = window.scrollY;
  let smoothY = lastY;
  let rafId = null;

  const tick = () => {
    rafId = null;
    // Batched DOM reads
    const y = window.scrollY;
    const vh = window.innerHeight || 1;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    const isDesktop = !REDUCED_MOTION && window.innerWidth >= ANIMATION_CONFIG.desktopBreakpoint;
    const novaRect = isDesktop && novaPersp ? novaPersp.getBoundingClientRect() : null;
    const aboutRect = isDesktop && aboutPortrait ? aboutPortrait.parentElement.getBoundingClientRect() : null;
    const accentRects = isDesktop ? accents.map((el) => el.getBoundingClientRect()) : null;

    smoothY += (y - smoothY) * ANIMATION_CONFIG.scrollLerp;
    const delta = Math.abs(y - smoothY);

    // Batched DOM writes
    if (progressBar) progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, y / maxScroll)).toFixed(4)})`;
    if (header) {
      const past = y > ANIMATION_CONFIG.headerScrolledThreshold;
      header.classList.toggle('is-scrolled', past);
      header.classList.toggle('is-header-hidden', past && y > lastY + 2);
    }
    if (floatTopBtn) floatTopBtn.classList.toggle('is-visible', y > vh * 1.5);
    lastY = y;

    if (isDesktop && hero) {
      const cy = Math.min(smoothY, vh * 1.2);
      hero.style.setProperty('--hero-y', `${(cy * 0.25).toFixed(2)}px`);
      hero.style.setProperty('--hero-op', `${Math.max(0, 1 - cy / (vh * 0.7)).toFixed(3)}`);
      if (ribbonCanvas) {
        ribbonCanvas.style.setProperty('--ribbon-y', `${(cy * -0.15).toFixed(2)}px`);
        ribbonCanvas.style.setProperty('--ribbon-scale', `${(1 + 0.08 * Math.min(1, cy / vh)).toFixed(4)}`);
      }
      if (novaRect && novaRect.bottom > 0 && novaRect.top < vh) {
        const p = Math.min(1, Math.max(0, (vh - novaRect.top) / (vh + novaRect.height)));
        novaPersp.style.setProperty('--nova-y', `${(40 - 80 * p).toFixed(2)}px`);
        if (novaFrame) novaFrame.style.setProperty('--nova-rx', `${(4 * (1 - p)).toFixed(2)}deg`);
      }
      if (aboutRect && aboutRect.bottom > 0 && aboutRect.top < vh) {
        const p = Math.min(1, Math.max(0, (vh - aboutRect.top) / (vh + aboutRect.height)));
        aboutPortrait.style.setProperty('--portrait-y', `${(-20 + 40 * p).toFixed(2)}px`);
      }
      accents.forEach((el, i) => {
        const r = accentRects[i];
        if (r.bottom > 0 && r.top < vh) {
          const factor = parseFloat(el.dataset.parallax) || 0.1;
          el.style.setProperty('--parallax-y', `${((r.top + r.height * 0.5 - vh * 0.5) * factor).toFixed(2)}px`);
        }
      });
      if (delta > 0.5) rafId = requestAnimationFrame(tick);
    }
  };

  const schedule = () => { if (!rafId) rafId = requestAnimationFrame(tick); };
  tick();
  window.addEventListener('scroll', schedule, { passive: true });
}

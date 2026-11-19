/* ==========================================================================
   Navigation, Sticky Header, Mobile Drawer & Active Section Tracking
   ========================================================================== */

export function initNavigation() {
  const menuToggle = document.getElementById('menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerLinks = mobileDrawer ? mobileDrawer.querySelectorAll('a') : [];
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('main section[id]');
  const backToTopBtn = document.getElementById('back-to-top');

  // 1. Accessible Mobile Drawer with keyboard focus management
  const getDrawerFocusable = () =>
    mobileDrawer
      ? Array.from(mobileDrawer.querySelectorAll('a[href], button:not([disabled])'))
      : [];

  const setDrawerOpen = (open) => {
    if (!menuToggle || !mobileDrawer) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    mobileDrawer.classList.toggle('is-open', open);
    mobileDrawer.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';

    if (open && drawerLinks.length > 0) {
      drawerLinks[0].focus();
    } else if (!open) {
      menuToggle.focus({ preventScroll: true });
    }
  };

  if (menuToggle && mobileDrawer) {
    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      setDrawerOpen(!isOpen);
    });

    drawerLinks.forEach((link) => {
      link.addEventListener('click', () => {
        setDrawerOpen(false);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (!mobileDrawer.classList.contains('is-open')) return;

      if (event.key === 'Escape') {
        setDrawerOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        const focusable = [menuToggle, ...getDrawerFocusable()];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && mobileDrawer.classList.contains('is-open')) {
        setDrawerOpen(false);
      }
    });
  }

  // 3. Smooth anchor navigation across internal section links
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      event.preventDefault();
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (targetId === '#top') {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      } else {
        targetEl.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }

      if (window.history && typeof window.history.pushState === 'function') {
        window.history.pushState(null, '', targetId);
      }
    });
  });

  // 4. Active navigation highlight on scroll
  if ('IntersectionObserver' in window && sections.length > 0 && navLinks.length > 0) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const activeId = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            link.classList.toggle('is-active', href === `#${activeId}`);
          });
        });
      },
      {
        rootMargin: '-35% 0px -50% 0px',
        threshold: 0,
      }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  // 5. Back to top interaction
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });
  }
}

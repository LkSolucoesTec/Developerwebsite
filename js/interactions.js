/* ==========================================================================
   Concept Case Study Modal & Hero Slide Indicators
   ========================================================================== */

export function initCaseStudyModal() {
  const openTriggers = document.querySelectorAll('[data-open-nova-modal]');
  const modal = document.getElementById('nova-modal');
  const closeBtn = document.getElementById('nova-modal-close');
  const ctaLink = modal ? modal.querySelector('[data-modal-cta]') : null;
  let lastFocusedElement = null;

  if (!modal || !closeBtn || openTriggers.length === 0) return;

  const getFocusable = () =>
    Array.from(
      modal.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    );

  const openModal = (trigger) => {
    lastFocusedElement = trigger || document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  };

  openTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openModal(trigger);
    });
  });

  closeBtn.addEventListener('click', closeModal);

  if (ctaLink) {
    ctaLink.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!modal.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = getFocusable();
      if (focusable.length === 0) return;
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
}

export function initHeroSlideDots() {
  const dots = document.querySelectorAll('.hero-hud-dot');
  if (dots.length === 0) return;

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      dots.forEach((item) => {
        item.classList.remove('is-active');
        item.setAttribute('aria-pressed', 'false');
      });
      dot.classList.add('is-active');
      dot.setAttribute('aria-pressed', 'true');
    });
  });
}

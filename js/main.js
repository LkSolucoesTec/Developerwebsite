/* ==========================================================================
   Main Entry Point — Andre Lucas Portfolio
   ========================================================================== */

import { initNavigation } from './navigation.js';
import { initHeroCloudShader } from './hero-cloud-shader.js';
import { initHeroShader } from './hero-shader.js';
import { initHeroTypographyReveal, initScrollReveals } from './scroll-reveal.js';
import { initCaseStudyModal, initHeroSlideDots } from './interactions.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initHeroCloudShader();
  initHeroShader();
  initHeroTypographyReveal();
  initScrollReveals();
  initCaseStudyModal();
  initHeroSlideDots();
});

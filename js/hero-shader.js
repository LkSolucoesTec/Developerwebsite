/* ==========================================================================
   Canvas B: Lightweight 2D "Liquid Glass Ribbon" Height-Field Shader
   Single full-screen fragment shader (max 3 noise octaves, no ray-marching),
   rendered at 0.5x resolution with devicePixelRatio = 1 and CSS fallback.
   ========================================================================== */

export const RIBBON_CONFIG = {
  resolutionScale: 0.5,
  mobileBreakpoint: 900,
  mobileOpacity: 0.55,
  reducedMotionSpeed: 0.2,
  colors: {
    violet: '#7A1FFF',
    magenta: '#E040FF',
    blue: '#2F6BFF',
    pink: '#FF2BB1',
  },
};

const VERT_SRC = `
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision mediump float;

  uniform float u_time;
  uniform vec2 u_res;
  uniform vec2 u_center;
  uniform float u_scale;
  uniform float u_opacityScale;
  uniform float u_isMobile;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Max 3 octaves of noise
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  float smax(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
    return mix(b, a, h) + k * h * (1.0 - h);
  }

  // 2D mathematical height field for 2 crossing flowing liquid glass ribbons
  float heightField(vec2 uv, float t) {
    // Slow liquid drift from bottom-left toward top-right
    vec2 drift = vec2(-t * 0.14, -t * 0.11);
    vec2 warp = vec2(
      fbm(uv * 1.2 + t * 0.10 + drift),
      fbm(uv * 1.2 + 7.3 - t * 0.12 + drift * 0.8)
    );
    vec2 p = uv + 0.35 * warp;

    // Ribbon 1
    float s1 = sin(p.x * 2.2 + sin(p.y * 1.7 + t * 0.35) * 1.4 - t * 0.25);
    float band1 = smoothstep(0.0, 0.9, 1.0 - abs(s1));

    // Ribbon 2 rotated by ~0.9 rad
    vec2 p2 = mat2(0.6216, -0.7833, 0.7833, 0.6216) * p;
    float s2 = sin(p2.x * 1.9 + sin(p2.y * 2.1 - t * 0.28) * 1.25 - t * 0.30 + 1.15);
    float band2 = smoothstep(0.0, 0.9, 1.0 - abs(s2));

    // Smooth-max melts ribbon crossings like liquid silk/glass
    float h = smax(band1, band2, 0.25);

    // Keep silhouette concentrated gracefully along flowing diagonal across right side
    float envelope = exp(-dot(uv * vec2(0.82, 0.68), uv * vec2(0.82, 0.68)) * 0.72);
    return h * clamp(envelope * 1.25, 0.0, 1.0);
  }

  // Procedural studio gradient sampled for fake chromatic dispersion
  vec3 bgGrad(vec2 uv) {
    vec3 violet = vec3(0.478, 0.122, 1.000);   // #7A1FFF
    vec3 magenta = vec3(0.878, 0.251, 1.000);  // #E040FF
    vec3 blue = vec3(0.184, 0.420, 1.000);     // #2F6BFF
    vec3 pink = vec3(1.000, 0.169, 0.694);     // #FF2BB1

    float gx = clamp(uv.x * 0.65 + 0.5, 0.0, 1.0);
    float gy = clamp(uv.y * 0.65 + 0.5, 0.0, 1.0);

    vec3 col = mix(violet, magenta, gx);
    col = mix(col, blue, smoothstep(0.25, 0.9, gy * (1.0 - gx * 0.35)));
    float pinkHighlight = exp(-dot(uv - vec2(0.18, 0.24), uv - vec2(0.18, 0.24)) * 3.2);
    col += pink * pinkHighlight * 0.55;
    return col;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - u_res * u_center) / max(u_res.y, 1.0);
    uv /= u_scale;

    float t = u_time * 0.36;
    float h = heightField(uv, t);

    // Finite differences normal (4 extra h() calls, e = 0.004)
    float e = 0.004;
    float hx0 = heightField(uv - vec2(e, 0.0), t);
    float hx1 = heightField(uv + vec2(e, 0.0), t);
    float hy0 = heightField(uv - vec2(0.0, e), t);
    float hy1 = heightField(uv + vec2(0.0, e), t);
    // Gradient scaled proportionally to smooth height slope so fake-glass edges bend specular/Fresnel cleanly
    vec3 n = normalize(vec3((hx0 - hx1) * 18.0, (hy0 - hy1) * 18.0, 0.25));

    float fres = pow(1.0 - n.z, 2.5);

    // Fake refraction + chromatic dispersion offsets
    float r = bgGrad(uv + n.xy * 0.10).r;
    float g = bgGrad(uv + n.xy * 0.13).g;
    float b = bgGrad(uv + n.xy * 0.16).b;
    vec3 refracted = vec3(r, g, b);

    // 2 soft specular highlights: white key + opposite pink accent
    float spec1 = pow(max(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.0), 60.0);
    float spec2 = pow(max(dot(n, normalize(vec3(0.45, -0.55, 0.68))), 0.0), 42.0);

    // Translucent dark-violet core transitioning to luminous magenta/pink/cyan glass edges
    vec3 darkCore = vec3(0.165, 0.039, 0.420);
    vec3 rimTint = mix(vec3(0.161, 0.847, 1.000), vec3(1.000, 0.169, 0.694), smoothstep(-0.35, 0.45, n.x + n.y * 0.6));

    vec3 col = mix(darkCore + refracted * 0.65, refracted * 1.15 + rimTint * 0.92, clamp(fres * 1.35, 0.0, 1.0));
    col += vec3(1.0, 0.97, 1.0) * spec1 * 1.25;
    col += vec3(1.0, 0.22, 0.76) * spec2 * 0.85;

    // Soft neon inner violet aura around ribbon edge
    vec3 violet = vec3(0.478, 0.122, 1.000);
    float innerGlow = exp(-abs(h - 0.5) * 4.0) * smoothstep(0.08, 0.35, h);
    col += violet * innerGlow * 0.55;

    // Subtle thin-film iridescence tinted within purple/blue/pink spectrum
    vec3 cosineIrid = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + h * 1.5 + t * 0.05));
    vec3 tintedIrid = mix(vec3(0.478, 0.122, 1.0), vec3(1.0, 0.169, 0.694), cosineIrid.r) * 0.65 +
                      vec3(0.184, 0.420, 1.0) * cosineIrid.b * 0.35;
    col += 0.12 * tintedIrid;

    // Keep text side (left < ~35% width on desktop) 100% readable
    float screenX = gl_FragCoord.x / max(u_res.x, 1.0);
    float leftFade = mix(smoothstep(0.28, 0.52, screenX), 1.0, u_isMobile);

    float bandMask = smoothstep(0.12, 0.55, h) * leftFade;
    float specTotal = spec1 + spec2 * 0.6;
    float alpha = clamp(bandMask * (0.30 + 0.70 * fres + 0.25 * specTotal) + innerGlow * leftFade * 0.22, 0.0, 1.0);
    alpha *= u_opacityScale;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0) * alpha, alpha);
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function activateCssRibbonFallback(canvas) {
  canvas.style.display = 'none';
  const hero = document.getElementById('hero');
  if (!hero) return;

  if (hero.querySelector('.hero-ribbon-css-fallback')) return;
  const fallback = document.createElement('div');
  fallback.className = 'hero-ribbon-css-fallback';
  fallback.setAttribute('aria-hidden', 'true');
  fallback.innerHTML =
    '<span class="hero-ribbon-css-fallback__band hero-ribbon-css-fallback__band--a"></span>' +
    '<span class="hero-ribbon-css-fallback__band hero-ribbon-css-fallback__band--b"></span>';
  hero.appendChild(fallback);
}

export function initHeroShader() {
  const heroSection = document.getElementById('hero');
  const canvas = document.getElementById('hero-ribbon-canvas');
  if (!heroSection || !canvas) return;

  let gl;
  try {
    gl =
      canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
      }) ||
      canvas.getContext('experimental-webgl', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
      });
  } catch {
    activateCssRibbonFallback(canvas);
    return;
  }

  if (!gl) {
    activateCssRibbonFallback(canvas);
    return;
  }

  const program = createProgram(gl, VERT_SRC, FRAG_SRC);
  if (!program) {
    activateCssRibbonFallback(canvas);
    return;
  }

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const posLoc = gl.getAttribLocation(program, 'aPos');
  const timeLoc = gl.getUniformLocation(program, 'u_time');
  const resLoc = gl.getUniformLocation(program, 'u_res');
  const centerLoc = gl.getUniformLocation(program, 'u_center');
  const scaleLoc = gl.getUniformLocation(program, 'u_scale');
  const opacityLoc = gl.getUniformLocation(program, 'u_opacityScale');
  const isMobileLoc = gl.getUniformLocation(program, 'u_isMobile');

  // Render at 0.5x resolution (devicePixelRatio = 1) scaled smoothly with CSS
  const updateCanvasSize = () => {
    const width = Math.max(1, Math.floor(window.innerWidth * RIBBON_CONFIG.resolutionScale));
    const height = Math.max(1, Math.floor(window.innerHeight * RIBBON_CONFIG.resolutionScale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  updateCanvasSize();
  window.addEventListener('resize', updateCanvasSize, { passive: true });

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isReducedMotion = reducedMotionQuery.matches;
  let isHeroVisible = true;
  let isTabVisible = !document.hidden;
  let rafId = null;
  let simTime = 1.2;
  let lastFrameNow = null;

  const drawRibbon = () => {
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const isMobile = window.innerWidth < RIBBON_CONFIG.mobileBreakpoint;

    gl.uniform1f(timeLoc, simTime);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.uniform2f(centerLoc, isMobile ? 0.5 : 0.64, 0.5);
    gl.uniform1f(scaleLoc, isMobile ? 0.72 : 1.0);
    gl.uniform1f(opacityLoc, isMobile ? RIBBON_CONFIG.mobileOpacity : 1.0);
    gl.uniform1f(isMobileLoc, isMobile ? 1.0 : 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const loop = (now) => {
    if (!isHeroVisible || !isTabVisible) {
      rafId = null;
      lastFrameNow = null;
      return;
    }

    if (lastFrameNow === null) lastFrameNow = now;
    const delta = Math.min((now - lastFrameNow) * 0.001, 0.05);
    lastFrameNow = now;

    simTime += delta * (isReducedMotion ? RIBBON_CONFIG.reducedMotionSpeed : 1.0);

    drawRibbon();
    rafId = requestAnimationFrame(loop);
  };

  const startLoop = () => {
    if (!rafId && isHeroVisible && isTabVisible) {
      lastFrameNow = null;
      rafId = requestAnimationFrame(loop);
    }
  };

  if ('IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(
      (entries) => {
        isHeroVisible = entries[0].isIntersecting;
        if (isHeroVisible) startLoop();
      },
      { threshold: 0.05 }
    );
    heroObserver.observe(heroSection);
  }

  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    if (isTabVisible) startLoop();
  });

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', (event) => {
      isReducedMotion = event.matches;
    });
  }

  startLoop();
}

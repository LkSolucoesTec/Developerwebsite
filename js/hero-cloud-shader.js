/* ==========================================================================
   Canvas A: Living Purple Cloud Background Shader (WebGL1/2 Compatible)
   5-octave domain-warped FBM nebula band rendered at 0.6x resolution.
   ========================================================================== */

export const CLOUD_CONFIG = {
  resolutionScale: 0.6,
  reducedMotionSpeed: 0.2,
};

const CLOUD_VERT_SRC = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const CLOUD_FRAG_SRC = `
  precision highp float;

  varying vec2 vUv;
  uniform float u_time;
  uniform vec2 u_resolution;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.02 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * 1.45;

    float t = u_time * 0.06;

    vec2 q = vec2(
      fbm(p + t * 0.1),
      fbm(p + vec2(5.2, 1.3) - t * 0.12)
    );
    vec2 warped = p + 0.6 * q;
    float cloud = fbm(warped + q);

    // Diagonal nebula light band from bottom-left corner up toward top-center
    float bandDist = abs((uv.x - 0.08) * 0.88 - (uv.y - 0.08) * 0.48);
    float bandMask = exp(-pow(bandDist * 2.35, 2.0));

    // Soft secondary aura supporting right-side glass ribbon
    vec2 ribbonAuraPos = vec2((uv.x - 0.68) * 1.25, (uv.y - 0.50) * 1.35);
    float ribbonAura = exp(-dot(ribbonAuraPos, ribbonAuraPos) * 2.0);

    float topLeftSoft = smoothstep(0.0, 0.58, uv.x * 0.85 + (1.0 - uv.y) * 0.55);
    float beamEnvelope = clamp(bandMask * (0.65 + 0.35 * topLeftSoft) + ribbonAura * 0.50, 0.0, 1.25);

    float density = smoothstep(0.22, 0.88, cloud) * beamEnvelope;
    float core = smoothstep(0.48, 0.94, cloud) * bandMask;

    vec3 bgBase = vec3(0.0196, 0.0, 0.0314);      // #050008
    vec3 deepPurple = vec3(0.165, 0.039, 0.369);  // #2A0A5E
    vec3 vividViolet = vec3(0.478, 0.122, 1.000); // #7A1FFF
    vec3 brightCore = vec3(0.655, 0.149, 1.000);  // #A726FF
    vec3 blueTint = vec3(0.184, 0.420, 1.000);    // #2F6BFF

    vec3 col = bgBase;
    col = mix(col, deepPurple, clamp(density * 0.92, 0.0, 1.0));
    col += vividViolet * pow(density, 1.35) * 0.58;
    col += brightCore * pow(core, 1.8) * 0.48;
    col += blueTint * smoothstep(0.45, 0.85, q.y) * beamEnvelope * 0.11;

    // Vignette keeping corners dark
    vec2 vigUv = uv - 0.5;
    float vignette = smoothstep(0.95, 0.24, length(vigUv * vec2(1.1, 1.05)));
    col = mix(bgBase, col, 0.38 + 0.62 * vignette);

    // Subtle 3% film grain
    float grain = (hash(gl_FragCoord.xy + fract(u_time * 13.37) * 512.0) - 0.5) * 0.03;
    col = clamp(col + grain, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileCloudShader(gl, type, source) {
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

function createCloudProgram(gl, vertSrc, fragSrc) {
  const vs = compileCloudShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileCloudShader(gl, gl.FRAGMENT_SHADER, fragSrc);
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

function renderCloud2DFallback(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const paint = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * CLOUD_CONFIG.resolutionScale));
    const h = Math.max(1, Math.floor(rect.height * CLOUD_CONFIG.resolutionScale));
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = '#050008';
    ctx.fillRect(0, 0, w, h);

    const beam = ctx.createLinearGradient(0, h, w * 0.65, 0);
    beam.addColorStop(0, 'rgba(122, 31, 255, 0.42)');
    beam.addColorStop(0.5, 'rgba(42, 10, 94, 0.35)');
    beam.addColorStop(1, 'rgba(5, 0, 8, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, w, h);
  };

  paint();
  window.addEventListener('resize', paint, { passive: true });
}

export function initHeroCloudShader() {
  const heroSection = document.getElementById('hero');
  const canvas = document.getElementById('hero-cloud-canvas');
  if (!heroSection || !canvas) return;

  let gl;
  try {
    gl =
      canvas.getContext('webgl', { alpha: false, antialias: false, depth: false }) ||
      canvas.getContext('experimental-webgl', { alpha: false, antialias: false, depth: false });
  } catch {
    renderCloud2DFallback(canvas);
    return;
  }

  if (!gl) {
    renderCloud2DFallback(canvas);
    return;
  }

  const program = createCloudProgram(gl, CLOUD_VERT_SRC, CLOUD_FRAG_SRC);
  if (!program) {
    renderCloud2DFallback(canvas);
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
  const resLoc = gl.getUniformLocation(program, 'u_resolution');

  const updateSize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const width = Math.max(1, Math.floor(rect.width * CLOUD_CONFIG.resolutionScale));
    const height = Math.max(1, Math.floor(rect.height * CLOUD_CONFIG.resolutionScale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  updateSize();
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(updateSize) : null;
  if (resizeObserver) resizeObserver.observe(canvas);
  else window.addEventListener('resize', updateSize, { passive: true });

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isReducedMotion = reducedMotionQuery.matches;
  let isHeroVisible = true;
  let isTabVisible = !document.hidden;
  let rafId = null;
  let simTime = 1.5;
  let lastFrameNow = null;

  const drawCloud = () => {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(timeLoc, simTime);
    gl.uniform2f(resLoc, canvas.width, canvas.height);

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

    simTime += delta * (isReducedMotion ? CLOUD_CONFIG.reducedMotionSpeed : 1.0);

    drawCloud();
    rafId = requestAnimationFrame(loop);
  };

  const start = () => {
    if (!rafId && isHeroVisible && isTabVisible) {
      lastFrameNow = null;
      rafId = requestAnimationFrame(loop);
    }
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        isHeroVisible = entries[0].isIntersecting;
        if (isHeroVisible) start();
      },
      { threshold: 0.05 }
    );
    observer.observe(heroSection);
  }

  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    if (isTabVisible) start();
  });

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', (event) => {
      isReducedMotion = event.matches;
    });
  }

  start();
}

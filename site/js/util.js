// Shared helpers: canvas sizing, theme tokens, easing.

export function fitCanvas(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h, dpr };
}

export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function onResize(el, fn) {
  let raf = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fn);
  }).observe(el);
}

export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;

// Hex "#rrggbb" -> "rgba(r,g,b,a)"
export function alpha(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Run `fn(t)` for `ms` milliseconds; returns a cancel function.
export function tween(ms, fn, done) {
  const t0 = performance.now();
  let raf = 0;
  const step = now => {
    const t = clamp((now - t0) / ms, 0, 1);
    fn(t);
    if (t < 1) raf = requestAnimationFrame(step);
    else done && done();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

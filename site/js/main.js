import { initKoch } from './panel-koch.js';
import { initBoxes, renderMiniBoxes } from './panel-boxes.js';
import { initBroccoli } from './panel-broccoli.js';
import { initNeedle } from './panel-needle.js';
import { initSlide } from './panel-slide.js';
import { initPerron } from './panel-perron.js';
import { initTubes } from './panel-tubes.js';

// ── Theme ──
const root = document.documentElement;
try {
  const saved = localStorage.getItem('theme');
  if (saved) root.dataset.theme = saved;
} catch {}
function toggleTheme() {
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  // let the CSS variables settle before canvases re-read them
  requestAnimationFrame(() => document.dispatchEvent(new Event('themechange')));
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
document.getElementById('fsBtn').addEventListener('click', toggleFullscreen);
document.getElementById('themeBtn').addEventListener('click', toggleTheme);
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement) return;
  if (e.key === 't' || e.key === 'T') toggleTheme();
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
});

// ── Boot ──
function boot() {
  window.renderMathInElement?.(document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  });
  renderMiniBoxes(document.getElementById('miniBoxes'));

  const modules = new Map();
  for (const [id, init] of [
    ['p-koch', initKoch], ['p-boxes', initBoxes], ['p-broccoli', initBroccoli],
    ['p-needle', initNeedle], ['p-slide', initSlide], ['p-perron', initPerron], ['p-cs', initTubes],
  ]) {
    const el = document.getElementById(id);
    modules.set(el, init(el));
  }

  // start a section's animation when it scrolls into view, pause it when it leaves
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const m = modules.get(e.target);
      if (e.isIntersecting) m.enter();
      else m.leave();
    }
  }, { threshold: 0.45 });
  modules.forEach((_, el) => io.observe(el));
}

// KaTeX scripts are deferred; module scripts run after them, but guard anyway.
if (window.renderMathInElement) boot();
else window.addEventListener('load', boot, { once: true });

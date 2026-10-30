import { initKoch } from './panel-koch.js';
import { initBoxes, renderMiniBoxes } from './panel-boxes.js';
import { initBroccoli } from './panel-broccoli.js';

const panels = [...document.querySelectorAll('.panel')];
const tabs = document.getElementById('tabs');
const progress = document.getElementById('progress');

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

// ── Deck ──
const state = { i: 0, step: 0 };
const maxStep = panels.map(p => Math.max(0, ...[...p.querySelectorAll('.frag')].map(f => +f.dataset.step || 0)));
const modules = new Map();

const deck = {
  go(i, step = 0) {
    i = Math.max(0, Math.min(panels.length - 1, i));
    const prev = state.i;
    if (i !== prev) modules.get(panels[prev])?.leave?.();
    state.i = i;
    state.step = Math.max(0, Math.min(maxStep[i], step));
    panels.forEach((p, k) => {
      p.classList.toggle('active', k === i);
      p.classList.toggle('past', k < i);
    });
    tabs.querySelectorAll('.tab').forEach((t, k) => t.classList.toggle('on', k === i));
    this.setStep(state.step);
    if (i !== prev || !this.started) modules.get(panels[i])?.enter?.();
    this.started = true;
    try { history.replaceState(null, '', `#${i + 1}`); } catch {}
  },
  setStep(s) {
    const p = panels[state.i];
    state.step = Math.max(0, Math.min(maxStep[state.i], s));
    p.querySelectorAll('.frag').forEach(f => f.classList.toggle('shown', +f.dataset.step <= state.step));
    modules.get(p)?.step?.(state.step);
    const total = panels.length;
    const frac = (state.i + (maxStep[state.i] ? state.step / (maxStep[state.i] + 1) : 0) + 1) / total;
    progress.style.width = `${frac * 100}%`;
  },
  next() {
    if (state.step < maxStep[state.i]) this.setStep(state.step + 1);
    else if (state.i < panels.length - 1) this.go(state.i + 1, 0);
  },
  prev() {
    if (state.step > 0) this.setStep(state.step - 1);
    else if (state.i > 0) this.go(state.i - 1, maxStep[state.i - 1]);
  },
};
window.deck = deck;

// tabs
const lockedGroup = tabs.querySelector('.tab-locked');
panels.forEach((p, k) => {
  const b = document.createElement('button');
  b.className = 'tab';
  b.innerHTML = `<span class="tab-num">0${k + 1}</span>${p.dataset.title}`;
  b.addEventListener('click', () => deck.go(k));
  tabs.insertBefore(b, lockedGroup);
});

// ── Keyboard ──
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const onRange = e.target instanceof HTMLInputElement && e.target.type === 'range';
  switch (e.key) {
    case 'ArrowRight': case 'PageDown': case ' ':
      if (onRange && e.key !== 'PageDown') return;
      e.preventDefault(); deck.next(); break;
    case 'ArrowLeft': case 'PageUp':
      if (onRange && e.key !== 'PageUp') return;
      e.preventDefault(); deck.prev(); break;
    case 'f': case 'F': toggleFullscreen(); break;
    case 't': case 'T': toggleTheme(); break;
    default:
      if (/^[1-9]$/.test(e.key) && +e.key <= panels.length) deck.go(+e.key - 1);
  }
});

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
document.getElementById('fsBtn').addEventListener('click', toggleFullscreen);
document.getElementById('themeBtn').addEventListener('click', toggleTheme);

// ── Talk timer (10 min countdown) ──
const timerEl = document.getElementById('timer');
const TALK = 10 * 60;
let elapsed = 0, timerT0 = 0, timerId = 0;
function renderTimer() {
  const left = TALK - elapsed;
  const a = Math.abs(Math.round(left));
  timerEl.textContent = `${left < 0 ? '+' : ''}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
  timerEl.classList.toggle('warn', left <= 120 && left > 0);
  timerEl.classList.toggle('over', left <= 0);
}
timerEl.addEventListener('click', () => {
  if (timerId) {
    clearInterval(timerId); timerId = 0; timerEl.classList.remove('running');
  } else {
    timerT0 = performance.now() - elapsed * 1000;
    timerId = setInterval(() => { elapsed = (performance.now() - timerT0) / 1000; renderTimer(); }, 250);
    timerEl.classList.add('running');
  }
});
timerEl.addEventListener('dblclick', () => {
  clearInterval(timerId); timerId = 0; elapsed = 0; timerEl.classList.remove('running'); renderTimer();
});

// ── Boot ──
function renderMath() {
  if (!window.renderMathInElement) return false;
  window.renderMathInElement(document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  });
  return true;
}

function boot() {
  renderMath();
  modules.set(document.getElementById('p-koch'), initKoch(document.getElementById('p-koch')));
  modules.set(document.getElementById('p-boxes'), initBoxes(document.getElementById('p-boxes')));
  modules.set(document.getElementById('p-broccoli'), initBroccoli(document.getElementById('p-broccoli'), deck));
  renderMiniBoxes(document.getElementById('miniBoxes'));
  const fromHash = parseInt(location.hash.slice(1), 10);
  deck.go(Number.isFinite(fromHash) ? fromHash - 1 : 0);
  window.addEventListener('hashchange', () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (Number.isFinite(n) && n - 1 !== state.i) deck.go(n - 1);
  });
}

// KaTeX scripts are deferred; module scripts run after them, but guard anyway.
if (window.renderMathInElement) boot();
else window.addEventListener('load', boot, { once: true });

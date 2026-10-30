import { snowflake, refine } from './koch.js';
import { fitCanvas, token, onResize, tween, easeOut, easeInOut, alpha, lerp } from './util.js';

const MAX_N = 6;
const ZOOM_DEPTH = 7;
const ZOOM_PERIOD = 2600; // ms per factor of 3

export function initKoch(panel) {
  const canvas = panel.querySelector('#kochCanvas');
  const ctx = canvas.getContext('2d');
  const hud = panel.querySelector('#kochHud');
  const $n = panel.querySelector('#kN');
  const $len = panel.querySelector('#kLen');
  const $lenBar = panel.querySelector('#kLenBar');
  const $area = panel.querySelector('#kArea');
  const $areaBar = panel.querySelector('#kAreaBar');
  const playBtn = panel.querySelector('#kPlay');

  let mode = 'iterate';
  let n = 0;
  let morph = null; // { from, t, dir }
  let cancelTween = null;
  let playTimer = 0;
  let zoomRaf = 0;
  let zoomT0 = 0;
  let active = false;

  function geometry(w, h) {
    // snowflake spans width 1 and height 2/sqrt(3) in unit coords
    const s = Math.min(w / 1, h / (2 / Math.sqrt(3))) * 0.8;
    return { s, cx: w / 2, cy: h / 2 };
  }

  function strokePoly(pts, tx, ty, s, close = true) {
    ctx.beginPath();
    ctx.moveTo(tx + pts[0] * s, ty + pts[1] * s);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(tx + pts[i] * s, ty + pts[i + 1] * s);
    if (close) ctx.closePath();
  }

  function drawIterate() {
    const { w, h, dpr } = fitCanvas(canvas);
    const { s, cx, cy } = geometry(w, h);
    const ink = token('--ink'), accent = token('--accent'), ink3 = token('--ink-3');
    ctx.clearRect(0, 0, w, h);

    // ghost of the starting triangle
    if (n > 0 || morph) {
      ctx.setLineDash([6 * dpr, 7 * dpr]);
      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = alpha(ink3.startsWith('#') ? ink3 : '#888888', 0.6);
      strokePoly(snowflake(0), cx, cy, s);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const pts = morph ? refine(snowflake(morph.from), morph.t) : snowflake(n);
    strokePoly(pts, cx, cy, s);
    ctx.fillStyle = alpha(accent, 0.1);
    ctx.fill();
    ctx.lineWidth = 1.7 * dpr;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ink;
    ctx.stroke();

    hud.textContent = `${3 * 4 ** n} segments`;
  }

  function drawZoom(now) {
    const { w, h, dpr } = fitCanvas(canvas);
    const { s, cx, cy } = geometry(w, h);
    const ink = token('--ink'), accent = token('--accent');
    const z = (now - zoomT0) / ZOOM_PERIOD; // total zoom = 3^z
    const local = z < 1 ? z : 1 + ((z - 1) % 1);
    const k = Math.pow(3, local);
    const pts = snowflake(ZOOM_DEPTH);
    // zoom centre: the top vertex, self-similar under x3 about itself
    const vx = pts[0], vy = pts[1];
    const a = easeInOut(Math.min(z, 1));
    const sx = lerp(cx + vx * s, w / 2, a);
    const sy = lerp(cy + vy * s, h * 0.32, a);
    const S = s * k;

    ctx.clearRect(0, 0, w, h);
    strokePoly(pts, sx - vx * S, sy - vy * S, S);
    ctx.fillStyle = alpha(accent, 0.1);
    ctx.fill();
    ctx.lineWidth = 1.5 * dpr;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ink;
    ctx.stroke();

    const total = Math.pow(3, z);
    hud.textContent = `zoom ×${total < 1000 ? total.toFixed(total < 10 ? 1 : 0) : total.toExponential(1).replace('e+', '·10^')}`;
    if (active && mode === 'zoom') zoomRaf = requestAnimationFrame(drawZoom);
  }

  function draw() {
    if (mode === 'iterate') drawIterate();
  }

  function updateStats() {
    const L = Math.pow(4 / 3, n);
    const A = 1 + 0.6 * (1 - Math.pow(4 / 9, n));
    $n.textContent = n;
    $len.textContent = L.toFixed(2);
    $lenBar.style.width = `${(Math.log(L) / Math.log(Math.pow(4 / 3, MAX_N))) * 100}%`;
    $area.textContent = A.toFixed(3);
    $areaBar.style.width = `${(A / 1.6) * 62.5}%`;
  }

  function setN(target) {
    target = Math.max(0, Math.min(MAX_N, target));
    if (target === n || mode !== 'iterate') return;
    cancelTween && cancelTween();
    if (target === n + 1) {
      morph = { from: n, t: 0 };
      n = target;
      updateStats();
      cancelTween = tween(750, t => { morph.t = easeOut(t); drawIterate(); }, () => { morph = null; drawIterate(); });
    } else if (target === n - 1) {
      morph = { from: target, t: 1 };
      cancelTween = tween(550, t => { morph.t = 1 - easeOut(t); drawIterate(); }, () => {
        morph = null; n = target; updateStats(); drawIterate();
      });
    } else {
      morph = null; n = target; updateStats(); drawIterate();
    }
  }

  function stopPlay() {
    clearInterval(playTimer);
    playTimer = 0;
    playBtn.classList.remove('on');
  }
  function togglePlay() {
    if (playTimer) return stopPlay();
    if (mode !== 'iterate') setMode('iterate');
    if (n === MAX_N) setN(0);
    playBtn.classList.add('on');
    playTimer = setInterval(() => {
      if (n >= MAX_N) return stopPlay();
      setN(n + 1);
    }, 1100);
  }

  function setMode(m) {
    mode = m;
    panel.querySelectorAll('.seg-btn[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    cancelAnimationFrame(zoomRaf);
    if (m === 'zoom') {
      stopPlay();
      zoomT0 = performance.now();
      zoomRaf = requestAnimationFrame(drawZoom);
    } else {
      drawIterate();
    }
  }

  panel.querySelectorAll('.seg-btn[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  panel.querySelector('#kPlus').addEventListener('click', () => { stopPlay(); setN(n + 1); });
  panel.querySelector('#kMinus').addEventListener('click', () => { stopPlay(); setN(n - 1); });
  playBtn.addEventListener('click', togglePlay);
  onResize(canvas, draw);
  document.addEventListener('themechange', draw);
  updateStats();

  return {
    enter() {
      active = true;
      if (mode === 'zoom') { zoomT0 = performance.now(); zoomRaf = requestAnimationFrame(drawZoom); }
      else drawIterate();
    },
    leave() { active = false; stopPlay(); cancelAnimationFrame(zoomRaf); },
  };
}

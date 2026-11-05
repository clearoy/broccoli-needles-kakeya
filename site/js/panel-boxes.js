import { snowflake } from './koch.js';
import { fitCanvas, token, onResize, tween, alpha } from './util.js';

const K_MAX = 8;
const SVG = 'http://www.w3.org/2000/svg';
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = v => String(v).split('').map(c => SUP[c] ?? c).join('');

const SHAPES = [
  { id: 'line', name: 'Line', color: '--s1' },
  { id: 'square', name: 'Square', color: '--s2' },
  { id: 'koch', name: 'Koch', color: '--s3' },
];

// ── Geometry in the unit square [0,1]^2 ──
const LINE = new Float64Array([0.09, 0.22, 0.91, 0.79]);
const SQ = [0.235, 0.765];
const KOCH = (() => {
  const p = snowflake(8);
  const out = new Float64Array(p.length);
  for (let i = 0; i < p.length; i += 2) {
    out[i] = 0.5 + 0.013 + p[i] * 0.8;
    out[i + 1] = 0.5 + 0.007 + p[i + 1] * 0.8;
  }
  return out;
})();

function cellsOfPolyline(pts, closed, k) {
  const g = 2 ** k, step = 1 / g / 4, set = new Set();
  const m = pts.length / 2, segs = closed ? m : m - 1;
  for (let i = 0; i < segs; i++) {
    const ax = pts[2 * i], ay = pts[2 * i + 1];
    const j = (i + 1) % m, bx = pts[2 * j], by = pts[2 * j + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let s = 0; s <= n; s++) {
      const x = ax + ((bx - ax) * s) / n, y = ay + ((by - ay) * s) / n;
      set.add(Math.min(g - 1, Math.floor(x * g)) * 4096 + Math.min(g - 1, Math.floor(y * g)));
    }
  }
  return Int32Array.from(set);
}

function cellsOfSquare(k) {
  const g = 2 ** k, i0 = Math.floor(SQ[0] * g), i1 = Math.min(g - 1, Math.floor(SQ[1] * g));
  const out = [];
  for (let i = i0; i <= i1; i++) for (let j = i0; j <= i1; j++) out.push(i * 4096 + j);
  return Int32Array.from(out);
}

const DATA = {};
for (const { id } of SHAPES) {
  DATA[id] = [];
  for (let k = 0; k <= K_MAX; k++) {
    const cells = k === 0 ? Int32Array.of(0)
      : id === 'line' ? cellsOfPolyline(LINE, false, k)
      : id === 'square' ? cellsOfSquare(k)
      : cellsOfPolyline(KOCH, true, k);
    const N = cells.length;
    DATA[id].push({ k, cells, N, A: N / 4 ** k });
  }
}

// least-squares slope of log2 A against k over the finest (up to) four scales
function slope(id, kmax) {
  const pts = DATA[id].slice(Math.max(2, kmax - 3), kmax + 1);
  if (pts.length < 2) return null;
  const xs = pts.map(p => p.k), ys = pts.map(p => Math.log2(p.A));
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return num / den;
}

export function initBoxes(panel) {
  const canvas = panel.querySelector('#boxCanvas');
  const ctx = canvas.getContext('2d');
  const slider = panel.querySelector('#bEps');
  const epsTxt = panel.querySelector('#bEpsTxt');
  const $N = panel.querySelector('#bN');
  const $A = panel.querySelector('#bA');
  const chart = panel.querySelector('#decayChart');
  const tip = panel.querySelector('#chartTip');
  const tbody = panel.querySelector('#dimTable tbody');
  const playBtn = panel.querySelector('#bPlay');

  let shape = 'line';
  let k = 1;
  let fade = 1;
  let cancelFade = null;
  let playTimer = 0;
  let hoverK = null;

  // ── Canvas ──
  function drawCanvas() {
    const { w, h, dpr } = fitCanvas(canvas);
    const size = Math.min(w, h) * 0.84;
    const ox = (w - size) / 2, oy = (h - size) / 2;
    const ink = token('--ink'), col = token(SHAPES.find(s => s.id === shape).color);
    const g = 2 ** k, c = size / g;
    ctx.clearRect(0, 0, w, h);

    // domain
    ctx.strokeStyle = alpha(ink, 0.18);
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(ox, oy, size, size);

    // grid
    if (k <= 6) {
      ctx.strokeStyle = alpha(ink, 0.07);
      ctx.beginPath();
      for (let i = 1; i < g; i++) {
        ctx.moveTo(ox + i * c, oy); ctx.lineTo(ox + i * c, oy + size);
        ctx.moveTo(ox, oy + i * c); ctx.lineTo(ox + size, oy + i * c);
      }
      ctx.stroke();
    }

    // covering boxes
    const { cells } = DATA[shape][k];
    ctx.fillStyle = alpha(col, 0.3 * fade);
    ctx.strokeStyle = alpha(col, 0.85 * fade);
    ctx.lineWidth = Math.min(1.5 * dpr, c * 0.12);
    const gap = c > 6 ? 1 * dpr : 0;
    ctx.beginPath();
    for (const v of cells) {
      const i = (v / 4096) | 0, j = v % 4096;
      ctx.rect(ox + i * c + gap / 2, oy + j * c + gap / 2, c - gap, c - gap);
    }
    ctx.fill();
    if (c > 5) ctx.stroke();

    // the shape itself
    ctx.strokeStyle = ink;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (shape === 'line') {
      ctx.lineWidth = 2.2 * dpr;
      ctx.beginPath();
      ctx.moveTo(ox + LINE[0] * size, oy + LINE[1] * size);
      ctx.lineTo(ox + LINE[2] * size, oy + LINE[3] * size);
      ctx.stroke();
    } else if (shape === 'square') {
      ctx.lineWidth = 2 * dpr;
      const a = SQ[0] * size, b = (SQ[1] - SQ[0]) * size;
      ctx.fillStyle = alpha(ink, 0.12);
      ctx.fillRect(ox + a, oy + a, b, b);
      ctx.strokeRect(ox + a, oy + a, b, b);
    } else {
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.moveTo(ox + KOCH[0] * size, oy + KOCH[1] * size);
      for (let i = 2; i < KOCH.length; i += 2) ctx.lineTo(ox + KOCH[i] * size, oy + KOCH[i + 1] * size);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // ── Chart ──
  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVG, tag);
    for (const a in attrs) e.setAttribute(a, attrs[a]);
    parent && parent.appendChild(e);
    return e;
  }

  function drawChart() {
    const r = chart.getBoundingClientRect();
    const W = Math.max(200, r.width), H = Math.max(150, r.height);
    chart.setAttribute('viewBox', `0 0 ${W} ${H}`);
    chart.innerHTML = '';
    const m = { l: 44, r: 70, t: 14, b: 40 };
    const X = kk => m.l + (kk / K_MAX) * (W - m.l - m.r);
    const yMin = -8, yMax = 0.6;
    const Y = v => m.t + ((yMax - v) / (yMax - yMin)) * (H - m.t - m.b);

    for (let v = 0; v >= -8; v -= 2) {
      el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'grid' }, chart);
      el('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'tick' }, chart).textContent = v === 0 ? '1' : '2' + sup(v);
    }
    for (let kk = 0; kk <= K_MAX; kk += 1) {
      el('text', { x: X(kk), y: H - m.b + 18, 'text-anchor': 'middle', class: 'tick' }, chart).textContent = kk === 0 ? '1' : '2' + sup(-kk);
    }
    el('text', { x: W - m.r, y: H - 4, 'text-anchor': 'end', class: 'ax-title' }, chart).textContent = 'ε  →  0';
    el('text', { x: m.l, y: H - 4, 'text-anchor': 'start', class: 'ax-title' }, chart).textContent = 'log scale';
    const yt = el('text', { x: 12, y: m.t + 4, class: 'ax-title' }, chart);
    yt.textContent = 'A(ε)';

    const labels = [];
    for (const s of SHAPES) {
      const col = token(s.color);
      const pts = DATA[s.id].slice(0, k + 1);
      const on = s.id === shape;
      const g = el('g', { class: on ? '' : 'dim' }, chart);
      el('polyline', {
        points: pts.map(p => `${X(p.k)},${Y(Math.log2(p.A))}`).join(' '),
        class: 'series', stroke: col,
      }, g);
      pts.forEach(p => el('circle', { cx: X(p.k), cy: Y(Math.log2(p.A)), r: on ? 4.5 : 3.5, fill: col, class: 'dot' }, g));
      const last = pts[pts.length - 1];
      labels.push({ y: Y(Math.log2(last.A)), x: X(last.k), text: s.name, g });
    }
    // direct labels, nudged apart
    if (k >= 2) {
      labels.sort((a, b) => a.y - b.y);
      for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 15) labels[i].y = labels[i - 1].y + 15;
      labels.forEach(L => {
        el('text', { x: L.x + 10, y: L.y + 4, class: 'dlabel' }, L.g).textContent = L.text;
      });
    }

    // hover layer
    if (hoverK !== null && hoverK <= k) {
      el('line', { x1: X(hoverK), x2: X(hoverK), y1: m.t, y2: H - m.b, class: 'cursor' }, chart);
    }
    const hit = el('rect', { x: m.l - 10, y: m.t, width: W - m.l - m.r + 20, height: H - m.t - m.b, class: 'hit' }, chart);
    hit.addEventListener('mousemove', e => {
      const bx = chart.getBoundingClientRect();
      const px = ((e.clientX - bx.left) / bx.width) * W;
      const kk = Math.max(0, Math.min(k, Math.round(((px - m.l) / (W - m.l - m.r)) * K_MAX)));
      if (kk !== hoverK) { hoverK = kk; drawChart(); }
      showTip(kk, (X(kk) / W) * bx.width, e.clientY - bx.top);
    });
    hit.addEventListener('mouseleave', () => { hoverK = null; tip.hidden = true; drawChart(); });
  }

  function showTip(kk, x, y) {
    const rows = SHAPES.map(s => {
      const p = DATA[s.id][kk];
      return `<div><i class="sw" style="background:var(${s.color})"></i> ${s.name.padEnd(6, ' ')} N=${p.N}  A=${p.A.toFixed(4)}</div>`;
    }).join('');
    tip.innerHTML = `<div><b>ε = ${kk === 0 ? '1' : '2' + sup(-kk)}</b></div>${rows}`;
    tip.hidden = false;
    const card = tip.parentElement.getBoundingClientRect();
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(card.width - tw - 8, x + 18)}px`;
    tip.style.top = `${Math.max(8, y - 30)}px`;
  }

  function drawTable() {
    tbody.innerHTML = SHAPES.map(s => {
      const sl = slope(s.id, k);
      const rate = sl === null ? '—' : (-sl).toFixed(2);
      const d = sl === null ? '—' : (2 + sl).toFixed(2);
      return `<tr class="${s.id === shape ? 'on' : ''}"><td><i class="sw" style="background:var(${s.color})"></i>${s.name}</td><td>${rate}</td><td class="dval">${d}</td></tr>`;
    }).join('');
  }

  function updateReadouts() {
    const p = DATA[shape][k];
    $N.textContent = p.N.toLocaleString('en-US');
    $A.textContent = p.A.toFixed(4);
    epsTxt.textContent = `1/${2 ** k}`;
    slider.value = k;
  }

  function render(animate) {
    updateReadouts();
    drawChart();
    drawTable();
    cancelFade && cancelFade();
    if (animate) {
      cancelFade = tween(380, t => { fade = 0.25 + 0.75 * t; drawCanvas(); });
    } else {
      fade = 1;
      drawCanvas();
    }
  }

  function setK(v) { k = Math.max(1, Math.min(K_MAX, v)); render(true); }
  function setShape(id) {
    shape = id;
    panel.querySelectorAll('#shapeSeg .seg-btn').forEach(b => b.classList.toggle('on', b.dataset.shape === id));
    render(true);
  }

  function stopPlay() { clearInterval(playTimer); playTimer = 0; playBtn.classList.remove('on'); }
  function togglePlay() {
    if (playTimer) return stopPlay();
    if (k >= K_MAX) setK(1);
    playBtn.classList.add('on');
    playTimer = setInterval(() => { if (k >= K_MAX) return stopPlay(); setK(k + 1); }, 1000);
  }

  slider.addEventListener('input', () => { stopPlay(); setK(+slider.value); });
  panel.querySelectorAll('#shapeSeg .seg-btn').forEach(b => b.addEventListener('click', () => setShape(b.dataset.shape)));
  playBtn.addEventListener('click', togglePlay);
  onResize(canvas, drawCanvas);
  onResize(chart, drawChart);
  document.addEventListener('themechange', () => render(false));

  return {
    enter() { render(false); },
    leave() { stopPlay(); },
  };
}

// Small static illustration for the Minkowski card: a curve and its ε-cover.
export function renderMiniBoxes(svg) {
  const W = 420, H = 270, c = 15;
  const f = x => 128 + 66 * Math.sin(x / 42) + 24 * Math.sin(x / 13 + 1);
  const x0 = 40, x1 = 400;
  const cells = new Set();
  for (let x = x0; x <= x1; x += 0.5) cells.add(`${Math.floor(x / c)},${Math.floor(f(x) / c)}`);
  let out = '';
  for (let gx = Math.floor(x0 / c); gx * c <= x1; gx++) {
    for (let gy = 1; gy * c < H - 10; gy++) {
      const on = cells.has(`${gx},${gy}`);
      out += `<rect x="${gx * c + 0.75}" y="${gy * c + 0.75}" width="${c - 1.5}" height="${c - 1.5}" rx="2" class="${on ? 'mb-on' : 'mb-off'}"/>`;
    }
  }
  let d = `M${x0} ${f(x0).toFixed(1)}`;
  for (let x = x0 + 2; x <= x1; x += 2) d += `L${x} ${f(x).toFixed(1)}`;
  out += `<path d="${d}" class="jump-line" style="stroke-width:2"/>`;
  out += `<text x="${x1}" y="${H - 2}" text-anchor="end" class="axis-lbl strong">N(ε) = ${cells.size}</text>`;
  out += `<path d="M${x0} ${H - 8}h${c}" class="jump-guide" style="stroke-dasharray:none;stroke-width:2"/><text x="${x0 + c + 6}" y="${H - 4}" class="axis-lbl">ε</text>`;
  svg.innerHTML = out;
}

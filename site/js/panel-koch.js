// Static picture for section 02: a Koch curve covered by 3 squares, and the
// same curve three times larger covered by 12 squares of the same size.
// The large curve is four copies of the small one, so each copy reuses the
// small curve's 3 squares (rotated with the copy).

const SVG = 'http://www.w3.org/2000/svg';
const H = Math.sqrt(3) / 2;

// Koch curve from (0,0) to (L,0), bumps pointing up (y up)
function koch(L, depth) {
  let pts = [[0, 0], [L, 0]];
  for (let k = 0; k < depth; k++) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const dx = (bx - ax) / 3, dy = (by - ay) / 3;
      out.push([ax, ay], [ax + dx, ay + dy],
        [ax + 1.5 * dx - H * dy, ay + 1.5 * dy + H * dx],
        [ax + 2 * dx, ay + 2 * dy]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

// the 3 squares of side 1/3 covering the unit curve
const BASE = [0, 1, 2].map(k => [[k / 3, 0], [(k + 1) / 3, 0], [(k + 1) / 3, 1 / 3], [k / 3, 1 / 3]]);

// the four pieces of the 3×-curve, each an isometric copy of the unit curve
const PIECES = [
  { a: [0, 0], phi: 0 },
  { a: [1, 0], phi: Math.PI / 3 },
  { a: [1.5, H], phi: -Math.PI / 3 },
  { a: [2, 0], phi: 0 },
];

export function initKoch(panel) {
  const svg = panel.querySelector('#kochCover');
  const GAP = 0.9, X2 = 1 + GAP; // left drawing on [0,1], right on [X2, X2+3]
  const W = X2 + 3, TOP = 3 * H / 3 + 0.25;
  svg.setAttribute('viewBox', `-0.08 ${-TOP} ${W + 0.16} ${TOP + 0.42}`);

  const el = (tag, at, parent = svg) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in at) e.setAttribute(k, at[k]);
    parent.appendChild(e);
    return e;
  };
  const poly = (pts, dx, cls) => el('polygon', { points: pts.map(([x, y]) => `${x + dx},${-y}`).join(' '), class: cls });
  const line = (pts, dx) => el('polyline', { points: pts.map(([x, y]) => `${x + dx},${-y}`).join(' '), class: 'kc-curve' });
  const text = (x, y, str, cls) => { const t = el('text', { x, y, class: cls, 'text-anchor': 'middle' }); t.textContent = str; };

  // small curve, 3 squares
  BASE.forEach(q => poly(q, 0, 'kc-sq'));
  line(koch(1, 5), 0);

  // big curve, 12 squares
  for (const { a, phi } of PIECES) {
    const c = Math.cos(phi), s = Math.sin(phi);
    BASE.forEach(q => poly(q.map(([x, y]) => [a[0] + c * x - s * y, a[1] + s * x + c * y]), X2, 'kc-sq'));
  }
  line(koch(3, 6), X2);

  // labels
  text(0.5, 0.3, '3 squares', 'kc-lbl');
  text(X2 + 1.5, 0.3, '12 squares', 'kc-lbl');
  text((1 + X2) / 2, -0.22, 'size ×3', 'kc-arrow-lbl');
  el('path', { d: `M${1.12} -0.12 H${X2 - 0.12}`, class: 'kc-arrow', 'marker-end': 'url(#arr)' });

  return { enter() {}, leave() {} };
}

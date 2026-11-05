// Static picture for section 02: a Koch curve covered by 3 squares, and the
// same curve three times larger covered by 12 squares of the same size.
// The large curve is four copies of the small one, so each copy reuses the
// small curve's 3 squares (rotated with the copy).

const SVG = 'http://www.w3.org/2000/svg';
const H = Math.sqrt(3) / 2;

// Koch curve from (0,0) to (L,0), bumps pointing up (y up)
export function koch(L, depth) {
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
  // one curve of base 3: 3 squares of side 1, or 12 squares of side 1/3
  svg.setAttribute('viewBox', '-0.5 -1.16 3.7 1.62');

  const el = (tag, at) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in at) e.setAttribute(k, at[k]);
    svg.appendChild(e);
    return e;
  };
  const pts = q => q.map(([x, y]) => `${x},${-y}`).join(' ');
  const text = (x, y, str) => { const t = el('text', { x, y, class: 'kc-dim-lbl', 'text-anchor': 'middle' }); t.textContent = str; };

  // 12 small squares: each of the 4 pieces reuses the unit curve's 3 squares
  for (const { a, phi } of PIECES) {
    const c = Math.cos(phi), s = Math.sin(phi);
    BASE.forEach(q => el('polygon', { points: pts(q.map(([x, y]) => [a[0] + c * x - s * y, a[1] + s * x + c * y])), class: 'kc-sq' }));
  }
  // 3 big squares
  for (let k = 0; k < 3; k++) el('rect', { x: k, y: -1, width: 1, height: 1, class: 'kc-big' });
  el('polyline', { points: pts(koch(3, 6)), class: 'kc-curve' });

  // side lengths: 1 on the first big square, 1/3 on the first small square
  el('path', { d: 'M-0.16 0V-1M-0.2 0H-0.12M-0.2 -1H-0.12', class: 'kc-dim' });
  text(-0.3, -0.47, '1');
  el('path', { d: 'M0 0.12H0.3333M0 0.08V0.16M0.3333 0.08V0.16', class: 'kc-dim kc-dim-acc' });
  text(0.1667, 0.3, '1/3');

  return { enter() {}, leave() {} };
}

// The plain curve for section 01.
export function renderKochCurve(svg) {
  const pts = koch(1, 6);
  svg.setAttribute('viewBox', `-0.03 ${-0.32} 1.06 0.36`);
  const e = document.createElementNS(SVG, 'polyline');
  e.setAttribute('points', pts.map(([x, y]) => `${x},${-y}`).join(' '));
  e.setAttribute('class', 'kc-curve');
  e.style.strokeWidth = '0.004';
  svg.appendChild(e);
}

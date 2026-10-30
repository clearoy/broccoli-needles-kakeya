// Koch snowflake geometry. Points are flat [x0, y0, x1, y1, ...] arrays of a
// closed polygon (last vertex connects back to the first), y pointing down.

const H = Math.sqrt(3) / 6; // height of a bump relative to the parent segment

// Equilateral triangle of side 1 centred at the origin, vertices clockwise
// on screen (top, bottom-right, bottom-left) so bumps point outward.
export function baseTriangle() {
  const R = 1 / Math.sqrt(3);
  return new Float64Array([
    0, -R,
    0.5, R / 2,
    -0.5, R / 2,
  ]);
}

// One Koch refinement step. `t` in [0, 1] grows the new bump from flat to full.
export function refine(pts, t = 1) {
  const m = pts.length / 2;
  const out = new Float64Array(m * 8);
  for (let i = 0, o = 0; i < m; i++) {
    const ax = pts[2 * i], ay = pts[2 * i + 1];
    const j = (i + 1) % m;
    const bx = pts[2 * j], by = pts[2 * j + 1];
    const dx = bx - ax, dy = by - ay;
    out[o++] = ax; out[o++] = ay;
    out[o++] = ax + dx / 3; out[o++] = ay + dy / 3;
    out[o++] = ax + dx / 2 + dy * H * t; out[o++] = ay + dy / 2 - dx * H * t;
    out[o++] = ax + (2 * dx) / 3; out[o++] = ay + (2 * dy) / 3;
  }
  return out;
}

const cache = [baseTriangle()];
export function snowflake(n) {
  for (let k = cache.length; k <= n; k++) cache[k] = refine(cache[k - 1]);
  return cache[n];
}

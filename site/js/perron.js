// Perron tree geometry (math coords, y up).
// T has base [0, B] on y = 0 and apex (B/2, 1): it holds a unit-length
// segment in every direction within 30° of vertical. Split T into 2^n
// thin triangles; at step k each right half-group slides left so that the
// two halves overlap below height α^k, leaving two small "sprouts" on top.

export const B = 2 / Math.sqrt(3);

export function shifts(n, alpha) {
  const w = B / 2 ** n, out = [];
  for (let k = 1; k <= n; k++) {
    const ak = alpha ** (k - 1);
    // close the gap left by earlier steps, then overlap the two halves
    out.push(2 ** (k - 1) * w * (1 - ak) + (1 - alpha) * 2 ** k * w * ak);
  }
  return out;
}

// x-offset of piece i once the build has progressed to p ∈ [0, n]
export function offset(i, p, sh, ease = t => t) {
  let o = 0;
  for (let k = 1; k <= sh.length; k++) {
    if ((i >> (k - 1)) & 1) o -= sh[k - 1] * ease(Math.min(1, Math.max(0, p - (k - 1))));
  }
  return o;
}

// Triangles as [x0, x1, apexX] (base from x0 to x1 on y = 0, apex at height 1).
export function pieces(n, alpha, p, ease) {
  const N = 2 ** n, w = B / N, sh = shifts(n, alpha), out = [];
  for (let i = 0; i < N; i++) {
    const o = offset(i, p, sh, ease);
    out.push([i * w + o, (i + 1) * w + o, B / 2 + o]);
  }
  return out;
}

// Union area relative to |T|, by rasterising onto a small canvas.
const R = typeof document !== 'undefined' ? document.createElement('canvas') : null;
export function unionArea(tris) {
  const W = 720, H = 360, s = H / 1.05;
  R.width = W; R.height = H;
  const g = R.getContext('2d', { willReadFrequently: true });
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#000';
  g.beginPath();
  for (const [x0, x1, ax] of tris) {
    const X = x => W / 2 + (x - B / 2) * s;
    g.moveTo(X(x0), H); g.lineTo(X(x1), H); g.lineTo(X(ax), H - s); g.closePath();
  }
  g.fill('nonzero');
  const d = g.getImageData(0, 0, W, H).data;
  let c = 0;
  for (let i = 3; i < d.length; i += 4) c += d[i];
  return c / 255 / ((B * s * s) / 2);
}

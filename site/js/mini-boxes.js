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

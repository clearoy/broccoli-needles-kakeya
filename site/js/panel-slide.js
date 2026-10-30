import { fitCanvas, token, onResize, alpha, easeInOut, clamp, drawNeedle } from './util.js';

// Move a unit needle from line ℓ1 (y = 0) to the parallel line ℓ2 (y = D):
// slide along ℓ1, tilt by θ about the tail, slide along the tilted line,
// tilt back. Sliding along its own line sweeps no area; the two tilts
// sweep sectors of area θ/2 each.

const D = 1;
const LEGS = [1.5, 0.9, 1.8, 0.9]; // seconds

function path(theta) {
  const p = -D / Math.tan(theta);
  const run = D / Math.sin(theta);
  return {
    p, run,
    // tail position and needle angle (math coords, y up) at time u ∈ [0, 4]
    at(u) {
      const k = Math.min(3, Math.floor(u)), f = easeInOut(clamp(u - k, 0, 1));
      if (k === 0) return { x: p * f, y: 0, a: 0 };
      if (k === 1) return { x: p, y: 0, a: theta * f };
      if (k === 2) return { x: p + run * f * Math.cos(theta), y: run * f * Math.sin(theta), a: theta };
      return { x: 0, y: D, a: theta * (1 - f) };
    },
  };
}

export function initSlide(panel) {
  const canvas = panel.querySelector('#slideCanvas');
  const ctx = canvas.getContext('2d');
  const $area = panel.querySelector('#slideArea');
  const $len = panel.querySelector('#slideLen');
  let theta = (12 * Math.PI) / 180;
  let t0 = 0, raf = 0, active = false;

  function legTime(ms) {
    let s = ms / 1000;
    for (let i = 0; i < LEGS.length; i++) {
      if (s < LEGS[i]) return i + s / LEGS[i];
      s -= LEGS[i];
    }
    return 4;
  }

  function frame(now) {
    const { w, h, dpr } = fitCanvas(canvas);
    const P = path(theta);
    const u = legTime(now - t0);
    const ink = token('--ink'), acc = token('--accent');

    // fit the whole manoeuvre
    const x0 = P.p - 0.15, x1 = 1.25, y0 = -0.25, y1 = D + Math.sin(theta) + 0.25;
    const s = Math.min((w * 0.9) / (x1 - x0), (h * 0.62) / (y1 - y0));
    const ox = (w - s * (x1 - x0)) / 2 - s * x0;
    const oy = h / 2 + (s * (y1 + y0)) / 2;
    const X = x => ox + x * s, Y = y => oy - y * s;

    ctx.clearRect(0, 0, w, h);

    // the two parallel lines
    ctx.strokeStyle = alpha(ink, 0.35);
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0));
    ctx.moveTo(0, Y(D)); ctx.lineTo(w, Y(D));
    ctx.stroke();
    ctx.fillStyle = alpha(ink, 0.6);
    ctx.font = `italic ${18 * dpr}px "Instrument Serif", serif`;
    ctx.fillText('ℓ₁', 14 * dpr, Y(0) - 8 * dpr);
    ctx.fillText('ℓ₂', 14 * dpr, Y(D) - 8 * dpr);

    // target and start ghosts
    ctx.setLineDash([5 * dpr, 6 * dpr]);
    ctx.strokeStyle = alpha(ink, 0.4);
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath(); ctx.moveTo(X(0), Y(D)); ctx.lineTo(X(1), Y(D)); ctx.stroke();
    // tilted rail
    if (u > 1) {
      ctx.strokeStyle = alpha(ink, 0.25);
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); ctx.moveTo(X(P.p), Y(0)); ctx.lineTo(X(0 + Math.cos(theta) * 1.2), Y(D + Math.sin(theta) * 1.2)); ctx.stroke();
    }
    ctx.setLineDash([]);

    // swept sectors (the only area paid)
    const sector = (cx, cy, a0, a1) => {
      ctx.beginPath();
      ctx.moveTo(X(cx), Y(cy));
      ctx.arc(X(cx), Y(cy), s, -a0, -a1, a1 > a0);
      ctx.closePath();
      ctx.fillStyle = alpha(acc, 0.35);
      ctx.fill();
      ctx.strokeStyle = acc;
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();
    };
    if (u > 1) sector(P.p, 0, 0, theta * (u >= 2 ? 1 : easeInOut(u - 1)));
    if (u > 3) sector(0, D, theta, theta * (1 - easeInOut(Math.min(1, u - 3))));

    const n = P.at(u);
    drawNeedle(ctx, X(n.x), Y(n.y), X(n.x + Math.cos(n.a)), Y(n.y + Math.sin(n.a)), ink, dpr);

    if (u < 4 && active) raf = requestAnimationFrame(frame);
  }

  function play() {
    cancelAnimationFrame(raf);
    const P = path(theta);
    $area.textContent = theta.toFixed(3);
    $len.textContent = (Math.abs(P.p) + P.run).toFixed(1);
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }

  panel.querySelectorAll('[data-theta]').forEach(b => b.addEventListener('click', () => {
    theta = (+b.dataset.theta * Math.PI) / 180;
    panel.querySelectorAll('[data-theta]').forEach(x => x.classList.toggle('on', x === b));
    play();
  }));
  panel.querySelector('#slideReplay').addEventListener('click', play);
  onResize(canvas, () => { if (active) play(); });
  document.addEventListener('themechange', () => { if (active) play(); });

  return {
    enter() { active = true; play(); },
    leave() { active = false; cancelAnimationFrame(raf); },
  };
}

/**
 * Small helpers for drawing the vector sprites. Every sprite is authored in its own
 * viewBox coordinates (the same numbers as the design canvas), with a dark outline.
 */
export type C = CanvasRenderingContext2D;

export const OUT = '#1a1210';

const cache = new Map<string, Path2D>();

export function path(d: string): Path2D {
  let p = cache.get(d);
  if (!p) {
    p = new Path2D(d);
    cache.set(d, p);
  }
  return p;
}

/** Filled shape with the standard outline. `sw` 0 skips the outline. */
export function f(c: C, d: string, fill: string, sw = 3): void {
  const p = path(d);
  c.fillStyle = fill;
  c.fill(p);
  if (sw > 0) {
    c.lineWidth = sw;
    c.strokeStyle = OUT;
    c.stroke(p);
  }
}

/** Stroke only. */
export function s(c: C, d: string, color: string = OUT, w = 3): void {
  c.lineWidth = w;
  c.strokeStyle = color;
  c.stroke(path(d));
}

export const circ = (cx: number, cy: number, r: number): string =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

export const ell = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;

export const rect = (x: number, y: number, w: number, h: number): string => `M${x} ${y}h${w}v${h}h${-w}Z`;

/** Rotate `deg` degrees (clockwise) around (px, py) while drawing `fn`. */
export function rot(c: C, px: number, py: number, deg: number, fn: () => void): void {
  if (!deg) return fn();
  c.save();
  c.translate(px, py);
  c.rotate((deg * Math.PI) / 180);
  c.translate(-px, -py);
  fn();
  c.restore();
}

export function tr(c: C, dx: number, dy: number, fn: () => void): void {
  if (!dx && !dy) return fn();
  c.save();
  c.translate(dx, dy);
  fn();
  c.restore();
}

export function scl(c: C, px: number, py: number, sx: number, sy: number, fn: () => void): void {
  if (sx === 1 && sy === 1) return fn();
  c.save();
  c.translate(px, py);
  c.scale(sx, sy);
  c.translate(-px, -py);
  fn();
  c.restore();
}

export function alpha(c: C, a: number, fn: () => void): void {
  if (a <= 0.001) return;
  if (a >= 1) return fn();
  c.save();
  c.globalAlpha *= a;
  fn();
  c.restore();
}

/**
 * Keyframe lookup. `st` is a flat list of [time, value, time, value, ...] with times in 0..1,
 * eased with smoothstep between stops (close to CSS ease-in-out).
 */
export function kf(t: number, st: number[]): number {
  if (t <= st[0]) return st[1];
  for (let i = 2; i < st.length; i += 2) {
    if (t <= st[i]) {
      const t0 = st[i - 2];
      const t1 = st[i];
      const u = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return st[i - 1] + (st[i + 1] - st[i - 1]) * u * u * (3 - 2 * u);
    }
  }
  return st[st.length - 1];
}

/** Linear keyframes, for things that should move at constant speed. */
export function kfl(t: number, st: number[]): number {
  if (t <= st[0]) return st[1];
  for (let i = 2; i < st.length; i += 2) {
    if (t <= st[i]) {
      const t0 = st[i - 2];
      const t1 = st[i];
      const u = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return st[i - 1] + (st[i + 1] - st[i - 1]) * u;
    }
  }
  return st[st.length - 1];
}

export const frac = (x: number): number => x - Math.floor(x);

/** Common motion curves shared by the sprites. */
export const BOB = [0, 0, 0.25, -3, 0.5, 0, 0.75, -3, 1, 0];
export const LEG = [0, 22, 0.5, -22, 1, 22];
export const LEG2 = [0, 16, 0.5, -16, 1, 16];
export const SWAY = [0, -6, 0.5, 6, 1, -6];
export const SWAY2 = [0, -4, 0.5, 4, 1, -4];
export const SWAY3 = [0, -3, 0.5, 3, 1, -3];

/** Flame flicker: scale around (px, py), the flame's base. */
export function flicker(c: C, px: number, py: number, time: number, period: number, fn: () => void): void {
  const t = frac(time / period);
  const sx = kf(t, [0, 1, 0.25, 0.9, 0.5, 1.08, 0.75, 0.95, 1, 1]);
  const sy = kf(t, [0, 1, 0.25, 1.12, 0.5, 0.92, 0.75, 1.06, 1, 1]);
  scl(c, px, py, sx, sy, fn);
}

/** Banner wave anchored at the pole side (x0, y0). */
export function wave(c: C, x0: number, y0: number, time: number, fn: () => void): void {
  const w = kf(frac(time / 1.4), [0, 0, 0.5, 1, 1, 0]);
  c.save();
  c.translate(x0, y0);
  c.transform(1, Math.tan((-6 * w * Math.PI) / 180), 0, 1, 0, 0);
  c.scale(1 - 0.08 * w, 1);
  c.translate(-x0, -y0);
  fn();
  c.restore();
}

/** Yellow/black hazard stripes inside a rectangle, with outline. */
export function hazard(c: C, x: number, y: number, w: number, h: number): void {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.fillStyle = '#ffc21a';
  c.fillRect(x, y, w, h);
  c.fillStyle = OUT;
  for (let i = -h; i < w + h; i += 14) {
    c.beginPath();
    c.moveTo(x + i, y + h);
    c.lineTo(x + i + 7, y + h);
    c.lineTo(x + i + 7 + h, y);
    c.lineTo(x + i + h, y);
    c.fill();
  }
  c.restore();
  c.lineWidth = 3;
  c.strokeStyle = OUT;
  c.strokeRect(x, y, w, h);
}

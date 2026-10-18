import { frac, type C } from './sprite-kit';
import { UNIT_SPRITES } from './sprites-units';
import { BASE_SPRITES, TURRET_SPRITES, drawJet } from './sprites-world';

/**
 * Animated backdrop for the menus: a dusk battlefield with the Stone Age fortress on the left,
 * the Modern bastion on the right and the march of the ages walking across the foreground.
 * Everything is a function of time and repeats every LOOP seconds.
 */
const W = 1280;
const H = 640;
const LOOP = 36;
const GROUND = 604;
const TEAM = '#3d8bff';
const ENEMY = '#ff4d4d';

/** Deterministic pseudo-random for scenery. */
function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const PARADE = ['clubman', 'slingshot', 'dino', 'swordsman', 'archer', 'knight', 'infantry', 'gunner', 'tank'];
/** Gap in px before each unit in the column (bigger units need more room). */
const GAP: Record<string, number> = {
  clubman: 0, slingshot: 70, dino: 120, swordsman: 120, archer: 70, knight: 120, infantry: 130, gunner: 70, tank: 150,
};
/** On-screen size, matching the in-game look but a bit larger. */
const SIZE: Record<string, number> = {
  clubman: 44, slingshot: 40, dino: 72, swordsman: 46, archer: 44, knight: 76, infantry: 46, gunner: 46, tank: 96,
};
const PARADE_LEN = 2560;
const SPEED = PARADE_LEN / LOOP;

function path(d: string): Path2D {
  return new Path2D(d);
}

function ridge(seed: number, base: number, amp: number, step: number): Path2D {
  let d = `M-20 ${H}`;
  for (let x = -20, i = 0; x <= W + 40; x += step, i++) {
    const y = base - Math.sin(x / 190 + seed) * amp - Math.sin(x / 71 + seed * 2) * amp * 0.35 - rnd(i + seed * 100) * amp * 0.2;
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return path(d + ` L${W + 40} ${H} Z`);
}

const FAR = ridge(1.3, 420, 46, 30);
const MID = ridge(4.1, 488, 22, 36);
const HILL_L = path('M-20 640 L-20 520 Q60 500 170 506 Q280 514 330 560 L360 640 Z');
const HILL_R = path('M1300 640 L1300 520 Q1220 500 1110 506 Q1000 514 950 560 L920 640 Z');
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: rnd(i) * W, y: rnd(i + 300) * 230, r: 0.6 + rnd(i + 600) * 1.4, p: rnd(i + 900) }));
const CLOUDS = Array.from({ length: 6 }, (_, i) => ({ x: rnd(i + 40) * 1700, y: 120 + rnd(i + 50) * 170, s: 0.7 + rnd(i + 60) * 0.8, v: 1 + Math.floor(rnd(i + 70) * 2) }));

export class LobbyScene {
  private time = 0;
  private scratch = document.createElement('canvas');

  constructor(private ctx: CanvasRenderingContext2D) {
    this.scratch.width = 240;
    this.scratch.height = 340;
  }

  draw(dt: number): void {
    const c = this.ctx;
    this.time = (this.time + dt) % LOOP;
    const t = this.time;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.lineJoin = 'round';
    c.lineCap = 'round';

    this.sky(c, t);
    this.flyers(c, t);

    c.fillStyle = '#6a3b5c';
    c.fill(FAR);
    c.fillStyle = 'rgba(255,170,120,0.12)';
    c.fill(FAR);
    c.fillStyle = '#4e2c48';
    c.fill(MID);

    // Medieval keep, far away on the ridge
    this.base(c, 1, 330, 492, 0.34, 1, t, '#4e2c48', 0.45);
    this.base(c, 1, 960, 498, 0.28, -1, t + 0.7, '#4e2c48', 0.5);

    c.fillStyle = '#3a2338';
    c.fill(HILL_L);
    c.fill(HILL_R);

    this.base(c, 0, 150, 522, 0.6, 1, t, '', 0);
    this.turret(c, 'rockslinger', 150 + 34, 522 - 74, 1);
    this.turret(c, 'eggauto', 150 + 34, 522 - 110, 1);
    this.base(c, 2, 1130, 522, 0.6, -1, t + 0.4, '', 0);
    this.turret(c, 'cannon', 1130 - 34, 522 - 74, -1);
    this.turret(c, 'mgnest', 1130 - 34, 522 - 110, -1);

    this.ground(c);
    this.parade(c, t);
    this.vignette(c);
    c.restore();
  }

  private sky(c: C, t: number): void {
    const g = c.createLinearGradient(0, 0, 0, 520);
    g.addColorStop(0, '#1d1a3a');
    g.addColorStop(0.45, '#6b3a6a');
    g.addColorStop(0.75, '#d9655a');
    g.addColorStop(1, '#f7b267');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    for (const s of STARS) {
      c.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin((t / LOOP + s.p) * Math.PI * 6))) * (1 - s.y / 260);
      c.fillStyle = '#fff6e0';
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // Setting sun with a slow pulse
    const pulse = 1 + 0.04 * Math.sin((t / LOOP) * Math.PI * 8);
    for (const [r, a] of [[230, 0.08], [175, 0.12], [135, 0.2]]) {
      c.fillStyle = `rgba(255,214,140,${a})`;
      c.beginPath();
      c.arc(W / 2, 430, r * pulse, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffd27a';
    c.beginPath();
    c.arc(W / 2, 430, 105, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,140,90,0.35)';
    for (let i = 0; i < 4; i++) c.fillRect(W / 2 - 110, 400 + i * 16, 220, 4 + i * 2);

    // Drifting clouds (wrap at 1700 px)
    for (const cl of CLOUDS) {
      const x = ((cl.x + (t / LOOP) * 1700 * cl.v) % 1700) - 260;
      c.save();
      c.translate(x, cl.y);
      c.scale(cl.s, cl.s);
      c.fillStyle = 'rgba(255,170,140,0.35)';
      c.beginPath();
      c.ellipse(0, 0, 90, 18, 0, 0, Math.PI * 2);
      c.ellipse(-30, -12, 40, 18, 0, 0, Math.PI * 2);
      c.ellipse(28, -16, 48, 22, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  private flyers(c: C, t: number): void {
    // Pterodactyls gliding right to left
    for (let i = 0; i < 3; i++) {
      const u = frac(t / LOOP + i * 0.33);
      const x = W + 80 - u * (W + 200);
      const y = 150 + i * 46 + Math.sin(u * Math.PI * 4 + i) * 14;
      const flap = Math.sin(t * 7 + i * 2) * 9;
      c.save();
      c.translate(x, y);
      c.scale(0.9 - i * 0.15, 0.9 - i * 0.15);
      c.fillStyle = '#2b1a33';
      c.beginPath();
      c.moveTo(-34, flap);
      c.quadraticCurveTo(-14, -6, 0, 0);
      c.quadraticCurveTo(14, -6, 34, flap);
      c.quadraticCurveTo(12, 4, 0, 6);
      c.quadraticCurveTo(-12, 4, -34, flap);
      c.fill();
      c.beginPath();
      c.moveTo(-2, 0);
      c.lineTo(-18, -5);
      c.lineTo(-4, 4);
      c.fill();
      c.restore();
    }

    // Meteor streaks: one every 6 seconds
    const n = Math.floor(t / 6);
    const u = (t % 6) / 1.4;
    if (u < 1) {
      const sx = 120 + rnd(n + 11) * 900;
      const x = sx + u * 260;
      const y = 20 + u * 190;
      const tg = c.createLinearGradient(x - 120, y - 88, x, y);
      tg.addColorStop(0, 'rgba(255,200,120,0)');
      tg.addColorStop(1, `rgba(255,220,160,${0.9 * (1 - u)})`);
      c.strokeStyle = tg;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x - 120, y - 88);
      c.lineTo(x, y);
      c.stroke();
      c.fillStyle = `rgba(255,236,190,${1 - u})`;
      c.beginPath();
      c.arc(x, y, 2.5, 0, Math.PI * 2);
      c.fill();
    }

    // A jet crosses once per loop, high and fast
    const j = (t - 20) / 4;
    if (j > 0 && j < 1) {
      c.save();
      c.translate(W + 100 - j * (W + 200), 72);
      c.scale(-0.9, 0.9);
      drawJet(c, ENEMY);
      c.restore();
    }
  }

  private base(c: C, age: number, x: number, y: number, k: number, facing: number, t: number, haze: string, hazeA: number): void {
    const team = facing > 0 ? TEAM : ENEMY;
    c.save();
    c.translate(x, y);
    c.scale(facing * k, k);
    c.translate(-100, -292);
    if (!haze) {
      BASE_SPRITES[age](c, team, t);
    } else {
      // Far-away keeps: draw into a scratch canvas, tint with the hill colour, then place.
      const o = this.scratch.getContext('2d')!;
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalCompositeOperation = 'source-over';
      o.globalAlpha = 1;
      o.clearRect(0, 0, 240, 340);
      o.lineJoin = 'round';
      o.lineCap = 'round';
      o.translate(20, 20);
      BASE_SPRITES[age](o, team, t);
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalCompositeOperation = 'source-atop';
      o.globalAlpha = hazeA;
      o.fillStyle = haze;
      o.fillRect(0, 0, 240, 340);
      c.drawImage(this.scratch, -20, -20);
    }
    c.restore();
  }

  private turret(c: C, id: string, x: number, y: number, facing: number): void {
    const sp = TURRET_SPRITES[id];
    c.save();
    c.translate(x, y);
    c.scale(facing * 0.54, 0.54);
    c.translate(-80, -50);
    sp.draw(c, facing > 0 ? TEAM : ENEMY, 0, false, this.time);
    c.restore();
  }

  private ground(c: C): void {
    c.fillStyle = '#2a1b2c';
    c.fillRect(0, GROUND - 8, W, H);
    c.fillStyle = '#4d6a2a';
    c.fillRect(0, GROUND - 8, W, 6);
    c.fillStyle = '#3c5422';
    for (let i = 0; i < 70; i++) {
      const x = rnd(i + 2000) * W;
      c.beginPath();
      c.moveTo(x - 4, GROUND - 6);
      c.lineTo(x, GROUND - 14 - rnd(i + 2100) * 8);
      c.lineTo(x + 4, GROUND - 6);
      c.fill();
    }
  }

  private parade(c: C, t: number): void {
    let offset = 0;
    for (const id of PARADE) {
      offset += GAP[id];
      const sp = UNIT_SPRITES[id];
      const x = frac((t * SPEED - offset) / PARADE_LEN) * PARADE_LEN - 140;
      if (x < -160 || x > W + 160) {
        offset += SIZE[id];
        continue;
      }
      const k = SIZE[id] / sp.div;
      // Walk cycles fit a whole number of steps into the loop so it repeats exactly.
      const steps = Math.round(LOOP / sp.walk);
      const phase = frac((t / LOOP) * steps + offset * 0.013);
      c.save();
      c.translate(x, GROUND);
      c.scale(k, k);
      c.translate(-sp.ax, -sp.ay);
      sp.draw(c, TEAM, false, phase, t);
      c.restore();
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath();
      c.ellipse(x, GROUND + 2, SIZE[id] * 0.45, 4, 0, 0, Math.PI * 2);
      c.fill();
      offset += SIZE[id];
    }
  }

  private vignette(c: C): void {
    const g = c.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 760);
    g.addColorStop(0, 'rgba(10,6,20,0)');
    g.addColorStop(1, 'rgba(10,6,20,0.55)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
}

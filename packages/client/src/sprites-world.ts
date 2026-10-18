import {
  OUT, alpha, circ, ell, f, flicker, frac, hazard, kf, rect, rot, s, scl, tr, wave,
  type C,
} from './sprite-kit';

const CREAM = '#f3ead2';
const WOOD = '#8a5a2b';

// ---------------------------------------------------------------- Bases (viewBox 200 x 300, ground at y 292)

function glowA(time: number, period = 1.8): number {
  return kf(frac(time / period), [0, 1, 0.5, 0.55, 1, 1]);
}

function stoneBase(c: C, team: string, time: number): void {
  for (const d of [
    'M42 140 L42 74 L48 62 L54 74 L54 140 Z',
    'M58 130 L58 60 L65 46 L72 60 L72 130 Z',
    'M128 130 L128 58 L135 44 L142 60 L142 130 Z',
    'M146 140 L146 70 L152 58 L158 70 L158 140 Z',
  ]) f(c, d, '#a8723f');
  f(c, rect(96, 14, 9, 90), '#6b4524');
  s(c, 'M84 24 Q100 18 116 24', CREAM, 5);
  wave(c, 105, 41, time, () => f(c, 'M105 28 L146 32 L136 44 L146 56 L105 54 Z', team));
  f(c, circ(100.5, 14, 7), CREAM);
  f(c, 'M8 292 Q2 210 24 160 Q44 104 104 96 Q166 98 184 156 Q198 214 194 292 Z', '#9c8a74');
  f(c, 'M124 101 Q170 112 184 160 Q196 214 194 292 L156 292 Q170 222 156 164 Q146 124 124 101 Z', '#7d6c5a', 0);
  s(c, 'M30 176 Q46 128 92 114', '#c9b9a0', 5);
  s(c, 'M56 146 L66 160 L60 176 M150 122 L142 136 L150 150 M30 230 L42 238', OUT, 2.5);
  f(c, 'M62 292 L62 240 Q62 194 100 192 Q138 194 138 240 L138 292 Z', '#efe6cf');
  f(c, 'M118 198 Q138 206 138 240 L138 292 L126 292 L126 240 Q126 212 118 198 Z', '#d6cbb0', 0);
  f(c, ell(83, 222, 10, 8) + ell(117, 222, 10, 8), OUT);
  alpha(c, glowA(time), () => f(c, circ(85, 222, 3.5) + circ(115, 222, 3.5), team, 0));
  f(c, 'M76 292 L76 260 Q100 242 124 260 L124 292 Z', '#2a1a10');
  f(c, 'M82 254 L86 264 L90 250 L95 262 L100 248 L105 262 L110 250 L114 264 L118 254', CREAM, 2);
  f(c, 'M66 262 Q28 264 22 222 Q40 250 68 248 Z', '#f6efdc');
  f(c, 'M134 262 Q172 264 178 222 Q160 250 132 248 Z', '#f6efdc');
  f(c, circ(26, 160, 6) + circ(38, 156, 6) + circ(50, 160, 6), '#6e6e78');
  flicker(c, 36, 154, time, 0.45, () => f(c, 'M26 154 Q22 132 36 118 Q34 132 42 128 Q52 140 46 154 Z', '#ff7a1a'));
  flicker(c, 37, 154, -time, 0.6, () => f(c, 'M31 154 Q30 140 37 132 Q38 142 43 140 Q44 150 41 154 Z', '#ffd23a', 0));
  for (const off of [0, 0.5]) {
    const p = frac(time / 2.4 + off);
    alpha(c, 0.5 * 0.7 * (1 - p), () => tr(c, -8 * p, -40 * p, () =>
      scl(c, 36, 108, 0.6 + p, 0.6 + p, () => f(c, circ(36, 108, 6), '#5a4a3a', 0))));
  }
}

function medievalBase(c: C, team: string, time: number): void {
  f(c, rect(98, 2, 4, 30), '#3a2a1a');
  wave(c, 102, 11, time, () => f(c, 'M102 4 L136 10 L102 18 Z', team));
  f(c, 'M22 70 L100 22 L178 70 Z', '#3e3550');
  f(c, 'M100 22 L178 70 L140 70 Z', '#2c2540', 0);
  f(c, 'M28 70 L172 70 L166 92 L34 92 Z', WOOD);
  s(c, 'M58 70 L58 92 M86 70 L86 92 M114 70 L114 92 M142 70 L142 92', OUT, 2);
  f(c, rect(40, 92, 120, 200), '#9497a6');
  f(c, rect(128, 92, 32, 200), '#7a7d8c', 0);
  s(c, 'M42 116 L158 116 M42 140 L158 140 M42 164 L158 164 M42 188 L158 188 M42 212 L158 212 M42 236 L158 236 M42 260 L158 260', '#6b6e7c', 2);
  s(c, 'M70 92 L70 116 M110 116 L110 140 M60 140 L60 164 M130 164 L130 188 M80 188 L80 212 M120 212 L120 236 M66 236 L66 260', '#6b6e7c', 2);
  s(c, rect(40, 92, 120, 200));
  f(c, 'M40 292 L40 240 L24 292 Z', '#7a7d8c');
  f(c, 'M160 292 L160 240 L176 292 Z', '#5f6270');
  f(c, 'M62 92 L62 168 L76 160 L90 168 L90 92 Z', team);
  f(c, 'M70 112 L76 104 L82 112 L76 132 Z', CREAM, 2);
  f(c, rect(114, 110, 6, 22) + rect(109, 118, 16, 5) + rect(114, 170, 6, 22) + rect(109, 178, 16, 5), OUT, 0);
  alpha(c, glowA(time), () => f(c, rect(115.5, 112, 3, 18) + rect(115.5, 172, 3, 18), '#ffc35a', 0));
  f(c, 'M72 292 L72 248 Q100 222 128 248 L128 292 Z', '#4a3220');
  s(c, 'M82 240 L82 292 M94 232 L94 292 M106 232 L106 292 M118 240 L118 292 M74 256 L126 256 M73 274 L127 274', '#2a2a30', 3);
  s(c, 'M72 292 L72 248 Q100 222 128 248 L128 292');
  f(c, rect(60, 236, 4, 16) + rect(136, 236, 4, 16), '#3a2a1a');
  flicker(c, 62, 236, time, 0.45, () => f(c, 'M57 236 Q56 222 62 216 Q68 222 67 236 Z', '#ff7a1a'));
  flicker(c, 138, 236, -time, 0.6, () => f(c, 'M133 236 Q132 222 138 216 Q144 222 143 236 Z', '#ff7a1a'));
}

function modernBase(c: C, team: string, time: number): void {
  f(c, rect(70, 40, 5, 62), '#3a3f46');
  scl(c, 72, 52, kf(frac(time / 3), [0, 1, 0.5, 0.15, 1, 1]), 1, () =>
    f(c, 'M48 46 Q72 70 96 46 Q72 56 48 46 Z', '#d4dae0'));
  s(c, 'M72 50 L72 38');
  f(c, rect(134, 20, 3, 80), '#3a3f46');
  alpha(c, frac(time / 1.2) < 0.6 ? 1 : 0.15, () => f(c, circ(135.5, 18, 4), '#ff3b30'));
  const hull = 'M20 292 L20 150 L46 150 L46 100 L162 100 L162 150 L186 150 L186 292 Z';
  f(c, hull, '#6b7480', 0);
  f(c, 'M140 100 L162 100 L162 150 L186 150 L186 292 L160 292 L160 160 L140 150 Z', '#545c66', 0);
  s(c, hull);
  hazard(c, 20, 150, 166, 12);
  f(c, rect(56, 114, 96, 12), '#2a2e34');
  alpha(c, glowA(time), () => f(c, rect(60, 117, 88, 6), '#ffd96a', 0));
  f(c, rect(56, 176, 40, 34), '#2a2e34');
  s(c, 'M66 184 L76 192 L86 184 M66 194 L76 202 L86 194', team, 4);
  f(c, rect(110, 176, 44, 10), '#2a2e34');
  alpha(c, glowA(time), () => f(c, rect(113, 179, 38, 4), '#ffd96a', 0));
  f(c, rect(78, 226, 52, 66), '#3e444c', 0);
  s(c, 'M78 226 L130 292 M130 226 L78 292', '#2a2e34', 4);
  s(c, rect(78, 226, 52, 66));
  hazard(c, 74, 220, 60, 8);
  for (const [x, y] of [[34, 284], [60, 284], [47, 270], [148, 284], [174, 284], [161, 270]]) f(c, ell(x, y, 14, 8), '#b8a77a');
  s(c, 'M28 150 L28 136 L40 132');
  f(c, 'M38 128 L48 124 L50 134 L40 138 Z', '#d4dae0');
}

export const BASE_SPRITES = [stoneBase, medievalBase, modernBase];

// ---------------------------------------------------------------- Turrets (viewBox ~120 x 90, muzzle area near (80, 50))

export interface TurretSprite {
  /** `t` is the phase of the fire cycle; `firing` false means idle at rest. */
  draw(c: C, team: string, t: number, firing: boolean, time: number): void;
  strike: number;
}

const rockslinger: TurretSprite = {
  strike: 0.6,
  draw(c, team, t, firing) {
    const arm = firing ? kf(t, [0, 0, 0.1, 0, 0.5, -40, 0.6, 55, 0.72, 50, 1, 0]) : 0;
    f(c, rect(8, 78, 66, 7), WOOD);
    f(c, 'M24 78 L28 60 L52 60 L56 78 Z', WOOD);
    s(c, 'M30 68 L50 68', '#5c3618', 2);
    s(c, 'M28 60 L28 46', OUT, 2);
    f(c, 'M28 46 L16 50 L28 54 Z', team, 2);
    rot(c, 40, 60, arm, () => {
      f(c, 'M38 62 L42 62 L45 16 L41 16 Z', '#a8723f');
      f(c, 'M34 15 Q43 25 52 15 Z', '#5c3618');
      if (!firing || t < 0.6) f(c, circ(43, 12, 5), '#8a8a96');
      f(c, circ(40, 58, 4), '#6e6e78');
    });
  },
};

const eggauto: TurretSprite = {
  strike: 0,
  draw(c, team, t, firing) {
    f(c, rect(8, 78, 72, 7), WOOD);
    s(c, 'M28 78 L40 60 L54 78', '#6b4524', 4);
    tr(c, firing ? kf(t, [0, -3, 0.25, 0, 1, 0]) : 0, 0, () => {
      f(c, 'M26 32 L50 32 L46 46 L30 46 Z', '#c9a36a');
      s(c, 'M30 38 L47 38', WOOD, 2);
      f(c, ell(33, 29, 5, 6) + ell(43, 28, 5, 6), CREAM);
      f(c, circ(44, 26, 1.5) + circ(32, 30, 1.5), '#5aa84e', 0);
      f(c, 'M22 48 L78 46 L78 62 L22 64 Z', '#9a6a3a');
      s(c, 'M36 47 L36 63 M52 47 L52 62', OUT, 2);
      f(c, 'M60 46.5 L68 46.3 L68 62.3 L60 62.5 Z', team, 2);
      f(c, ell(78, 54, 3, 8), '#2a1a10');
      rot(c, 22, 56, firing ? t * 360 : 0, () => {
        s(c, 'M22 56 L14 50');
        f(c, circ(13, 49, 2.5), '#6b4524');
      });
      f(c, circ(22, 56, 4), '#6b4524');
    });
  },
};

const catapult: TurretSprite = {
  strike: 0.22,
  draw(c, team, t, firing) {
    const arm = firing ? kf(t, [0, 0, 0.22, 104, 0.3, 96, 0.38, 100, 0.9, 0, 1, 0]) : 0;
    f(c, 'M8 78 L100 78 L100 86 L20 86 L8 92 Z', '#7a7d8c');
    s(c, 'M50 72 L60 40 L70 72', OUT, 7);
    s(c, 'M50 72 L60 40 L70 72', WOOD, 3.5);
    s(c, 'M60 40 L60 26', OUT, 2);
    f(c, 'M60 26 L76 30 L60 34 Z', team, 2);
    f(c, 'M14 66 L96 66 L96 72 L14 72 Z', '#6b4a2a');
    f(c, circ(26, 74, 5) + circ(84, 74, 5), '#5c3618');
    rot(c, 60, 64, arm, () => {
      f(c, 'M64 60 L18 62 L18 67 L64 67 Z', WOOD);
      f(c, 'M8 56 L24 56 L22 66 L10 66 Z', '#5c3618');
      if (!firing || t < 0.22 || t > 0.92) f(c, circ(16, 50, 7), '#8a8a96');
      f(c, rect(60, 66, 12, 12), '#6e6e78');
    });
    f(c, circ(60, 64, 3.5), '#c9a23a');
  },
};

const firearcher: TurretSprite = {
  strike: 0.62,
  draw(c, team, t, firing, time) {
    const pull = firing ? kf(t, [0, 0, 0.08, 0, 0.55, -26, 0.6, -26, 0.64, 0, 1, 0]) : 0;
    const band = firing ? kf(t, [0, 0.05, 0.08, 0.05, 0.55, 1, 0.6, 1, 0.64, 0.05, 1, 0.05]) : 0.05;
    f(c, 'M8 78 L90 78 L90 86 L20 86 L8 92 Z', '#7a7d8c');
    f(c, 'M38 78 L42 56 L48 56 L52 78 Z', '#6b4a2a');
    f(c, 'M24 64 L32 64 L32 78 L24 78 Z', '#5c3618');
    flicker(c, 28, 64, time, 0.2, () => f(c, 'M24 64 Q22 54 28 48 Q34 54 32 64 Z', '#ff7a1a'));
    f(c, 'M20 52 L76 50 L76 56 L20 58 Z', WOOD);
    scl(c, 66, 53, band, 1, () => s(c, 'M66 30 L40 53 L66 76', CREAM, 1.5));
    s(c, 'M66 30 Q78 53 66 76', OUT, 6);
    s(c, 'M66 30 Q78 53 66 76', '#5c3618', 3);
    f(c, 'M46 58 L54 58 L54 70 L46 70 Z', team, 2);
    if (!firing || t < 0.62) {
      tr(c, pull, 0, () => {
        s(c, 'M66 53 L92 53', OUT, 5);
        s(c, 'M66 53 L92 53', '#c9a36a', 2);
        f(c, 'M92 49 L100 53 L92 57 Z', '#b8bfcc', 2);
      });
    }
  },
};

const cannon: TurretSprite = {
  strike: 0.1,
  draw(c, team, t, firing) {
    const recoil = firing ? kf(t, [0, 0, 0.09, 0, 0.12, -10, 0.45, 0, 1, 0]) : 0;
    f(c, rect(8, 78, 70, 7), '#3e444c');
    f(c, 'M18 78 L70 78 L64 66 L24 66 Z', '#3e444c');
    rot(c, 48, 50, 8, () => tr(c, recoil, 0, () => {
      f(c, 'M40 44 L110 46 L110 56 L40 58 Z', '#2e3236');
      f(c, 'M108 42 L118 42 L118 60 L108 60 Z', '#2e3236');
      f(c, 'M44 44 L54 44 L54 58 L44 58 Z', '#ffc21a', 2);
    }));
    f(c, 'M30 66 L40 46 L56 46 L60 66 Z', '#545c66');
    s(c, 'M36 60 L56 60', team, 4);
    f(c, circ(48, 50, 5), '#9aa0ad');
    if (firing && t > 0.09 && t < 0.22) {
      const k = kf(t, [0.09, 0.3, 0.11, 1.25, 0.18, 1, 0.22, 1]);
      scl(c, 131, 66, k, k, () => f(c, 'M116 64 L128 52 L131 60 L146 56 L136 66 L146 76 L130 72 L126 80 Z', '#ffd23a', 2.5));
    }
    if (firing && t > 0.12 && t < 0.6) {
      const u = (t - 0.12) / 0.48;
      alpha(c, 0.8 * (1 - u), () => scl(c, 122, 54, 0.6 + 1.2 * u, 0.6 + 1.2 * u, () =>
        tr(c, 0, -8 * u, () => f(c, circ(122, 54, 9), '#9aa0a6', 2))));
    }
  },
};

const mgnest: TurretSprite = {
  strike: 0,
  draw(c, team, _t, firing, time) {
    f(c, rect(8, 78, 74, 7), '#3e444c');
    s(c, 'M44 64 L46 46', OUT, 4);
    const j = firing ? frac(time / 0.1) : 1;
    tr(c, j < 0.5 ? -2 : 0, j < 0.25 ? -1 : j < 0.5 ? 1 : 0, () => {
      f(c, 'M26 40 L84 38 L84 46 L26 48 Z', '#2a2e34');
      f(c, 'M84 40 L98 40 L98 44 L84 44 Z', '#3e444c');
      f(c, 'M34 46 L48 46 L48 56 L34 56 Z', '#5d6b3a');
      f(c, 'M66 26 L74 26 L74 52 L66 52 Z', '#5d6b3a');
      s(c, 'M67 32 L73 32', team, 3);
      if (firing && frac(time / 0.15) < 0.4) f(c, 'M98 42 L106 34 L108 39 L118 36 L111 42 L118 48 L108 45 L106 50 Z', '#ffd23a', 2);
    });
    for (const [x, y] of [[22, 72], [44, 72], [66, 72], [32, 62], [58, 62]]) f(c, ell(x, y, 12, 6), '#b8a77a');
  },
};

export const TURRET_SPRITES: Record<string, TurretSprite> = {
  rockslinger, eggauto, catapult, firearcher, cannon, mgnest,
};

/** Empty turret bracket, in the same viewBox as the turrets. */
export function drawEmptySlot(c: C, age: number): void {
  const col = age === 0 ? WOOD : age === 1 ? '#7a7d8c' : '#3e444c';
  c.globalAlpha *= 0.8;
  f(c, rect(8, 78, 66, 7), col);
  s(c, 'M14 85 L30 100', OUT, 4);
  c.globalAlpha /= 0.8;
}

// ---------------------------------------------------------------- Projectiles (drawn centred on the projectile, angle = travel direction)

export type ProjectileKind = 'pebble' | 'rock' | 'egg' | 'arrow' | 'boulder' | 'firebolt' | 'shell' | 'tracer';

export const PROJECTILE_BY_COLOR: Record<string, ProjectileKind> = {
  '#777': 'pebble',
  '#8a8a8a': 'rock',
  '#f3e9c6': 'egg',
  '#5a3a1a': 'arrow',
  '#6b4a2a': 'boulder',
  '#e2541b': 'firebolt',
  '#2e2e2e': 'shell',
  '#ffd23a': 'tracer',
};

export function drawProjectile(c: C, kind: ProjectileKind, angle: number, time: number, team: string): void {
  switch (kind) {
    case 'pebble':
      rot(c, 0, 0, time * 900, () => f(c, 'M-4 -2 L1 -4 L4 0 L2 4 L-3 4 Z', '#8a8a96', 2));
      return;
    case 'rock':
      rot(c, 0, 0, time * 720, () => f(c, 'M-6 -3 L1 -6 L6 -1 L3 5 L-4 5 Z', '#8a8a96', 2.5));
      return;
    case 'boulder':
      rot(c, 0, 0, time * 400, () => {
        f(c, 'M-9 -4 L-2 -9 L8 -6 L9 4 L2 9 L-7 7 Z', '#8a8a96', 2.5);
        s(c, 'M-4 -3 L1 -5', '#c4c4cc', 2.5);
      });
      return;
    case 'egg':
      rot(c, 0, 0, time * 800, () => {
        f(c, ell(0, 0, 6, 4.5), CREAM, 2.5);
        f(c, circ(1, -1, 1.4), '#5aa84e', 0);
      });
      return;
  }
  c.save();
  c.rotate(angle);
  switch (kind) {
    case 'arrow':
      s(c, 'M-14 0 L8 0', OUT, 4);
      s(c, 'M-14 0 L8 0', '#c9a36a', 2);
      f(c, 'M6 -3.5 L13 0 L6 3.5 Z', '#b8bfcc', 1.5);
      s(c, 'M-14 0 L-18 -3.5 M-14 0 L-18 3.5', team, 2);
      break;
    case 'firebolt':
      s(c, 'M-30 0 L-12 0', '#ff7a1a', 4);
      s(c, 'M-14 0 L8 0', OUT, 4.5);
      s(c, 'M-14 0 L8 0', '#c9a36a', 2);
      flicker(c, 8, 0, time, 0.18, () => f(c, 'M6 0 Q12 -7 18 0 Q12 7 6 0 Z', '#ffd23a', 2));
      break;
    case 'shell':
      s(c, 'M-20 0 L-8 0', '#ffffff', 2);
      f(c, 'M-7 -3 L5 -3 Q10 0 5 3 L-7 3 Z', '#c9a23a', 2);
      break;
    case 'tracer':
      s(c, 'M-12 0 L6 0', '#ffd23a', 3);
      s(c, 'M-2 0 L6 0', '#fff3a8', 2);
      break;
  }
  c.restore();
}

/** Special attack drops. `kind` by meteor color. */
export function drawDrop(c: C, color: string, time: number, facing: number, team: string): void {
  if (color === '#5a3a1a') {
    // Arrow Rain: arrow falling, slightly angled toward the enemy
    c.save();
    c.rotate(Math.PI / 2 - facing * 0.45);
    s(c, 'M-26 0 L8 0', OUT, 5);
    s(c, 'M-26 0 L8 0', '#c9a36a', 2);
    f(c, 'M6 -4 L14 0 L6 4 Z', '#b8bfcc', 1.5);
    s(c, 'M-26 0 L-30 -4 M-26 0 L-30 4 M-22 0 L-26 -4 M-22 0 L-26 4', team, 2.5);
    c.restore();
  } else if (color === '#333') {
    // Air Strike bomb
    c.save();
    c.rotate((facing * 8 * Math.PI) / 180);
    f(c, 'M-6 -12 L6 -12 L7 4 L0 11 L-7 4 Z', '#2a2e34', 2.5);
    s(c, 'M-6 -8 L6 -8', '#ffc21a', 2.5);
    c.restore();
  } else {
    // Meteor
    const tg = c.createLinearGradient(0, -60, 0, 0);
    tg.addColorStop(0, 'rgba(255,122,26,0)');
    tg.addColorStop(1, 'rgba(255,170,60,0.85)');
    c.strokeStyle = tg;
    c.lineWidth = 10;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-facing * 18, -60);
    c.lineTo(0, 0);
    c.stroke();
    rot(c, 0, 0, time * 300, () => {
      f(c, 'M-9 -4 L-3 -10 L7 -7 L10 3 L3 10 L-7 7 Z', '#5a4a3a', 3);
      f(c, circ(2, -2, 3.5), '#ff7a1a', 0);
    });
  }
}

/** Air strike jet, facing right, centred on its body. */
export function drawJet(c: C, team: string): void {
  tr(c, -26, -16, () => {
    f(c, 'M0 16 L40 12 L56 16 L40 20 Z', '#4a5560', 2.5);
    f(c, 'M14 16 L30 2 L36 2 L30 16 Z', '#3e4750', 2.5);
    f(c, 'M2 16 L-4 6 L4 6 L10 16 Z', '#3e4750', 2.5);
    s(c, 'M42 13 L50 15', '#9fd3f0', 2);
    s(c, 'M14 18 L24 18', team, 3);
  });
}

// ---------------------------------------------------------------- Effects (screen px, centred at bottom)

/** Explosion mound; `u` is 0..1 life. Width ~ 62 at scale 1. */
export function drawBoom(c: C, u: number): void {
  const k = 0.7 + 0.6 * u;
  alpha(c, 1 - u * u, () => scl(c, 0, 0, k, k, () => {
    f(c, 'M-31 0 Q-29 -36 -11 -28 Q-3 -54 13 -32 Q31 -40 31 0 Z', '#ff7a1a', 3);
    f(c, 'M-15 0 Q-11 -18 1 -16 Q13 -20 15 0 Z', '#ffd23a', 0);
  }));
}

export function drawPuff(c: C, u: number): void {
  for (const [x, y, r, d] of [[-14, 0, 9, 0], [10, -3, 10, 0.12], [-2, -14, 8, 0.24]]) {
    const v = Math.min(1, Math.max(0, (u - d) / (1 - d)));
    alpha(c, 0.9 * (1 - v), () => f(c, circ(x, y - 6 * v, r * (0.4 + 1.1 * v)), '#d9c7a6', 2.5));
  }
}

export function drawSpark(c: C, u: number, color = '#ffd23a'): void {
  const k = u < 0.3 ? 0.4 + (u / 0.3) * 0.8 : 1.2 - (u - 0.3) * 0.3;
  alpha(c, u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3, () => scl(c, 0, 0, k, k, () =>
    f(c, 'M0 -12 L3 -4 L11 -6 L5 0 L11 6 L2 4 L-2 12 L-4 4 L-12 4 L-6 -1 L-10 -8 L-3 -5 Z', color, 2)));
}

// ---------------------------------------------------------------- Backgrounds (screen px)

interface Theme { sky: [string, string]; ground: string; groundEdge: string }

export const THEMES: Theme[] = [
  { sky: ['#f29c56', '#f7d39a'], ground: '#6b8e3d', groundEdge: '#4d6a2a' },
  { sky: ['#5f81a6', '#b5c9de'], ground: '#5f7d3a', groundEdge: '#465e2a' },
  { sky: ['#9ba7b1', '#d3d9de'], ground: '#6d6a5c', groundEdge: '#4f4c40' },
];

const bgCache = new Map<string, Path2D>();

function bgPath(key: string, build: () => string): Path2D {
  let p = bgCache.get(key);
  if (!p) {
    p = new Path2D(build());
    bgCache.set(key, p);
  }
  return p;
}

/** Deterministic pseudo-random for scenery. */
function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function drawBackground(c: C, age: number, w: number, groundY: number, h: number): void {
  const th = THEMES[age];
  const g = c.createLinearGradient(0, 0, 0, groundY);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(1, th.sky[1]);
  c.fillStyle = g;
  c.fillRect(-10, -10, w + 20, groundY + 10);

  if (age === 0) {
    c.fillStyle = '#ffd27a';
    c.beginPath();
    c.arc(w * 0.76, 150, 70, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(217,138,79,0.6)';
    c.fill(bgPath(`hills-far-${w}`, () => {
      let d = `M0 ${groundY}`;
      for (let x = 0; x <= w; x += 40) d += ` L${x} ${groundY - 120 - Math.sin(x / 210) * 40 - Math.sin(x / 83) * 14}`;
      return d + ` L${w} ${groundY} Z`;
    }));
    c.fillStyle = '#c8733f';
    c.fill(bgPath(`hills-${w}`, () => {
      let d = `M0 ${groundY}`;
      for (let x = 0; x <= w; x += 40) d += ` L${x} ${groundY - 50 - Math.sin(x / 140) * 25 - Math.sin(x / 57) * 10}`;
      return d + ` L${w} ${groundY} Z`;
    }));
  } else if (age === 1) {
    c.fillStyle = '#e8eef5';
    c.beginPath();
    c.arc(w * 0.18, 120, 40, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(79,106,136,0.55)';
    c.fill(bgPath(`mount-far-${w}`, () => {
      let d = `M0 ${groundY}`;
      for (let i = 0, x = 0; x <= w + 120; i++, x += 90 + rnd(i) * 80) d += ` L${x} ${groundY - 140 - rnd(i + 50) * 110}`;
      return d + ` L${w + 120} ${groundY} Z`;
    }));
    c.fillStyle = '#4f6a88';
    c.fill(bgPath(`mount-${w}`, () => {
      let d = `M0 ${groundY}`;
      for (let i = 0, x = 0; x <= w + 120; i++, x += 70 + rnd(i + 9) * 60) d += ` L${x} ${groundY - 40 - rnd(i + 99) * 60}`;
      return d + ` L${w + 120} ${groundY} Z`;
    }));
  } else {
    c.fillStyle = 'rgba(127,139,150,0.55)';
    c.fill(bgPath(`city-far-${w}`, () => {
      let d = `M0 ${groundY}`;
      for (let i = 0, x = 0; x <= w; i++) {
        const bw = 40 + rnd(i) * 60;
        const bh = 120 + rnd(i + 7) * 160;
        d += ` L${x} ${groundY - bh} L${x + bw} ${groundY - bh}`;
        x += bw;
      }
      return d + ` L${w + 100} ${groundY} Z`;
    }));
    c.fillStyle = '#6e7984';
    c.fill(bgPath(`city-${w}`, () => {
      let d = `M0 ${groundY}`;
      for (let i = 0, x = 0; x <= w; i++) {
        const bw = 30 + rnd(i + 31) * 50;
        const bh = 30 + rnd(i + 63) * 80;
        d += ` L${x} ${groundY - bh} L${x + bw} ${groundY - bh}`;
        x += bw;
      }
      return d + ` L${w + 100} ${groundY} Z`;
    }));
  }

  c.fillStyle = th.ground;
  c.fillRect(-10, groundY, w + 20, h - groundY + 10);
  c.fillStyle = th.groundEdge;
  c.fillRect(-10, groundY, w + 20, 5);
}

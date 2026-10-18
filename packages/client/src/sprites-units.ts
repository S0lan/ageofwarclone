import {
  BOB, LEG, LEG2, OUT, SWAY, SWAY2, SWAY3,
  alpha, circ, ell, f, frac, kf, rect, rot, s, scl, tr,
  type C,
} from './sprite-kit';

/**
 * Animated unit sprites. Each one is drawn facing right in its own viewBox, with the feet
 * on (ax, ay). `t` is the phase (0..1) of the walk cycle, or of the attack cycle when `atk`.
 */
export interface UnitSprite {
  draw(c: C, team: string, atk: boolean, t: number, time: number): void;
  /** Ground anchor in viewBox units. */
  ax: number;
  ay: number;
  /** Top of the sprite in viewBox units (for the HP bar). */
  top: number;
  /** viewBox units per unit of on-screen size: scale = drawSize / div. */
  div: number;
  /** Phase of the attack cycle at which the hit/shot happens. */
  strike: number;
  /** Seconds per walk cycle. */
  walk: number;
}

const SKIN = '#d99a6c';
const SKIN2 = '#b97f52';
const HAIR = '#3a2414';
const FUR = '#7d4f27';
const WOOD = '#8a5a2b';
const STONE = '#a9a9b4';
const CREAM = '#f3ead2';

// ---------------------------------------------------------------- Stone Age

const clubman: UnitSprite = {
  ax: 60, ay: 106, top: 8, div: 62, strike: 0.66, walk: 0.5,
  draw(c, team, atk, t) {
    const leg = atk ? 0 : kf(t, LEG);
    const lean = atk ? kf(t, [0, -4, 0.5, -4, 0.66, 8, 0.8, 8, 1, -4]) : 0;
    const club = atk ? kf(t, [0, -40, 0.5, -70, 0.66, 100, 0.8, 95, 1, -40]) : kf(t, SWAY);
    rot(c, 60, 106, lean, () => tr(c, 0, atk ? 0 : kf(t, BOB), () => {
      if (atk) f(c, 'M52 76 L46 104 L56 106 L56 100 L58 76 Z', SKIN2);
      else rot(c, 56, 78, leg, () => f(c, 'M52 76 L50 104 L60 106 L60 100 L58 76 Z', SKIN2));
      f(c, 'M46 54 L40 74 L46 76 L52 58 Z', SKIN2);
      if (atk) f(c, 'M58 76 L66 104 L78 106 L78 100 L64 76 Z', SKIN);
      else rot(c, 60, 78, -leg, () => f(c, 'M56 76 L58 104 L70 106 L70 100 L64 76 Z', SKIN));
      f(c, 'M42 50 Q58 42 72 50 L76 80 L68 75 L62 82 L56 75 L48 82 L40 76 Z', FUR);
      f(c, circ(52, 60, 3) + circ(64, 66, 2.5) + circ(56, 72, 2), '#5c3618', 0);
      f(c, circ(60, 36, 13), SKIN);
      f(c, 'M46 34 Q44 16 58 18 Q62 12 68 18 Q78 18 76 30 L72 26 L70 32 L64 26 L58 30 L52 26 L50 36 Z', HAIR);
      f(c, 'M52 42 Q60 56 72 42 Q70 49 62 51 Q54 49 52 42 Z', HAIR);
      s(c, atk ? 'M62 31 L71 29' : 'M63 29 L71 31');
      f(c, circ(67, 34, 1.8), OUT, 0);
      s(c, 'M62 39 L71 38 M60 43 L69 42', team, 2.5);
      rot(c, 68, 56, club, () => {
        f(c, 'M76 66 L84 66 L96 30 L88 28 Z', WOOD);
        f(c, 'M84 22 L92 8 L106 14 L104 30 L90 32 Z', STONE);
        s(c, 'M86 30 L98 26 M88 34 L96 32', '#5c3618', 2.5);
        f(c, 'M62 52 L80 60 L78 67 L60 60 Z', SKIN);
      });
    }));
  },
};

function slingTorso(c: C, team: string, atk: boolean): void {
  f(c, 'M46 50 Q58 44 70 50 L72 78 L48 78 Z', '#b07a3c');
  f(c, rect(47, 72, 26, 6), '#5c3618');
  if (!atk) f(c, circ(50, 80, 4), WOOD);
  f(c, 'M48 30 Q36 34 38 50 Q44 40 50 38 Z', HAIR);
  f(c, circ(60, 36, 12), SKIN);
  f(c, 'M48 34 Q46 20 60 22 Q72 20 72 30 L70 28 Q62 24 52 30 Z', HAIR);
  f(c, 'M48 30 L72 28 L72 33 L48 35 Z', team);
  f(c, 'M50 30 Q40 12 46 6 Q50 18 55 30 Z', CREAM);
  if (atk) s(c, 'M63 36 L69 36', OUT, 2.5);
  else f(c, circ(66, 37, 1.8), OUT, 0);
}

function slingFork(c: C): void {
  s(c, 'M90 64 L90 52 L86 40 M90 52 L96 41', OUT, 7);
  s(c, 'M90 64 L90 52 L86 40 M90 52 L96 41', WOOD, 3.5);
}

const slingshot: UnitSprite = {
  ax: 60, ay: 106, top: 6, div: 62, strike: 0.62, walk: 0.5,
  draw(c, team, atk, t) {
    if (!atk) {
      const leg = kf(t, LEG);
      tr(c, 0, kf(t, BOB), () => {
        rot(c, 56, 78, leg, () => f(c, 'M53 76 L52 104 L60 106 L60 101 L58 76 Z', SKIN2));
        f(c, 'M50 52 L80 50 L80 56 L52 60 Z', SKIN2);
        rot(c, 60, 78, -leg, () => f(c, 'M57 76 L60 104 L70 106 L70 101 L63 76 Z', SKIN));
        slingTorso(c, team, false);
        rot(c, 62, 54, kf(t, SWAY2), () => {
          f(c, 'M60 52 L88 50 L88 56 L60 58 Z', SKIN);
          slingFork(c);
          s(c, 'M86 40 Q84 50 89 50 Q94 50 96 41', HAIR, 2);
          f(c, circ(90, 54, 4), SKIN);
        });
      });
      return;
    }
    const pull = kf(t, [0, 0, 0.1, 0, 0.55, -18, 0.6, -18, 0.64, 0, 1, 0]);
    const band = kf(t, [0, 0.38, 0.1, 0.38, 0.55, 1, 0.6, 1, 0.64, 0.38, 1, 0.38]);
    tr(c, kf(t, [0, 0, 0.6, 0, 0.64, -2, 0.72, 0, 1, 0]), 0, () => {
      f(c, 'M53 76 L48 104 L56 106 L56 101 L58 76 Z', SKIN2);
      tr(c, pull, 0, () => f(c, 'M50 52 L80 50 L80 56 L52 60 Z', SKIN2));
      f(c, 'M58 76 L66 104 L76 106 L76 101 L63 76 Z', SKIN);
      slingTorso(c, team, true);
      f(c, 'M60 52 L88 50 L88 56 L60 58 Z', SKIN);
      slingFork(c);
      scl(c, 91, 46, band, 1, () => s(c, 'M86 40 L62 48 L96 41', HAIR, 2));
      f(c, circ(90, 54, 4), SKIN);
      tr(c, pull, 0, () => {
        if (t < 0.62) f(c, circ(80, 48, 3.5), '#8a8a96', 2);
        f(c, circ(80, 53, 4), SKIN2);
      });
    });
  },
};

function dinoTail(c: C): void {
  f(c, 'M92 78 Q60 70 14 58 Q40 84 92 102 Z', '#5aa84e');
  s(c, 'M40 66 L46 78 M58 70 L64 84', '#2f6b34', 3);
}

function dinoBody(c: C): void {
  f(c, 'M84 84 Q96 62 136 64 Q160 68 162 92 Q156 116 116 116 Q88 112 84 84 Z', '#5aa84e');
  f(c, 'M100 110 Q130 120 158 98 Q154 114 120 117 Q104 116 100 110 Z', '#d6e08a', 0);
  s(c, 'M98 72 L104 84 M112 66 L116 80 M126 64 L128 78', '#2f6b34', 3.5);
}

function dinoHead(c: C, team: string, jaw: number): void {
  f(c, 'M148 90 Q146 58 166 44 L180 54 Q166 66 164 94 Z', '#5aa84e');
  f(c, 'M160 46 L148 30 L166 40 L162 22 L174 37 L178 24 L182 42 Z', team);
  rot(c, 170, 54, jaw, () => {
    f(c, 'M168 54 L204 54 Q200 65 178 65 Q170 63 168 54 Z', '#4a9142');
    if (jaw > 2) f(c, 'M184 54 L187 50 L190 54 Z M194 54 L197 50 L200 54 Z', CREAM, 1.5);
  });
  f(c, 'M162 40 Q186 28 206 40 L210 52 L176 55 L166 52 Z', '#5aa84e');
  f(c, 'M182 54 L185 60 L188 54 Z M192 54 L195 59 L198 53 Z M201 53 L204 57 L207 52 Z', CREAM, 1.5);
  f(c, circ(184, 42, 4.5), '#ffd23a', 2);
  f(c, ell(185, 42, 1.2, 3), OUT, 0);
  s(c, jaw > 2 ? 'M177 34 L192 39' : 'M178 36 L192 38');
}

function dinoFront(c: C, team: string): void {
  f(c, 'M150 94 L162 106 L158 111 L146 100 Z', '#5aa84e');
  f(c, 'M104 66 Q120 58 140 66 L138 84 L106 84 Z', team);
  s(c, 'M108 80 L136 80', CREAM, 2);
}

function dinoRider(c: C, team: string, sx: number, sy: number, atk: boolean): void {
  f(c, 'M116 64 L128 82 L122 86 L110 70 Z', SKIN2);
  f(c, 'M108 38 Q118 32 128 38 L130 66 L108 66 Z', FUR);
  f(c, circ(118, 26, 10), SKIN);
  f(c, 'M106 24 Q106 10 118 12 Q130 10 130 22 L126 18 L122 22 L116 16 L112 22 Z', HAIR);
  if (atk) s(c, 'M120 22 L128 24', OUT, 2.5);
  f(c, circ(123, 25.5, 1.6), OUT, 0);
  s(c, 'M119 30 L127 29', team, 2.5);
  tr(c, sx, sy, () => {
    s(c, 'M108 48 L156 33', OUT, 6);
    s(c, 'M108 48 L156 33', WOOD, 2.5);
    f(c, 'M153 28 L170 28 L157 39 Z', STONE);
    f(c, 'M124 44 L140 37 L142 43 L126 50 Z', SKIN);
  });
}

const dino: UnitSprite = {
  ax: 112, ay: 148, top: 14, div: 126, strike: 0.58, walk: 0.6,
  draw(c, team, atk, t) {
    if (!atk) {
      const leg = kf(t, LEG2);
      tr(c, 0, kf(t, BOB), () => {
        rot(c, 92, 88, kf(t, SWAY2), () => dinoTail(c));
        rot(c, 104, 98, leg, () =>
          f(c, 'M94 92 Q114 92 116 110 L108 128 L120 142 L120 148 L100 148 L98 140 L100 128 L98 110 Z', '#3f7f3c'));
        dinoBody(c);
        rot(c, 152, 84, -kf(t, SWAY2), () => dinoHead(c, team, 0));
        rot(c, 132, 102, -leg, () =>
          f(c, 'M122 98 Q142 98 144 116 L136 132 L150 142 L150 148 L128 148 L126 140 L128 130 L126 116 Z', '#5aa84e'));
        dinoFront(c, team);
        tr(c, 0, kf(frac(t * 1.2), BOB), () => dinoRider(c, team, 0, 0, false));
      });
      return;
    }
    dinoTail(c);
    f(c, 'M94 92 Q114 92 112 110 L100 128 L110 142 L110 148 L90 148 L90 140 L94 128 L98 110 Z', '#3f7f3c');
    dinoBody(c);
    const htx = kf(t, [0, 0, 0.45, 0, 0.58, 6, 0.75, 6, 1, 0]);
    const hr = kf(t, [0, 0, 0.2, 0, 0.45, -10, 0.58, 12, 0.75, 12, 1, 0]);
    const jaw = kf(t, [0, 0, 0.25, 0, 0.45, 28, 0.58, 0, 1, 0]);
    tr(c, htx, 0, () => rot(c, 152, 84, hr, () => dinoHead(c, team, jaw)));
    f(c, 'M124 98 Q142 98 146 116 L144 132 L160 142 L160 148 L138 148 L134 140 L134 130 L128 116 Z', '#5aa84e');
    dinoFront(c, team);
    dinoRider(c, team,
      kf(t, [0, -6, 0.5, -6, 0.62, 14, 0.76, 14, 1, -6]),
      kf(t, [0, 2, 0.5, 2, 0.62, -4, 0.76, -4, 1, 2]), true);
  },
};

// ---------------------------------------------------------------- Medieval

const MAIL = '#9aa0ad';
const STEEL = '#b8bfcc';

const swordsman: UnitSprite = {
  ax: 60, ay: 106, top: 4, div: 62, strike: 0.62, walk: 0.5,
  draw(c, team, atk, t) {
    const leg = atk ? 0 : kf(t, LEG);
    const arm = atk ? kf(t, [0, -20, 0.45, -60, 0.62, 95, 0.78, 90, 1, -20]) : kf(t, SWAY);
    const lean = atk ? kf(t, [0, -4, 0.45, -4, 0.62, 7, 0.78, 7, 1, -4]) : 0;
    rot(c, 60, 106, lean, () => tr(c, 0, atk ? 0 : kf(t, BOB), () => {
      rot(c, 54, 54, arm, () => {
        f(c, 'M50 50 L70 44 L72 50 L54 58 Z', MAIL);
        f(c, 'M71 46 L75 48 L96 14 L93 11 Z', '#e2e6ee');
        s(c, 'M66 42 L78 52', OUT, 6);
        s(c, 'M66 42 L78 52', '#c9a23a', 2.5);
        f(c, circ(71, 48, 4), SKIN);
      });
      if (atk) f(c, 'M52 76 L46 104 L57 106 L57 100 L58 76 Z', '#4a4f5c');
      else rot(c, 56, 78, leg, () => f(c, 'M52 76 L50 104 L61 106 L61 100 L58 76 Z', '#4a4f5c'));
      if (atk) f(c, 'M58 76 L66 104 L78 106 L78 100 L64 76 Z', '#5d6372');
      else rot(c, 60, 78, -leg, () => f(c, 'M56 76 L58 104 L70 106 L70 100 L64 76 Z', '#5d6372'));
      f(c, 'M44 48 Q58 42 72 48 L72 66 L44 66 Z', MAIL);
      f(c, 'M48 52 L68 52 L72 84 L60 80 L46 84 Z', team);
      s(c, 'M47 70 L70 70', '#5c3618', 4);
      f(c, circ(60, 36, 12), SKIN);
      f(c, 'M47 36 Q47 18 60 18 Q74 18 74 34 L74 38 L69 37 L69 30 L54 30 L50 42 Z', STEEL);
      s(c, 'M68 30 L69 42');
      f(c, 'M54 19 Q44 4 32 12 Q44 12 52 24 Z', team);
      if (atk) s(c, 'M61 34 L66 35', OUT, 2.5);
      else f(c, circ(64, 35, 1.8), OUT, 0);
      f(c, 'M64 50 L82 50 Q84 70 73 82 Q62 70 64 50 Z', WOOD);
      f(c, 'M67 54 L79 54 Q80 67 73 76 Q66 67 67 54 Z', team, 2);
    }));
  },
};

function archerBody(c: C, team: string, atk: boolean): void {
  f(c, 'M46 48 Q58 42 70 48 L72 80 L60 76 L46 80 Z', '#3e7a3e');
  s(c, 'M47 68 L71 68', '#5c3618', 4);
  f(c, circ(60, 36, 12), SKIN);
  f(c, 'M46 42 Q44 18 60 18 Q76 20 74 32 L70 30 Q62 26 53 32 L53 48 Z', '#2f5f30');
  f(c, 'M47 28 L34 40 L47 42 Z', '#2f5f30');
  f(c, 'M50 46 L70 46 L70 51 L50 51 Z', team);
  if (atk) s(c, 'M63 36 L69 36', OUT, 2.5);
  else f(c, circ(66, 36, 1.8), OUT, 0);
}

function quiver(c: C): void {
  f(c, 'M42 40 L50 38 L56 70 L48 72 Z', WOOD);
  s(c, 'M43 40 L40 30 M47 39 L46 28', CREAM, 3);
}

function longbow(c: C): void {
  s(c, 'M82 14 Q110 53 82 92', OUT, 7);
  s(c, 'M82 14 Q110 53 82 92', WOOD, 3.5);
}

function arrowShape(c: C, team: string): void {
  s(c, 'M82 53 L106 53', OUT, 5);
  s(c, 'M82 53 L106 53', '#c9a36a', 2);
  f(c, 'M104 49 L112 53 L104 57 Z', STEEL, 2);
  s(c, 'M82 53 L78 49 M82 53 L78 57', team, 2.5);
}

const archer: UnitSprite = {
  ax: 60, ay: 106, top: 14, div: 62, strike: 0.62, walk: 0.5,
  draw(c, team, atk, t) {
    if (!atk) {
      const leg = kf(t, LEG);
      tr(c, 0, kf(t, BOB), () => {
        quiver(c);
        rot(c, 56, 78, leg, () => f(c, 'M53 76 L52 104 L61 106 L61 101 L58 76 Z', '#2f4a26'));
        rot(c, 60, 78, -leg, () => f(c, 'M57 76 L60 104 L70 106 L70 101 L63 76 Z', '#3e5a2e'));
        archerBody(c, team, false);
        rot(c, 60, 54, kf(t, SWAY2), () => {
          s(c, 'M82 14 L82 92', CREAM, 1.5);
          longbow(c);
          f(c, 'M60 50 L94 50 L94 56 L60 58 Z', '#3e7a3e');
          f(c, circ(96, 53, 4), SKIN);
        });
      });
      return;
    }
    const pull = kf(t, [0, 0, 0.1, 0, 0.55, -18, 0.6, -18, 0.64, 0, 1, 0]);
    const band = kf(t, [0, 0.05, 0.1, 0.05, 0.55, 1, 0.6, 1, 0.64, 0.05, 1, 0.05]);
    quiver(c);
    f(c, 'M53 76 L48 104 L57 106 L57 101 L58 76 Z', '#2f4a26');
    tr(c, pull, 0, () => f(c, 'M50 52 L82 50 L82 56 L52 60 Z', '#356a35'));
    f(c, 'M58 76 L66 104 L76 106 L76 101 L63 76 Z', '#3e5a2e');
    archerBody(c, team, true);
    scl(c, 82, 53, band, 1, () => s(c, 'M82 14 L64 53 L82 92', CREAM, 1.5));
    longbow(c);
    f(c, 'M60 50 L94 50 L94 56 L60 58 Z', '#3e7a3e');
    f(c, circ(96, 53, 4), SKIN);
    tr(c, pull, 0, () => {
      if (t < 0.62) arrowShape(c, team);
      f(c, circ(82, 53, 4), SKIN);
    });
  },
};

const HORSE = '#8a5f3a';
const HORSE2 = '#6b4a30';

function horseHead(c: C): void {
  f(c, 'M138 76 Q146 40 164 34 L176 46 Q162 56 156 84 Z', HORSE);
  f(c, 'M146 50 Q150 34 164 30 L160 40 Q152 44 150 58 Z', HAIR);
  f(c, 'M160 30 Q184 30 196 50 L190 60 L170 56 Q160 48 160 30 Z', HORSE);
  f(c, 'M164 32 Q182 32 192 48 L186 51 Q174 40 164 39 Z', '#c3c9d4');
  f(c, 'M164 30 L168 18 L172 30 Z', HORSE);
  f(c, circ(172, 44, 2), OUT, 0);
}

function horseCloth(c: C, team: string): void {
  f(c, 'M54 78 Q100 70 150 80 L146 112 L128 106 L110 114 L92 106 L74 114 L58 106 Z', team);
  s(c, 'M60 100 L74 108 L92 100 L110 108 L128 100 L144 106', CREAM, 2.5);
}

function knightRider(c: C, team: string, lx: number, ly: number): void {
  f(c, 'M100 62 L112 86 L106 90 L94 68 Z', STEEL);
  f(c, 'M90 30 Q104 24 116 30 L118 64 L90 64 Z', STEEL);
  f(c, 'M92 40 L116 40 L116 58 L92 58 Z', team, 2);
  f(c, 'M92 22 Q92 4 104 4 Q118 4 118 22 L118 30 L92 30 Z', '#c3c9d4');
  s(c, 'M104 16 L118 16', OUT, 3.5);
  f(c, 'M100 5 Q94 -6 80 4 Q92 4 96 12 Z', team);
  tr(c, lx, ly, () => {
    s(c, 'M88 56 L206 34', OUT, 7);
    s(c, 'M88 56 L206 34', '#e0c48a', 3.5);
    f(c, 'M204 29 L222 31 L206 40 Z', '#c3c9d4');
    f(c, 'M150 45 L168 30 L172 40 Z', team, 2);
    f(c, 'M112 46 L128 40 L132 56 Z', MAIL);
    f(c, 'M104 46 L118 42 L120 50 L106 54 Z', STEEL);
  });
}

const HORSE_BODY = 'M52 72 Q60 60 100 62 Q140 60 152 74 Q156 98 140 108 L66 108 Q50 100 52 72 Z';
const TAIL = 'M54 72 Q30 78 34 112 Q42 92 58 84 Z';

const knight: UnitSprite = {
  ax: 110, ay: 146, top: -4, div: 125, strike: 0.56, walk: 0.6,
  draw(c, team, atk, t) {
    if (!atk) {
      const L = kf(t, LEG2);
      tr(c, 0, kf(t, BOB), () => {
        rot(c, 54, 74, kf(t, SWAY), () => f(c, TAIL, HAIR));
        rot(c, 68, 98, -L, () => f(c, 'M62 96 L58 144 L70 146 L72 98 Z', HORSE2));
        rot(c, 134, 98, L, () => f(c, 'M128 96 L132 144 L144 146 L140 98 Z', HORSE2));
        f(c, HORSE_BODY, HORSE);
        rot(c, 150, 76, -kf(t, SWAY2), () => horseHead(c));
        horseCloth(c, team);
        rot(c, 76, 104, L, () => { f(c, 'M70 104 L68 144 L82 146 L80 104 Z', HORSE); f(c, rect(67, 138, 15, 8), '#2a1a10'); });
        rot(c, 140, 104, -L, () => { f(c, 'M134 104 L140 144 L154 146 L146 104 Z', HORSE); f(c, rect(139, 138, 15, 8), '#2a1a10'); });
        knightRider(c, team, 0, 0);
      });
      return;
    }
    rot(c, 70, 146, kf(t, [0, 0, 0.4, 0, 0.52, -4, 0.62, 2, 0.74, 2, 1, 0]), () => {
      f(c, TAIL, HAIR);
      f(c, 'M62 96 L54 144 L66 146 L72 98 Z', HORSE2);
      f(c, 'M128 96 L136 144 L148 146 L140 98 Z', HORSE2);
      f(c, HORSE_BODY, HORSE);
      horseHead(c);
      horseCloth(c, team);
      f(c, 'M70 104 L76 144 L90 146 L80 104 Z', HORSE); f(c, rect(75, 138, 15, 8), '#2a1a10');
      f(c, 'M134 104 L134 144 L148 146 L146 104 Z', HORSE); f(c, rect(133, 138, 15, 8), '#2a1a10');
      knightRider(c, team,
        kf(t, [0, -8, 0.4, -8, 0.56, 18, 0.74, 18, 1, -8]),
        kf(t, [0, 2, 0.4, 2, 0.56, -2, 0.74, -2, 1, 2]));
    });
  },
};

// ---------------------------------------------------------------- Modern

const OLIVE = '#6b7a45';
const OLIVE2 = '#5d6b3a';
const OLIVE3 = '#4a5530';
const OLIVE4 = '#3b4a2a';
const GUNMETAL = '#2e3236';

function rifle(c: C): void {
  f(c, 'M46 60 L94 54 L95 60 L62 66 L54 72 L46 68 Z', GUNMETAL);
  f(c, 'M70 62 L72 72 L79 71 L78 61 Z', GUNMETAL);
  s(c, 'M94 57 L106 56', OUT, 4);
  f(c, 'M106 53 L118 56 L106 59 Z', '#d4dae0', 2);
  f(c, 'M60 52 L78 58 L76 64 L58 58 Z', OLIVE);
  f(c, circ(78, 61, 4), SKIN);
}

function soldier(c: C, team: string, atk: boolean): void {
  f(c, 'M44 48 Q58 42 72 48 L72 80 L46 80 Z', OLIVE);
  f(c, 'M46 52 L70 52 L70 72 L46 72 Z', OLIVE4);
  s(c, 'M50 60 L58 60 M62 60 L67 60', OLIVE, 3);
  f(c, circ(60, 36, 12), SKIN);
  f(c, 'M46 34 Q46 18 60 18 Q76 18 76 32 L78 35 L44 36 Z', OLIVE2);
  s(c, 'M48 29 L75 28', team, 3);
  if (atk) {
    s(c, 'M63 38 L69 37', OUT, 2.5);
    s(c, 'M62 44 L68 43', OUT, 2);
  } else {
    s(c, 'M52 36 L56 46', OUT, 2);
    f(c, circ(66, 38, 1.8), OUT, 0);
  }
}

const infantry: UnitSprite = {
  ax: 60, ay: 106, top: 18, div: 62, strike: 0.5, walk: 0.5,
  draw(c, team, atk, t) {
    if (!atk) {
      const leg = kf(t, LEG);
      tr(c, 0, kf(t, BOB), () => {
        rot(c, 56, 78, leg, () => f(c, 'M52 76 L50 104 L62 106 L62 100 L58 76 Z', OLIVE3));
        rot(c, 60, 78, -leg, () => f(c, 'M56 76 L58 104 L71 106 L71 100 L64 76 Z', OLIVE2));
        soldier(c, team, false);
        rot(c, 60, 58, kf(t, SWAY3), () => rifle(c));
      });
      return;
    }
    rot(c, 60, 106, kf(t, [0, -3, 0.3, -3, 0.5, 6, 0.64, 6, 1, -3]), () => {
      f(c, 'M52 76 L44 104 L56 106 L56 100 L58 76 Z', OLIVE3);
      f(c, 'M58 76 L68 104 L81 106 L81 100 L64 76 Z', OLIVE2);
      soldier(c, team, true);
      tr(c, kf(t, [0, -4, 0.3, -4, 0.5, 12, 0.64, 12, 1, -4]), 0, () => rifle(c));
    });
  },
};

function lmg(c: C, flash: boolean): void {
  f(c, 'M42 58 L96 54 L96 62 L58 66 L50 74 L42 70 Z', '#2a2e34');
  f(c, 'M96 56 L114 56 L114 60 L96 60 Z', '#3e444c');
  s(c, 'M100 58 L102 58 M106 58 L108 58', MAIL, 1.5);
  f(c, 'M114 55 L118 55 L118 61 L114 61 Z', '#2a2e34', 2);
  f(c, 'M64 64 L80 64 L80 76 L64 76 Z', OLIVE2);
  f(c, 'M58 52 L80 58 L78 64 L56 58 Z', OLIVE3);
  f(c, circ(80, 61, 4), '#c98a5c');
  if (flash) f(c, 'M118 58 L126 50 L128 55 L138 52 L131 58 L138 64 L128 61 L126 66 Z', '#ffd23a', 2);
}

function gunnerBody(c: C, team: string, atk: boolean): void {
  f(c, 'M42 48 Q58 40 74 48 L74 80 L44 80 Z', OLIVE3);
  c.setLineDash([3, 2]);
  s(c, 'M44 52 Q50 64 72 70', '#c9a23a', 4);
  c.setLineDash([]);
  f(c, circ(60, 36, 12), '#c98a5c');
  f(c, 'M50 46 L70 46 L72 52 L48 52 Z', team);
  f(c, 'M44 32 Q46 20 60 20 Q74 20 76 32 L82 34 L38 36 Z', OLIVE4);
  if (atk) {
    s(c, 'M62 37 L69 38', OUT, 2.5);
    s(c, 'M58 44 L68 44', OUT, 2);
  } else {
    s(c, 'M54 42 Q60 46 68 42', OUT, 2);
    f(c, circ(66, 38, 1.8), OUT, 0);
  }
}

const gunner: UnitSprite = {
  ax: 60, ay: 106, top: 20, div: 60, strike: 0, walk: 0.5,
  draw(c, team, atk, t, time) {
    if (!atk) {
      const leg = kf(t, LEG);
      tr(c, 0, kf(t, BOB), () => {
        rot(c, 56, 78, leg, () => f(c, 'M51 76 L49 104 L61 106 L61 100 L58 76 Z', OLIVE4));
        rot(c, 60, 78, -leg, () => f(c, 'M56 76 L58 104 L71 106 L71 100 L65 76 Z', OLIVE3));
        gunnerBody(c, team, false);
        rot(c, 60, 58, kf(t, SWAY3), () => lmg(c, false));
      });
      return;
    }
    f(c, 'M51 76 L44 104 L56 106 L56 100 L58 76 Z', OLIVE4);
    f(c, 'M58 76 L66 104 L79 106 L79 100 L65 76 Z', OLIVE3);
    gunnerBody(c, team, true);
    const j = frac(time / 0.1);
    tr(c, j < 0.5 ? -2 : 0, j < 0.25 ? -1 : j < 0.5 ? 1 : 0, () => lmg(c, frac(time / 0.15) < 0.5));
  },
};

const tank: UnitSprite = {
  ax: 105, ay: 128, top: 26, div: 136, strike: 0.2, walk: 0.7,
  draw(c, team, atk, t) {
    f(c, 'M32 104 Q22 104 22 114 Q22 128 38 128 L172 128 Q188 128 188 114 Q188 104 178 104 Z', '#2a2e34');
    c.setLineDash([5, 5]);
    c.lineDashOffset = atk ? 0 : -frac(t * 2) * 20;
    s(c, 'M34 105 L176 105', '#6b7078', 2.5);
    c.lineDashOffset = atk ? 0 : frac(t * 2) * 20;
    s(c, 'M38 127 L172 127', '#6b7078', 2.5);
    c.setLineDash([]);
    c.lineDashOffset = 0;
    for (const x of [40, 72, 104, 136, 168]) {
      f(c, circ(x, 116, 9), '#545c66');
      rot(c, x, 116, atk ? 0 : t * 360, () => s(c, `M${x - 6} 116 L${x + 6} 116 M${x} 110 L${x} 122`, OUT, 2));
    }
    const rock = atk ? kf(t, [0, 0, 0.19, 0, 0.23, -2.5, 0.4, 0, 1, 0]) : 0;
    const bob = atk ? 0 : kf(frac(t * 2), [0, 0, 0.25, -1, 0.5, 0, 0.75, -1, 1, 0]);
    const recoil = atk ? kf(t, [0, 0, 0.19, 0, 0.22, -11, 0.5, 0, 1, 0]) : 0;
    rot(c, 40, 128, rock, () => tr(c, 0, bob, () => {
      f(c, 'M20 104 L38 84 L178 84 L198 98 L190 104 Z', OLIVE2);
      s(c, 'M28 96 L192 96', OLIVE4, 3);
      tr(c, recoil, 0, () => {
        f(c, 'M158 64 L208 64 L208 72 L158 72 Z', '#4b5a2f');
        f(c, 'M206 61 L218 61 L218 75 L206 75 Z', OLIVE4);
      });
      f(c, 'M152 60 L164 60 L166 76 L152 78 Z', '#4b5a2f');
      f(c, 'M78 84 L88 60 L150 60 L164 72 L162 84 Z', OLIVE);
      f(c, 'M100 60 L102 50 L120 50 L122 60 Z', OLIVE2);
      s(c, 'M96 60 L88 24', OUT, 2);
      f(c, 'M112 66 L126 66 L134 74 L126 82 L112 82 L120 74 Z', team, 2);
    }));
    if (atk && t > 0.19 && t < 0.32) {
      const k = kf(t, [0.19, 0.3, 0.21, 1.25, 0.28, 1, 0.32, 1]);
      scl(c, 234, 68, k, k, () => {
        f(c, 'M218 68 L230 54 L234 62 L250 56 L240 68 L250 80 L234 74 L230 82 Z', '#ffd23a');
        f(c, circ(226, 68, 5), '#ffffff', 0);
      });
    }
    if (atk && t > 0.22 && t < 0.7) {
      const u = (t - 0.22) / 0.48;
      alpha(c, 0.8 * (1 - u), () => scl(c, 226, 58, 0.6 + u * 1.2, 0.6 + u * 1.2, () =>
        tr(c, 0, -10 * u, () => f(c, circ(226, 58, 10), '#9aa0a6', 2))));
    }
  },
};

export const UNIT_SPRITES: Record<string, UnitSprite> = {
  clubman, slingshot, dino,
  swordsman, archer, knight,
  infantry, gunner, tank,
};

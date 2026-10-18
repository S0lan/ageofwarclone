import {
  AGES,
  BASE_WIDTH,
  LANE_LENGTH,
  OVERTIME_TICKS,
  TURRET_DEFS,
  UNIT_DEFS,
  secondsToTicks,
  turretX,
  turretY,
  type GameEvent,
  type GameState,
  type PlayerId,
  type Unit,
} from '@aow/shared';

export const WIDTH = 1280;
export const HEIGHT = 640;
const MARGIN = 20;
const SCALE = (WIDTH - MARGIN * 2) / LANE_LENGTH;
const GROUND_Y = 565;
const BASE_HEIGHT = 150;
/** Units are drawn larger than their collision size so they read well at this zoom. */
const UNIT_DRAW_SCALE = 1.35;

const TEAM_COLORS = { me: '#3d8bff', enemy: '#ff4d4d' };

interface Effect {
  kind: 'explosion' | 'puff' | 'text';
  x: number;
  y: number;
  age: number;
  life: number;
  radius?: number;
  text?: string;
  color: string;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private effects: Effect[] = [];
  private myId: PlayerId = 0;
  private shake = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  setPerspective(myId: PlayerId): void {
    this.myId = myId;
    this.effects = [];
  }

  /** World x to screen x, mirrored so the local player's base is always on the left. */
  private sx(x: number): number {
    const wx = this.myId === 1 ? LANE_LENGTH - x : x;
    return MARGIN + wx * SCALE;
  }

  private sy(y: number): number {
    return GROUND_Y - y * SCALE;
  }

  private facing(owner: PlayerId): 1 | -1 {
    return owner === this.myId ? 1 : -1;
  }

  private team(owner: PlayerId): string {
    return owner === this.myId ? TEAM_COLORS.me : TEAM_COLORS.enemy;
  }

  handleEvents(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'explosion':
          this.effects.push({ kind: 'explosion', x: e.x, y: 0, age: 0, life: 0.45, radius: e.radius, color: '#ffb347' });
          if (e.radius >= 30) this.shake = Math.max(this.shake, 4);
          break;
        case 'death': {
          const def = UNIT_DEFS[e.def];
          this.effects.push({ kind: 'puff', x: e.x, y: def.size / 2, age: 0, life: 0.5, radius: def.size, color: '#ddd' });
          if (e.owner !== this.myId) {
            this.effects.push({
              kind: 'text', x: e.x, y: def.size + 10, age: 0, life: 1.2, text: `+${def.goldReward}g`, color: '#ffd75e',
            });
          }
          break;
        }
        case 'baseHit':
          if (e.owner === this.myId) this.shake = Math.max(this.shake, 1.5);
          break;
        case 'evolve':
          this.effects.push({
            kind: 'text', x: e.owner === 0 ? BASE_WIDTH : LANE_LENGTH - BASE_WIDTH, y: BASE_HEIGHT / SCALE + 30,
            age: 0, life: 2.5, text: AGES[e.age].name + '!', color: '#9effa8',
          });
          break;
      }
    }
  }

  draw(state: GameState, dt: number): void {
    const ctx = this.ctx;
    const me = state.players[this.myId];
    const age = AGES[me.age];

    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake * 2, (Math.random() - 0.5) * this.shake * 2);
      this.shake = Math.max(0, this.shake - dt * 12);
    }

    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, age.skyColor);
    sky.addColorStop(1, '#eef6fb');
    ctx.fillStyle = sky;
    ctx.fillRect(-10, -10, WIDTH + 20, GROUND_Y + 10);
    this.drawHills(age.groundColor);
    ctx.fillStyle = age.groundColor;
    ctx.fillRect(-10, GROUND_Y, WIDTH + 20, HEIGHT - GROUND_Y + 10);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(-10, GROUND_Y, WIDTH + 20, 4);

    for (const owner of [0, 1] as const) this.drawBase(state, owner);
    for (const u of state.units) this.drawUnit(state, u);
    for (const p of state.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(this.sx(p.x), this.sy(p.y), p.splash > 0 ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const m of state.meteors) {
      if (m.delay > 0) continue;
      const x = this.sx(m.x);
      const y = this.sy(m.y);
      const trail = ctx.createLinearGradient(x, y - 40, x, y);
      trail.addColorStop(0, 'rgba(255,200,80,0)');
      trail.addColorStop(1, 'rgba(255,200,80,0.8)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y - 40);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(4, m.radius * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawEffects(dt);
    if (state.tick >= OVERTIME_TICKS && state.winner === null) {
      ctx.font = 'bold 22px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(200, 30, 30, ${0.6 + 0.4 * Math.sin(state.tick * 0.15)})`;
      ctx.fillText('OVERTIME - both bases are crumbling', WIDTH / 2, 200);
    }
    ctx.restore();
  }

  private drawHills(color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= WIDTH; x += 40) {
      ctx.lineTo(x, GROUND_Y - 40 - Math.sin(x / 140) * 25 - Math.sin(x / 57) * 10);
    }
    ctx.lineTo(WIDTH, GROUND_Y);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawBase(state: GameState, owner: PlayerId): void {
    const ctx = this.ctx;
    const p = state.players[owner];
    const age = AGES[p.age];
    const x0 = this.sx(owner === 0 ? 0 : LANE_LENGTH);
    const x1 = this.sx(owner === 0 ? BASE_WIDTH : LANE_LENGTH - BASE_WIDTH);
    const left = Math.min(x0, x1);
    const w = Math.abs(x1 - x0);
    const top = GROUND_Y - BASE_HEIGHT;

    ctx.fillStyle = age.baseColor;
    ctx.fillRect(left, top, w, BASE_HEIGHT);
    for (let i = 0; i < 4; i++) ctx.fillRect(left + 6 + i * (w / 4), top - 12, w / 8, 12);
    ctx.fillStyle = '#2b1d10';
    ctx.fillRect(left + w * 0.35, GROUND_Y - 40, w * 0.3, 40);
    ctx.strokeStyle = this.team(owner);
    ctx.lineWidth = 3;
    ctx.strokeRect(left, top, w, BASE_HEIGHT);

    // flag
    const fx = left + w / 2;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, top - 12);
    ctx.lineTo(fx, top - 50);
    ctx.stroke();
    ctx.fillStyle = this.team(owner);
    ctx.fillRect(fx, top - 50, 20 * this.facing(owner), 13);

    p.turrets.forEach((t, slot) => {
      const ty = this.sy(turretY(slot));
      const tx = this.sx(turretX(owner));
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(tx - 10, ty - 7, 20, 14);
      if (!t) return;
      const def = TURRET_DEFS[t.def];
      ctx.fillStyle = def.color;
      ctx.fillRect(tx - 9, ty - 6, 18, 12);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 16 * this.facing(owner), ty - 3);
      ctx.stroke();
    });

    this.drawBar(left, top - 70, w, 7, p.baseHp / p.baseMaxHp, this.team(owner));
    ctx.fillStyle = '#111';
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(p.baseHp)} / ${p.baseMaxHp}`, left + w / 2, top - 76);
  }

  private drawBar(x: number, y: number, w: number, h: number, frac: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, frac)), h - 2);
  }

  private drawUnit(state: GameState, u: Unit): void {
    const ctx = this.ctx;
    const def = UNIT_DEFS[u.def];
    const f = this.facing(u.owner);
    const s = def.size * SCALE * UNIT_DRAW_SCALE;
    const x = this.sx(u.x);
    const bob = u.attacking ? 0 : Math.abs(Math.sin(state.tick * 0.35 + u.id)) * 2.5;
    const base = GROUND_Y - bob;
    const cdTicks = secondsToTicks(def.attackCooldown);
    const swing = u.attacking ? Math.max(0, u.cooldown / cdTicks) : 0.3;

    ctx.save();
    ctx.translate(x, base);
    ctx.scale(f, 1);

    if (def.role === 'tank') {
      const w = s * 1.1;
      const h = s * 0.7;
      ctx.fillStyle = def.color;
      ctx.fillRect(-w / 2, -h, w, h * 0.8);
      ctx.fillStyle = '#222';
      ctx.fillRect(-w / 2, -h * 0.25, w, h * 0.25);
      if (def.id === 'tank') {
        ctx.fillStyle = def.color;
        ctx.fillRect(-w * 0.2, -h * 1.35, w * 0.45, h * 0.4);
        ctx.strokeStyle = '#2b2b2b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(w * 0.2, -h * 1.15);
        ctx.lineTo(w * 0.2 + s * 0.6 - swing * 4, -h * 1.15);
        ctx.stroke();
      } else {
        // rider
        ctx.fillStyle = '#e8c39e';
        ctx.beginPath();
        ctx.arc(0, -h - s * 0.25, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color;
        ctx.fillRect(w * 0.3, -h * 1.1, w * 0.25, h * 0.45);
        this.drawWeapon(s * 0.1, -h - s * 0.1, s * 0.55, swing, def.id === 'knight' ? '#ccc' : '#6b4a2a');
      }
    } else {
      const w = s * 0.55;
      const h = s * 1.05;
      ctx.fillStyle = def.color;
      ctx.fillRect(-w / 2, -h, w, h * 0.75);
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(-w / 2, -h * 0.25, w * 0.35, h * 0.25);
      ctx.fillRect(w * 0.15, -h * 0.25, w * 0.35, h * 0.25);
      ctx.fillStyle = '#e8c39e';
      ctx.beginPath();
      ctx.arc(0, -h - s * 0.18, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      if (def.role === 'ranged') {
        ctx.strokeStyle = '#4a3020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w * 0.6, -h * 0.65, s * 0.3, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else {
        this.drawWeapon(w * 0.4, -h * 0.65, s * 0.6, swing, def.age === 0 ? '#6b4a2a' : '#ccc');
      }
    }
    ctx.restore();

    ctx.strokeStyle = this.team(u.owner);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, GROUND_Y + 3);
    ctx.lineTo(x + s * 0.4, GROUND_Y + 3);
    ctx.stroke();

    if (u.hp < def.hp) {
      this.drawBar(x - s * 0.5, GROUND_Y - s * 1.6 - 8, s, 4, u.hp / def.hp, this.team(u.owner));
    }
  }

  private drawWeapon(x: number, y: number, len: number, swing: number, color: string): void {
    const ctx = this.ctx;
    const angle = -Math.PI / 2 + (1 - swing) * (Math.PI * 0.7);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  private drawEffects(dt: number): void {
    const ctx = this.ctx;
    this.effects = this.effects.filter((e) => (e.age += dt) < e.life);
    for (const e of this.effects) {
      const t = e.age / e.life;
      const x = this.sx(e.x);
      const y = this.sy(e.y);
      ctx.globalAlpha = 1 - t;
      if (e.kind === 'explosion') {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(x, y, (e.radius ?? 20) * SCALE * (0.4 + t * 0.8), Math.PI, 0);
        ctx.fill();
      } else if (e.kind === 'puff') {
        ctx.fillStyle = e.color;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * t * 20, y + Math.sin(a) * t * 12, 5 * (1 - t) + 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = e.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.font = 'bold 15px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(e.text!, x, y - t * 30);
        ctx.fillText(e.text!, x, y - t * 30);
      }
    }
    ctx.globalAlpha = 1;
  }
}

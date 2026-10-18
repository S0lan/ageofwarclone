import {
  AGES,
  BASE_WIDTH,
  LANE_LENGTH,
  TURRET_DEFS,
  UNIT_DEFS,
  isOvertime,
  turretX,
  turretY,
  type GameEvent,
  type GameState,
  type PlayerId,
  type Unit,
} from '@aow/shared';
import { frac } from './sprite-kit';
import { UNIT_SPRITES } from './sprites-units';
import {
  BASE_SPRITES,
  PROJECTILE_BY_COLOR,
  TURRET_SPRITES,
  drawBackground,
  drawBoom,
  drawDrop,
  drawEmptySlot,
  drawJet,
  drawProjectile,
  drawPuff,
  drawSpark,
} from './sprites-world';

export const WIDTH = 1280;
export const HEIGHT = 640;
const MARGIN = 20;
const SCALE = (WIDTH - MARGIN * 2) / LANE_LENGTH;
const GROUND_Y = 565;
const BASE_HEIGHT = 150;
/** Units are drawn larger than their collision size so they read well at this zoom. */
const UNIT_DRAW_SCALE = 1.35;

/** Base art is 200 x 300 viewBox units with the ground at y 292. */
const BASE_ART_SCALE = 0.5;
/** Turret art: the point (80, 50) in its viewBox sits on the turret slot, nudged forward. */
const TURRET_ART_SCALE = 0.45;
const TURRET_FORWARD = 24;
const PROJECTILE_SCALE = 0.85;

const TEAM_COLORS = { me: '#3d8bff', enemy: '#ff4d4d' };

interface Effect {
  kind: 'explosion' | 'puff' | 'text' | 'spark' | 'jet';
  x: number;
  y: number;
  age: number;
  life: number;
  radius?: number;
  text?: string;
  color: string;
  owner?: PlayerId;
}

/** Per-entity animation bookkeeping, derived purely from the snapshots we are given. */
interface Anim {
  key: string;
  x: number;
  walk: number;
  cd: number;
  fireAt: number;
  frame: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private effects: Effect[] = [];
  private myId: PlayerId = 0;
  private shake = 0;
  private time = 0;
  private frame = 0;
  private lastState: GameState | null = null;
  private unitAnim = new Map<number, Anim>();
  private turretAnim = new Map<string, Anim>();
  private projPrev = new Map<number, { x: number; y: number; a: number; frame: number }>();

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  setPerspective(myId: PlayerId): void {
    this.myId = myId;
    this.effects = [];
    this.unitAnim.clear();
    this.turretAnim.clear();
    this.projPrev.clear();
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
          this.effects.push({ kind: 'explosion', x: e.x, y: 0, age: 0, life: 0.5, radius: e.radius, color: '#ffb347' });
          if (e.radius >= 30) this.shake = Math.max(this.shake, 4);
          break;
        case 'death': {
          const def = UNIT_DEFS[e.def];
          this.effects.push({ kind: 'puff', x: e.x, y: def.size / 2, age: 0, life: 0.6, radius: def.size, color: '#ddd' });
          if (e.owner !== this.myId) {
            this.effects.push({
              kind: 'text', x: e.x, y: def.size + 10, age: 0, life: 1.2, text: `+${def.goldReward}g`, color: '#ffd75e',
            });
          }
          break;
        }
        case 'attack':
          if (!e.ranged) {
            const d = e.owner === 0 ? 1 : -1;
            this.effects.push({ kind: 'spark', x: e.x + d * 16, y: 12, age: 0, life: 0.35, color: '#ffd23a' });
          }
          break;
        case 'special':
          if (this.lastState && this.lastState.players[e.owner].age === 2) {
            this.effects.push({ kind: 'jet', x: 0, y: 0, age: 0, life: 2.2, color: '', owner: e.owner });
          }
          break;
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
    this.time += dt;
    this.frame++;
    this.lastState = state;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake * 2, (Math.random() - 0.5) * this.shake * 2);
      this.shake = Math.max(0, this.shake - dt * 12);
    }

    drawBackground(ctx, me.age, WIDTH, GROUND_Y, HEIGHT);

    for (const owner of [0, 1] as const) this.drawBase(state, owner);
    // Big units behind small ones.
    const units = [...state.units].sort((a, b) => UNIT_DEFS[b.def].size - UNIT_DEFS[a.def].size);
    for (const u of units) this.drawUnit(u, dt);
    this.drawProjectiles(state);
    this.drawMeteors(state);
    this.drawEffects(dt);

    if (isOvertime(state) && state.winner === null) {
      ctx.font = 'bold 22px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(200, 30, 30, ${0.6 + 0.4 * Math.sin(state.tick * 0.15)})`;
      ctx.fillText('OVERTIME - both bases are crumbling', WIDTH / 2, 200);
    }
    ctx.restore();

    for (const [id, a] of this.unitAnim) if (a.frame !== this.frame) this.unitAnim.delete(id);
    for (const [id, a] of this.turretAnim) if (a.frame !== this.frame) this.turretAnim.delete(id);
    for (const [id, p] of this.projPrev) if (p.frame !== this.frame) this.projPrev.delete(id);
  }

  /**
   * Tracks when an entity last fired (its cooldown jumped up) and returns the phase of its attack
   * cycle, or -1 when it has not fired recently and should rest.
   */
  private attackPhase(a: Anim, cooldown: number, period: number, strike: number): number {
    if (cooldown > a.cd) a.fireAt = this.time;
    a.cd = cooldown;
    a.frame = this.frame;
    const el = this.time - a.fireAt;
    if (el > period * 1.8) return -1;
    return frac(strike + el / period);
  }

  private drawBase(state: GameState, owner: PlayerId): void {
    const ctx = this.ctx;
    const p = state.players[owner];
    const f = this.facing(owner);
    const team = this.team(owner);
    const x0 = this.sx(owner === 0 ? 0 : LANE_LENGTH);
    const x1 = this.sx(owner === 0 ? BASE_WIDTH : LANE_LENGTH - BASE_WIDTH);
    const left = Math.min(x0, x1);
    const w = Math.abs(x1 - x0);
    const top = GROUND_Y - BASE_HEIGHT;

    ctx.save();
    ctx.translate(left + w / 2, GROUND_Y);
    ctx.scale(f * BASE_ART_SCALE, BASE_ART_SCALE);
    ctx.translate(-100, -292);
    BASE_SPRITES[p.age](ctx, team, this.time + owner * 0.37);
    ctx.restore();

    p.turrets.forEach((t, slot) => {
      ctx.save();
      ctx.translate(this.sx(turretX(owner)) + f * TURRET_FORWARD, this.sy(turretY(slot)));
      ctx.scale(f * TURRET_ART_SCALE, TURRET_ART_SCALE);
      ctx.translate(-80, -50);
      const sprite = t ? TURRET_SPRITES[t.def] : undefined;
      if (!t || !sprite) {
        drawEmptySlot(ctx, p.age);
      } else {
        const key = `${owner}:${slot}:${t.def}`;
        let a = this.turretAnim.get(key);
        if (!a) {
          a = { key, x: 0, walk: 0, cd: t.cooldown, fireAt: -1e9, frame: this.frame };
          this.turretAnim.set(key, a);
        }
        const phase = this.attackPhase(a, t.cooldown, TURRET_DEFS[t.def].cooldown, sprite.strike);
        sprite.draw(ctx, team, Math.max(0, phase), phase >= 0, this.time);
      }
      ctx.restore();
    });

    this.drawBar(left, top - 16, w, 7, p.baseHp / p.baseMaxHp, team);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(p.baseHp)} / ${p.baseMaxHp}`, left + w / 2, top - 22);
  }

  private drawBar(x: number, y: number, w: number, h: number, frac: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, frac)), h - 2);
  }

  private drawUnit(u: Unit, dt: number): void {
    const ctx = this.ctx;
    const def = UNIT_DEFS[u.def];
    const sprite = UNIT_SPRITES[u.def];
    if (!sprite) return;
    const f = this.facing(u.owner);
    const team = this.team(u.owner);
    const size = def.size * SCALE * UNIT_DRAW_SCALE;
    const k = size / sprite.div;
    const x = this.sx(u.x);

    let a = this.unitAnim.get(u.id);
    if (!a) {
      a = { key: '', x: u.x, walk: frac(u.id * 0.618), cd: u.cooldown, fireAt: -1e9, frame: this.frame };
      this.unitAnim.set(u.id, a);
    }
    const moved = Math.abs(u.x - a.x) > 1e-3;
    if (moved && !u.attacking) a.walk = frac(a.walk + dt / sprite.walk);
    a.x = u.x;
    const phase = this.attackPhase(a, u.cooldown, def.attackCooldown, sprite.strike);
    const atk = u.attacking;
    const t = atk ? Math.max(0, phase) : a.walk;

    ctx.save();
    ctx.translate(x, GROUND_Y);
    ctx.scale(f * k, k);
    ctx.translate(-sprite.ax, -sprite.ay);
    sprite.draw(ctx, team, atk, t, this.time);
    ctx.restore();

    const half = Math.min(size * 0.5, 30);
    ctx.strokeStyle = team;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - half, GROUND_Y + 4);
    ctx.lineTo(x + half, GROUND_Y + 4);
    ctx.stroke();

    if (u.hp < def.hp) {
      const barY = GROUND_Y - (sprite.ay - sprite.top) * k - 10;
      this.drawBar(x - size * 0.5, barY, size, 4, u.hp / def.hp, team);
    }
  }

  private drawProjectiles(state: GameState): void {
    const ctx = this.ctx;
    for (const p of state.projectiles) {
      const x = this.sx(p.x);
      const y = this.sy(p.y);
      const prev = this.projPrev.get(p.id);
      let angle = prev ? prev.a : this.facing(p.owner) > 0 ? 0 : Math.PI;
      if (prev && Math.hypot(x - prev.x, y - prev.y) > 0.5) angle = Math.atan2(y - prev.y, x - prev.x);
      this.projPrev.set(p.id, { x, y, a: angle, frame: this.frame });

      const kind = PROJECTILE_BY_COLOR[p.color];
      if (!kind) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.splash > 0 ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(PROJECTILE_SCALE, PROJECTILE_SCALE);
      drawProjectile(ctx, kind, angle, this.time + p.id, this.team(p.owner));
      ctx.restore();
    }
  }

  private drawMeteors(state: GameState): void {
    const ctx = this.ctx;
    for (const m of state.meteors) {
      if (m.delay > 0) continue;
      ctx.save();
      ctx.translate(this.sx(m.x), this.sy(m.y));
      drawDrop(ctx, m.color, this.time + m.id * 0.13, this.facing(m.owner), this.team(m.owner));
      ctx.restore();
    }
  }

  private drawEffects(dt: number): void {
    const ctx = this.ctx;
    this.effects = this.effects.filter((e) => (e.age += dt) < e.life);
    for (const e of this.effects) {
      const t = e.age / e.life;
      const x = this.sx(e.x);
      const y = this.sy(e.y);
      ctx.save();
      if (e.kind === 'explosion') {
        const k = Math.max(0.5, ((e.radius ?? 20) * SCALE) / 40);
        ctx.translate(x, GROUND_Y);
        ctx.scale(k, k);
        drawBoom(ctx, t);
      } else if (e.kind === 'puff') {
        const k = Math.max(0.8, (e.radius ?? 20) / 20);
        ctx.translate(x, y);
        ctx.scale(k, k);
        drawPuff(ctx, t);
      } else if (e.kind === 'spark') {
        ctx.translate(x, y);
        ctx.scale(0.9, 0.9);
        drawSpark(ctx, t, e.color);
      } else if (e.kind === 'jet') {
        const f = this.facing(e.owner ?? 0);
        const from = f > 0 ? -80 : WIDTH + 80;
        const to = f > 0 ? WIDTH + 80 : -80;
        ctx.translate(from + (to - from) * t, 70);
        ctx.scale(f * 1.4, 1.4);
        drawJet(ctx, this.team(e.owner ?? 0));
      } else {
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = e.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.font = 'bold 15px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(e.text!, x, y - t * 30);
        ctx.fillText(e.text!, x, y - t * 30);
      }
      ctx.restore();
    }
  }
}

import type { Command } from './commands';
import {
  BASE_WIDTH,
  DT,
  LANE_LENGTH,
  MAX_QUEUE,
  OVERTIME_DECAY,
  OVERTIME_TICKS,
  SPECIAL_COOLDOWN_DEFAULT,
  START_GOLD,
  TICK_RATE,
  TURRET_SELL_REFUND,
  TURRET_SLOTS,
  UNIT_SPACING,
  clampSpecialCooldown,
  secondsToTicks,
} from './constants';
import { AGES, TURRET_DEFS, UNIT_DEFS } from './data';

export type PlayerId = 0 | 1;

export interface Unit {
  id: number;
  owner: PlayerId;
  def: string;
  hp: number;
  x: number;
  cooldown: number;
  attacking: boolean;
}

export interface Projectile {
  id: number;
  owner: PlayerId;
  x: number;
  y: number;
  /** Unit id, or BASE_TARGET for the opponent's base. */
  targetId: number;
  damage: number;
  speed: number;
  splash: number;
  color: string;
}

export interface Meteor {
  id: number;
  owner: PlayerId;
  x: number;
  y: number;
  /** Ticks before it starts falling. */
  delay: number;
  damage: number;
  radius: number;
  color: string;
}

export interface TurretInstance {
  def: string;
  cooldown: number;
}

export interface QueueItem {
  def: string;
  remaining: number;
  total: number;
}

export interface PlayerState {
  gold: number;
  xp: number;
  age: number;
  baseHp: number;
  baseMaxHp: number;
  queue: QueueItem[];
  turrets: (TurretInstance | null)[];
  specialCooldown: number;
}

export type GameEvent =
  | { type: 'spawn'; owner: PlayerId; def: string }
  | { type: 'attack'; owner: PlayerId; x: number; ranged: boolean }
  | { type: 'death'; owner: PlayerId; x: number; def: string }
  | { type: 'baseHit'; owner: PlayerId }
  | { type: 'turretFire'; owner: PlayerId }
  | { type: 'explosion'; owner: PlayerId; x: number; radius: number }
  | { type: 'build'; owner: PlayerId }
  | { type: 'evolve'; owner: PlayerId; age: number }
  | { type: 'special'; owner: PlayerId }
  | { type: 'gameOver'; winner: PlayerId };

export interface GameState {
  tick: number;
  players: [PlayerState, PlayerState];
  units: Unit[];
  projectiles: Projectile[];
  meteors: Meteor[];
  nextId: number;
  rng: number;
  winner: PlayerId | null;
  options: GameOptions;
  /** Events accumulated since the last takeEvents() call. */
  events: GameEvent[];
}

export interface GameOptions {
  /** After OVERTIME_TICKS both bases decay, so stalemates end in favour of whoever has more base HP. */
  overtime: boolean;
  /** Seconds between special attacks, for both players. */
  specialCooldown: number;
}

export const DEFAULT_OPTIONS: GameOptions = { overtime: false, specialCooldown: SPECIAL_COOLDOWN_DEFAULT };

export const isOvertime = (state: GameState): boolean => state.options.overtime && state.tick >= OVERTIME_TICKS;

export const BASE_TARGET = -1;
const METEOR_START_Y = 500;
const METEOR_FALL_SPEED = 420;

export const dir = (owner: PlayerId): 1 | -1 => (owner === 0 ? 1 : -1);
export const other = (owner: PlayerId): PlayerId => (owner === 0 ? 1 : 0);
export const baseFront = (owner: PlayerId): number => (owner === 0 ? BASE_WIDTH : LANE_LENGTH - BASE_WIDTH);
export const turretX = (owner: PlayerId): number =>
  owner === 0 ? BASE_WIDTH * 0.55 : LANE_LENGTH - BASE_WIDTH * 0.55;
export const turretY = (slot: number): number => 50 + slot * 24;

function createPlayer(): PlayerState {
  return {
    gold: START_GOLD,
    xp: 0,
    age: 0,
    baseHp: AGES[0].baseHp,
    baseMaxHp: AGES[0].baseHp,
    queue: [],
    turrets: new Array(TURRET_SLOTS).fill(null),
    specialCooldown: 0,
  };
}

export function createGame(seed = 1, options: Partial<GameOptions> = {}): GameState {
  return {
    tick: 0,
    players: [createPlayer(), createPlayer()],
    units: [],
    projectiles: [],
    meteors: [],
    nextId: 1,
    rng: seed >>> 0,
    winner: null,
    options: {
      ...DEFAULT_OPTIONS,
      ...options,
      specialCooldown: clampSpecialCooldown(options.specialCooldown ?? SPECIAL_COOLDOWN_DEFAULT),
    },
    events: [],
  };
}

/** mulberry32, with its state kept in GameState so runs are reproducible. */
export function random(state: GameState): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function applyCommand(state: GameState, owner: PlayerId, cmd: Command): boolean {
  if (state.winner !== null) return false;
  const p = state.players[owner];
  const age = AGES[p.age];

  switch (cmd.type) {
    case 'spawnUnit': {
      const def = age.units[cmd.unit];
      if (!def || p.queue.length >= MAX_QUEUE || p.gold < def.cost) return false;
      p.gold -= def.cost;
      const ticks = secondsToTicks(def.trainTime);
      p.queue.push({ def: def.id, remaining: ticks, total: ticks });
      return true;
    }
    case 'buildTurret': {
      const def = age.turrets[cmd.turret];
      if (!def || p.gold < def.cost) return false;
      const slot = cmd.slot ?? p.turrets.findIndex((t) => t === null);
      if (slot < 0 || slot >= TURRET_SLOTS || p.turrets[slot] !== null) return false;
      p.gold -= def.cost;
      p.turrets[slot] = { def: def.id, cooldown: 0 };
      state.events.push({ type: 'build', owner });
      return true;
    }
    case 'sellTurret': {
      const t = p.turrets[cmd.slot];
      if (!t) return false;
      p.gold += Math.floor(TURRET_DEFS[t.def].cost * TURRET_SELL_REFUND);
      p.turrets[cmd.slot] = null;
      return true;
    }
    case 'evolve': {
      if (p.age >= AGES.length - 1 || p.xp < age.xpToEvolve) return false;
      p.xp -= age.xpToEvolve;
      p.age += 1;
      const newMax = AGES[p.age].baseHp;
      p.baseHp += newMax - p.baseMaxHp;
      p.baseMaxHp = newMax;
      state.events.push({ type: 'evolve', owner, age: p.age });
      return true;
    }
    case 'special': {
      if (p.specialCooldown > 0) return false;
      const sp = age.special;
      p.specialCooldown = secondsToTicks(state.options.specialCooldown);
      const from = baseFront(owner) + dir(owner) * 80;
      const to = baseFront(other(owner));
      const spreadTicks = sp.duration * TICK_RATE;
      for (let i = 0; i < sp.count; i++) {
        state.meteors.push({
          id: state.nextId++,
          owner,
          x: from + (to - from) * random(state),
          y: METEOR_START_Y,
          delay: Math.floor((i / sp.count) * spreadTicks + random(state) * 6),
          damage: sp.damage,
          radius: sp.radius,
          color: sp.color,
        });
      }
      state.events.push({ type: 'special', owner });
      return true;
    }
  }
}

export function forfeit(state: GameState, loser: PlayerId): void {
  if (state.winner !== null) return;
  state.winner = other(loser);
  state.events.push({ type: 'gameOver', winner: state.winner });
}

export function takeEvents(state: GameState): GameEvent[] {
  const events = state.events;
  state.events = [];
  return events;
}

export function step(state: GameState): void {
  if (state.winner !== null) return;
  state.tick++;

  for (const owner of [0, 1] as const) {
    const p = state.players[owner];
    p.gold += AGES[p.age].income * DT;
    if (p.specialCooldown > 0) p.specialCooldown--;
    if (isOvertime(state)) p.baseHp -= p.baseMaxHp * OVERTIME_DECAY * DT;
    processQueue(state, owner);
  }

  updateUnits(state);
  updateTurrets(state);
  updateProjectiles(state);
  updateMeteors(state);
  resolveDeaths(state);
  checkWinner(state);
}

function processQueue(state: GameState, owner: PlayerId): void {
  const p = state.players[owner];
  const item = p.queue[0];
  if (!item) return;
  if (item.remaining > 0) item.remaining--;
  if (item.remaining > 0) return;

  const def = UNIT_DEFS[item.def];
  const x = baseFront(owner) + dir(owner) * (def.size / 2);
  const blocked = state.units.some(
    (u) => u.owner === owner && Math.abs(u.x - x) < (UNIT_DEFS[u.def].size + def.size) / 2 + UNIT_SPACING,
  );
  if (blocked) return;

  p.queue.shift();
  state.units.push({ id: state.nextId++, owner, def: def.id, hp: def.hp, x, cooldown: 0, attacking: false });
  state.events.push({ type: 'spawn', owner, def: def.id });
}

function damageBase(state: GameState, owner: PlayerId, amount: number): void {
  const p = state.players[owner];
  p.baseHp = Math.max(0, p.baseHp - amount);
  state.events.push({ type: 'baseHit', owner });
}

function updateUnits(state: GameState): void {
  for (const owner of [0, 1] as const) {
    const d = dir(owner);
    const enemy = other(owner);
    const mine = state.units.filter((u) => u.owner === owner).sort((a, b) => (b.x - a.x) * d);
    const enemies = state.units.filter((u) => u.owner === enemy);
    const enemyBase = baseFront(enemy);

    let ahead: Unit | null = null;
    for (const u of mine) {
      const def = UNIT_DEFS[u.def];
      if (u.cooldown > 0) u.cooldown--;

      let target: Unit | null = null;
      let targetGap = Infinity;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const gap = (e.x - u.x) * d - (UNIT_DEFS[e.def].size + def.size) / 2;
        if (gap < targetGap) {
          targetGap = gap;
          target = e;
        }
      }
      const baseGap = (enemyBase - u.x) * d - def.size / 2;

      const hitsUnit = target !== null && targetGap <= def.range;
      const hitsBase = !hitsUnit && baseGap <= def.range;
      u.attacking = hitsUnit || hitsBase;

      if (u.attacking) {
        if (u.cooldown <= 0) {
          u.cooldown = secondsToTicks(def.attackCooldown);
          if (def.projectile) {
            state.projectiles.push({
              id: state.nextId++,
              owner,
              x: u.x + d * (def.size / 2),
              y: def.size * 0.7,
              targetId: hitsUnit ? target!.id : BASE_TARGET,
              damage: def.damage,
              speed: def.projectile.speed,
              splash: 0,
              color: def.projectile.color,
            });
          } else if (hitsUnit) {
            target!.hp -= def.damage;
          } else {
            damageBase(state, enemy, def.damage);
          }
          state.events.push({ type: 'attack', owner, x: u.x, ranged: !!def.projectile });
        }
      } else {
        let move = def.speed * DT;
        if (ahead) {
          const room = (ahead.x - u.x) * d - (UNIT_DEFS[ahead.def].size + def.size) / 2 - UNIT_SPACING;
          move = Math.min(move, Math.max(0, room));
        }
        move = Math.min(move, Math.max(0, targetGap), Math.max(0, baseGap));
        u.x += move * d;
      }
      ahead = u;
    }
  }
}

function updateTurrets(state: GameState): void {
  for (const owner of [0, 1] as const) {
    const p = state.players[owner];
    const tx = turretX(owner);
    p.turrets.forEach((t, slot) => {
      if (!t) return;
      if (t.cooldown > 0) {
        t.cooldown--;
        return;
      }
      const def = TURRET_DEFS[t.def];
      let target: Unit | null = null;
      let best = Infinity;
      for (const u of state.units) {
        if (u.owner === owner || u.hp <= 0) continue;
        const dist = Math.abs(u.x - tx);
        if (dist <= def.range && dist < best) {
          best = dist;
          target = u;
        }
      }
      if (!target) return;
      t.cooldown = secondsToTicks(def.cooldown);
      state.projectiles.push({
        id: state.nextId++,
        owner,
        x: tx,
        y: turretY(slot),
        targetId: target.id,
        damage: def.damage,
        speed: def.projectileSpeed,
        splash: def.splash,
        color: def.color,
      });
      state.events.push({ type: 'turretFire', owner });
    });
  }
}

function areaDamage(state: GameState, owner: PlayerId, x: number, radius: number, damage: number): void {
  for (const u of state.units) {
    if (u.owner === owner) continue;
    if (Math.abs(u.x - x) <= radius + UNIT_DEFS[u.def].size / 2) u.hp -= damage;
  }
  state.events.push({ type: 'explosion', owner, x, radius });
}

function updateProjectiles(state: GameState): void {
  const remaining: Projectile[] = [];
  for (const pr of state.projectiles) {
    let tx: number;
    let ty: number;
    let target: Unit | undefined;
    if (pr.targetId === BASE_TARGET) {
      const enemy = other(pr.owner);
      tx = baseFront(enemy) + dir(enemy) * 15;
      ty = 40;
    } else {
      target = state.units.find((u) => u.id === pr.targetId);
      if (!target || target.hp <= 0) continue;
      tx = target.x;
      ty = UNIT_DEFS[target.def].size / 2;
    }

    const dx = tx - pr.x;
    const dy = ty - pr.y;
    const dist = Math.hypot(dx, dy);
    const travel = pr.speed * DT;
    if (dist > travel) {
      pr.x += (dx / dist) * travel;
      pr.y += (dy / dist) * travel;
      remaining.push(pr);
      continue;
    }

    if (!target) damageBase(state, other(pr.owner), pr.damage);
    else if (pr.splash > 0) areaDamage(state, pr.owner, tx, pr.splash, pr.damage);
    else target.hp -= pr.damage;
  }
  state.projectiles = remaining;
}

function updateMeteors(state: GameState): void {
  const remaining: Meteor[] = [];
  for (const m of state.meteors) {
    if (m.delay > 0) {
      m.delay--;
      remaining.push(m);
      continue;
    }
    m.y -= METEOR_FALL_SPEED * DT;
    if (m.y > 0) {
      remaining.push(m);
      continue;
    }
    areaDamage(state, m.owner, m.x, m.radius, m.damage);
  }
  state.meteors = remaining;
}

function resolveDeaths(state: GameState): void {
  const alive: Unit[] = [];
  for (const u of state.units) {
    if (u.hp > 0) {
      alive.push(u);
      continue;
    }
    const def = UNIT_DEFS[u.def];
    const killer = state.players[other(u.owner)];
    killer.gold += def.goldReward;
    killer.xp += def.xpReward;
    state.events.push({ type: 'death', owner: u.owner, x: u.x, def: u.def });
  }
  state.units = alive;
}

function checkWinner(state: GameState): void {
  const [a, b] = state.players;
  if (a.baseHp <= 0 && b.baseHp <= 0) {
    state.winner = a.baseHp / a.baseMaxHp < b.baseHp / b.baseMaxHp ? 1 : 0;
  } else if (a.baseHp <= 0) state.winner = 1;
  else if (b.baseHp <= 0) state.winner = 0;
  a.baseHp = Math.max(0, a.baseHp);
  b.baseHp = Math.max(0, b.baseHp);
  if (state.winner !== null) state.events.push({ type: 'gameOver', winner: state.winner });
}

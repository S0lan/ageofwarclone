import {
  AGES,
  LANE_LENGTH,
  TURRET_DEFS,
  TICK_RATE,
  UNIT_DEFS,
  baseFront,
  buildTurret,
  evolve,
  sellTurret,
  spawnUnit,
  special,
  type Command,
  type GameState,
  type PlayerId,
  type Unit,
} from '@aow/shared';
import type { Controller } from './session';

export type Difficulty = 'easy' | 'normal' | 'hard';

interface Settings {
  /** Ticks between decisions. */
  think: number;
  /** Chance to skip a decision entirely. */
  hesitation: number;
  maxQueue: number;
  maxTurrets: number;
  /** Enemy units near the base before the special is used. */
  specialThreshold: number;
  /** Ticks after reaching the XP threshold before evolving. */
  evolveDelay: number;
  /** Chance to pick a random unit instead of a sensible one. */
  randomPick: number;
  /** Whether turrets are built while the AI is losing the field. */
  turretsUnderPressure: boolean;
  /** When the opponent is in a later age: evolve without delay and build turrets while losing. */
  catchUp: boolean;
  /** Gold banked (as a multiple of the heavy unit's cost) before spending while not under pressure. */
  reserve: number;
}

const SETTINGS: Record<Difficulty, Settings> = {
  easy: {
    think: 40, hesitation: 0.35, maxQueue: 2, maxTurrets: 1, specialThreshold: 8,
    evolveDelay: TICK_RATE * 40, randomPick: 0.6, turretsUnderPressure: false, catchUp: false, reserve: 1.3,
  },
  normal: {
    think: 18, hesitation: 0.1, maxQueue: 3, maxTurrets: 2, specialThreshold: 5,
    evolveDelay: TICK_RATE * 8, randomPick: 0.2, turretsUnderPressure: false, catchUp: true, reserve: 0.6,
  },
  hard: {
    think: 8, hesitation: 0, maxQueue: 4, maxTurrets: 3, specialThreshold: 4,
    evolveDelay: 0, randomPick: 0, turretsUnderPressure: true, catchUp: true, reserve: 0.3,
  },
};

function strength(units: Unit[]): number {
  return units.reduce((sum, u) => {
    const def = UNIT_DEFS[u.def];
    return sum + def.cost * (u.hp / def.hp);
  }, 0);
}

export class AiController implements Controller {
  private s: Settings;
  private nextThink = 0;
  private evolveReadyAt: number | null = null;

  constructor(
    private me: PlayerId,
    difficulty: Difficulty,
  ) {
    this.s = SETTINGS[difficulty];
  }

  update(state: GameState): Command | null {
    if (state.tick < this.nextThink) return null;
    this.nextThink = state.tick + this.s.think + Math.floor(Math.random() * this.s.think * 0.5);
    if (Math.random() < this.s.hesitation) return null;

    const p = state.players[this.me];
    const age = AGES[p.age];
    const mine = state.units.filter((u) => u.owner === this.me);
    const enemies = state.units.filter((u) => u.owner !== this.me);

    const behind = this.s.catchUp && state.players[this.me === 0 ? 1 : 0].age > p.age;
    if (p.age < AGES.length - 1 && p.xp >= age.xpToEvolve) {
      this.evolveReadyAt ??= state.tick;
      if (behind || state.tick - this.evolveReadyAt >= this.s.evolveDelay) {
        this.evolveReadyAt = null;
        return evolve();
      }
    }

    const home = baseFront(this.me);
    const nearBase = enemies.filter((u) => Math.abs(u.x - home) < LANE_LENGTH * 0.45);
    const bigThreat = strength(nearBase) >= age.units[2].cost * 2;
    if (p.specialCooldown <= 0 && (nearBase.length >= this.s.specialThreshold || bigThreat)) return special();

    const queued = p.queue.reduce((sum, q) => sum + UNIT_DEFS[q.def].cost, 0);
    const myStr = strength(mine) + queued;
    const enemyStr = strength(enemies);
    const underPressure = myStr < enemyStr * 1.15 + 20 || nearBase.length > 0;
    const surplus = age.units[2].cost * this.s.reserve;

    if (p.queue.length < this.s.maxQueue && (underPressure || p.gold > surplus)) {
      const pick = this.pickUnit(state, mine);
      if (pick !== null) return spawnUnit(pick);
    }

    const outdated = p.turrets.findIndex((t) => t !== null && TURRET_DEFS[t.def].age < p.age);
    if (outdated >= 0 && !underPressure && p.gold >= age.turrets[0].cost + 50) return sellTurret(outdated);

    const built = p.turrets.filter((t) => t !== null).length;
    const hasEmpty = p.turrets.some((t) => t === null);
    if (built < this.s.maxTurrets && hasEmpty && (this.s.turretsUnderPressure || behind || !underPressure)) {
      const choice = p.gold >= age.turrets[1].cost + 100 ? 1 : 0;
      if (p.gold >= age.turrets[choice].cost + 40) return buildTurret(choice);
    }
    return null;
  }

  private pickUnit(state: GameState, mine: Unit[]): number | null {
    const p = state.players[this.me];
    const units = AGES[p.age].units;
    const count = (role: string) =>
      mine.filter((u) => UNIT_DEFS[u.def].role === role).length +
      p.queue.filter((q) => UNIT_DEFS[q.def].role === role).length;
    const melee = count('melee');
    const ranged = count('ranged');
    const tanks = count('tank');

    // Heavy units are poor value on their own; keep roughly one as a shield per 8 units.
    const wantTank = p.gold >= units[2].cost && tanks < 1 + Math.floor((melee + ranged) / 8) && melee + ranged >= 3;
    let choice = wantTank ? 2 : melee > 0 && ranged < melee ? 1 : 0;
    if (Math.random() < this.s.randomPick) choice = Math.floor(Math.random() * 3);
    while (choice >= 0 && p.gold < units[choice].cost) choice--;
    // Never let the front line be only ranged units.
    if (choice === 1 && melee === 0) choice = 0;
    return choice >= 0 ? choice : null;
  }
}

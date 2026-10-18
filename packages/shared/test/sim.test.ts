import { describe, expect, it } from 'vitest';
import {
  AGES,
  LANE_LENGTH,
  MAX_QUEUE,
  OVERTIME_TICKS,
  START_GOLD,
  TICK_RATE,
  UNIT_DEFS,
  applyCommand,
  buildTurret,
  createGame,
  evolve,
  parseCommand,
  sellTurret,
  spawnUnit,
  special,
  step,
  type GameState,
} from '../src';

function run(state: GameState, ticks: number): void {
  for (let i = 0; i < ticks; i++) step(state);
}

describe('economy', () => {
  it('charges gold for spawning and caps the queue', () => {
    const s = createGame();
    s.players[0].gold = 1000;
    for (let i = 0; i < MAX_QUEUE; i++) expect(applyCommand(s, 0, spawnUnit(0))).toBe(true);
    expect(applyCommand(s, 0, spawnUnit(0))).toBe(false);
    expect(s.players[0].gold).toBe(1000 - MAX_QUEUE * AGES[0].units[0].cost);
  });

  it('rejects spawns the player cannot afford', () => {
    const s = createGame();
    s.players[0].gold = 10;
    expect(applyCommand(s, 0, spawnUnit(2))).toBe(false);
    expect(s.players[0].queue).toHaveLength(0);
  });

  it('builds and sells turrets with a partial refund', () => {
    const s = createGame();
    expect(applyCommand(s, 0, buildTurret(0))).toBe(true);
    expect(s.players[0].turrets[0]?.def).toBe('rockslinger');
    expect(s.players[0].gold).toBe(START_GOLD - 100);
    expect(applyCommand(s, 0, sellTurret(0))).toBe(true);
    expect(s.players[0].turrets[0]).toBeNull();
    expect(s.players[0].gold).toBe(START_GOLD - 50);
  });

  it('evolves only with enough XP and grows base HP', () => {
    const s = createGame();
    expect(applyCommand(s, 0, evolve())).toBe(false);
    s.players[0].xp = AGES[0].xpToEvolve + 5;
    expect(applyCommand(s, 0, evolve())).toBe(true);
    const p = s.players[0];
    expect(p.age).toBe(1);
    expect(p.xp).toBe(5);
    expect(p.baseMaxHp).toBe(AGES[1].baseHp);
    expect(p.baseHp).toBe(AGES[1].baseHp);
  });
});

describe('combat', () => {
  it('spawns units that walk toward the enemy', () => {
    const s = createGame();
    applyCommand(s, 0, spawnUnit(0));
    run(s, TICK_RATE * 2);
    expect(s.units).toHaveLength(1);
    expect(s.units[0].x).toBeGreaterThan(100);
  });

  it('opposing units fight and the killer gets gold and XP', () => {
    const s = createGame();
    s.players[0].gold = 1000;
    applyCommand(s, 0, spawnUnit(2));
    applyCommand(s, 1, spawnUnit(0));
    const goldBefore = s.players[0].gold;
    run(s, TICK_RATE * 30);
    expect(s.units.filter((u) => u.owner === 1)).toHaveLength(0);
    expect(s.players[0].xp).toBe(UNIT_DEFS.clubman.xpReward);
    expect(s.players[0].gold).toBeGreaterThanOrEqual(goldBefore + UNIT_DEFS.clubman.goldReward);
  });

  it('units never pass through each other', () => {
    const s = createGame();
    s.players[0].gold = s.players[1].gold = 1000;
    for (let i = 0; i < 4; i++) {
      applyCommand(s, 0, spawnUnit(i % 2));
      applyCommand(s, 1, spawnUnit(i % 2));
    }
    for (let t = 0; t < TICK_RATE * 20; t++) {
      step(s);
      const front0 = Math.max(-Infinity, ...s.units.filter((u) => u.owner === 0).map((u) => u.x));
      const front1 = Math.min(Infinity, ...s.units.filter((u) => u.owner === 1).map((u) => u.x));
      expect(front0).toBeLessThan(front1);
    }
  });

  it('turrets shoot incoming enemies', () => {
    const s = createGame();
    applyCommand(s, 0, buildTurret(0));
    applyCommand(s, 1, spawnUnit(0));
    run(s, TICK_RATE * 25);
    expect(s.players[0].xp).toBeGreaterThan(0);
  });

  it('special attack damages enemy units and has a cooldown', () => {
    const s = createGame();
    s.players[1].gold = 1000;
    for (let i = 0; i < 5; i++) applyCommand(s, 1, spawnUnit(0));
    run(s, TICK_RATE * 8);
    const hpBefore = s.units.reduce((sum, u) => sum + u.hp, 0);
    expect(applyCommand(s, 0, special())).toBe(true);
    expect(applyCommand(s, 0, special())).toBe(false);
    run(s, TICK_RATE * 4);
    const hpAfter = s.units.reduce((sum, u) => sum + u.hp, 0);
    expect(hpAfter).toBeLessThan(hpBefore);
  });

  it('overtime decays both bases and the weaker base falls first', () => {
    const s = createGame();
    s.tick = OVERTIME_TICKS;
    s.players[1].baseHp -= 50;
    run(s, TICK_RATE * 60 * 5);
    expect(s.winner).toBe(0);
  });

  it('destroying the base ends the game', () => {
    const s = createGame();
    s.players[1].baseHp = 1;
    applyCommand(s, 0, spawnUnit(0));
    run(s, TICK_RATE * 40);
    expect(s.winner).toBe(0);
    expect(s.units[0].x).toBeLessThan(LANE_LENGTH);
  });
});

describe('determinism and validation', () => {
  it('produces identical states from identical inputs', () => {
    const play = () => {
      const s = createGame(42);
      s.players[0].gold = s.players[1].gold = 2000;
      for (let t = 0; t < TICK_RATE * 60; t++) {
        if (t % 45 === 0) applyCommand(s, 0, spawnUnit(t % 3));
        if (t % 60 === 0) applyCommand(s, 1, spawnUnit((t / 60) % 3));
        if (t === 300) applyCommand(s, 1, special());
        if (t === 100) applyCommand(s, 0, buildTurret(1));
        step(s);
      }
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
  });

  it('parses only well-formed commands', () => {
    expect(parseCommand({ type: 'spawnUnit', unit: 1 })).toEqual({ type: 'spawnUnit', unit: 1 });
    expect(parseCommand({ type: 'spawnUnit', unit: 7 })).toBeNull();
    expect(parseCommand({ type: 'buildTurret', turret: 0, slot: 9 })).toBeNull();
    expect(parseCommand({ type: 'hack' })).toBeNull();
    expect(parseCommand(null)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { AGES, TICK_RATE, applyCommand, createGame, spawnUnit, step } from '@aow/shared';
import { AiController, type Difficulty } from '../src/ai';

function simulate(a: Difficulty, b: Difficulty, maxMinutes = 20) {
  const s = createGame(7);
  const ai = [new AiController(0, a), new AiController(1, b)] as const;
  let evolved = 0;
  for (let t = 0; t < TICK_RATE * 60 * maxMinutes && s.winner === null; t++) {
    for (const id of [0, 1] as const) {
      const cmd = ai[id].update(s);
      if (cmd && applyCommand(s, id, cmd) && cmd.type === 'evolve') evolved++;
    }
    step(s);
  }
  return { state: s, evolved };
}

/** A player one age ahead buys a single heavy unit against an AI that has been playing for a while. */
function loneHeavy(enemyAge: number, seed: number) {
  const s = createGame(seed);
  for (const p of s.players) {
    p.age = enemyAge;
    p.baseHp = p.baseMaxHp = AGES[enemyAge].baseHp;
  }
  const ai = new AiController(1, 'normal');
  for (let t = 0; t < TICK_RATE * 30; t++) {
    const c = ai.update(s);
    if (c) applyCommand(s, 1, c);
    step(s);
  }
  const p0 = s.players[0];
  p0.age = enemyAge + 1;
  p0.gold = AGES[p0.age].units[2].cost;
  applyCommand(s, 0, spawnUnit(2));
  for (let t = 0; t < TICK_RATE * 180 && s.winner === null; t++) {
    const c = ai.update(s);
    if (c) applyCommand(s, 1, c);
    step(s);
    if (t > TICK_RATE * 10 && !s.units.some((u) => u.owner === 0)) break;
  }
  return s.players[1].baseHp / s.players[1].baseMaxHp;
}

describe('AI', () => {
  it('cannot be beaten by a single heavy unit from the next age', () => {
    for (const enemyAge of [0, 1]) {
      for (const seed of [1, 2, 3]) expect(loneHeavy(enemyAge, seed)).toBeGreaterThan(0.75);
    }
  });

  it('hard AI beats easy AI', () => {
    let hardWins = 0;
    for (let i = 0; i < 3; i++) if (simulate('hard', 'easy').state.winner === 0) hardWins++;
    expect(hardWins).toBeGreaterThanOrEqual(2);
  });

  it('evenly matched AIs play a full game that always ends, evolving along the way', () => {
    const { state, evolved } = simulate('normal', 'normal', 20);
    expect(state.tick).toBeGreaterThan(TICK_RATE * 60);
    expect(state.winner).not.toBeNull();
    expect(evolved).toBeGreaterThan(1);
  });
});

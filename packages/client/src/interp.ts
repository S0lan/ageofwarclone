import type { GameState } from '@aow/shared';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Returns `next` with entity positions blended from `prev` by `t` (0..1).
 * Entities that only exist in `next` are drawn at their `next` position.
 */
export function interpolate(prev: GameState, next: GameState, t: number): GameState {
  if (t >= 1 || prev === next) return next;
  const prevUnits = new Map(prev.units.map((u) => [u.id, u]));
  const prevProj = new Map(prev.projectiles.map((p) => [p.id, p]));
  const prevMet = new Map(prev.meteors.map((m) => [m.id, m]));

  return {
    ...next,
    units: next.units.map((u) => {
      const p = prevUnits.get(u.id);
      return p ? { ...u, x: lerp(p.x, u.x, t) } : u;
    }),
    projectiles: next.projectiles.map((pr) => {
      const p = prevProj.get(pr.id);
      return p ? { ...pr, x: lerp(p.x, pr.x, t), y: lerp(p.y, pr.y, t) } : pr;
    }),
    meteors: next.meteors.map((m) => {
      const p = prevMet.get(m.id);
      return p ? { ...m, y: lerp(p.y, m.y, t) } : m;
    }),
  };
}

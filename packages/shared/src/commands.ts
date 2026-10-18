import { TURRET_SLOTS } from './constants';

export type Command =
  | { type: 'spawnUnit'; unit: number }
  | { type: 'buildTurret'; turret: number; slot?: number }
  | { type: 'sellTurret'; slot: number }
  | { type: 'evolve' }
  | { type: 'special' };

export const spawnUnit = (unit: number): Command => ({ type: 'spawnUnit', unit });
export const buildTurret = (turret: number, slot?: number): Command => ({ type: 'buildTurret', turret, slot });
export const sellTurret = (slot: number): Command => ({ type: 'sellTurret', slot });
export const evolve = (): Command => ({ type: 'evolve' });
export const special = (): Command => ({ type: 'special' });

const isIndex = (v: unknown, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < max;

/** Narrows untrusted input (e.g. from the network) to a well-formed Command. */
export function parseCommand(raw: unknown): Command | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  switch (c.type) {
    case 'spawnUnit':
      return isIndex(c.unit, 3) ? { type: 'spawnUnit', unit: c.unit } : null;
    case 'buildTurret':
      if (!isIndex(c.turret, 2)) return null;
      if (c.slot !== undefined && !isIndex(c.slot, TURRET_SLOTS)) return null;
      return { type: 'buildTurret', turret: c.turret, slot: c.slot as number | undefined };
    case 'sellTurret':
      return isIndex(c.slot, TURRET_SLOTS) ? { type: 'sellTurret', slot: c.slot } : null;
    case 'evolve':
      return { type: 'evolve' };
    case 'special':
      return { type: 'special' };
    default:
      return null;
  }
}

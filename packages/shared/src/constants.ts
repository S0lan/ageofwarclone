export const TICK_RATE = 30;
export const DT = 1 / TICK_RATE;

export const LANE_LENGTH = 1000;
export const BASE_WIDTH = 70;
export const UNIT_SPACING = 4;

export const START_GOLD = 175;

export const MAX_QUEUE = 5;
export const TURRET_SLOTS = 3;
export const TURRET_SELL_REFUND = 0.5;

/** When the overtime option is on, both bases start decaying after this many ticks. */
export const OVERTIME_TICKS = TICK_RATE * 60 * 12;
/** Fraction of max base HP lost per second during overtime. */
export const OVERTIME_DECAY = 0.005;

export const SNAPSHOT_RATE = 20;

/** Special attack cooldown, chosen in Game settings. The age data still describes the attack itself. */
export const SPECIAL_COOLDOWN_MIN = 30;
export const SPECIAL_COOLDOWN_MAX = 180;
export const SPECIAL_COOLDOWN_DEFAULT = 60;

export function clampSpecialCooldown(value: unknown): number {
  const n = typeof value === 'number' ? value : SPECIAL_COOLDOWN_DEFAULT;
  if (!Number.isFinite(n)) return SPECIAL_COOLDOWN_DEFAULT;
  return Math.min(SPECIAL_COOLDOWN_MAX, Math.max(SPECIAL_COOLDOWN_MIN, Math.round(n)));
}

export function secondsToTicks(seconds: number): number {
  return Math.max(1, Math.round(seconds * TICK_RATE));
}

export type UnitRole = 'melee' | 'ranged' | 'tank';

export interface ProjectileStyle {
  speed: number;
  color: string;
}

export interface UnitDef {
  id: string;
  name: string;
  role: UnitRole;
  cost: number;
  hp: number;
  damage: number;
  /** Edge-to-edge attack distance in world units. */
  range: number;
  /** Seconds between attacks. */
  attackCooldown: number;
  /** World units per second. */
  speed: number;
  /** Seconds in the spawn queue. */
  trainTime: number;
  goldReward: number;
  xpReward: number;
  size: number;
  color: string;
  /** Present for units that fire projectiles instead of hitting instantly. */
  projectile?: ProjectileStyle;
}

export interface TurretDef {
  id: string;
  name: string;
  cost: number;
  damage: number;
  range: number;
  cooldown: number;
  projectileSpeed: number;
  /** Radius of area damage on impact; 0 for single target. */
  splash: number;
  color: string;
}

export interface SpecialDef {
  name: string;
  cooldown: number;
  count: number;
  damage: number;
  radius: number;
  /** Seconds over which the projectiles start falling. */
  duration: number;
  color: string;
}

export interface AgeDef {
  name: string;
  /** XP spent to advance from this age to the next. */
  xpToEvolve: number;
  baseHp: number;
  /** Passive gold per second. Kill rewards are below unit cost, so this is what keeps the economy going. */
  income: number;
  baseColor: string;
  skyColor: string;
  groundColor: string;
  units: [UnitDef, UnitDef, UnitDef];
  turrets: [TurretDef, TurretDef];
  special: SpecialDef;
}

export const AGES: AgeDef[] = [
  {
    name: 'Stone Age',
    xpToEvolve: 1000,
    baseHp: 500,
    income: 3,
    baseColor: '#8b6b4a',
    skyColor: '#9fd3f0',
    groundColor: '#6b8e3d',
    units: [
      {
        id: 'clubman', name: 'Clubman', role: 'melee', cost: 15, hp: 55, damage: 16, range: 6,
        attackCooldown: 1.0, speed: 40, trainTime: 1.0, goldReward: 12, xpReward: 40, size: 20, color: '#c58a4b',
      },
      {
        id: 'slingshot', name: 'Slingshot', role: 'ranged', cost: 25, hp: 42, damage: 10, range: 130,
        attackCooldown: 1.2, speed: 40, trainTime: 1.3, goldReward: 20, xpReward: 60, size: 18, color: '#d9b36c',
        projectile: { speed: 320, color: '#777' },
      },
      {
        id: 'dino', name: 'Dino Rider', role: 'tank', cost: 100, hp: 160, damage: 40, range: 8,
        attackCooldown: 1.4, speed: 35, trainTime: 3.0, goldReward: 80, xpReward: 180, size: 34, color: '#4f9a4a',
      },
    ],
    turrets: [
      {
        id: 'rockslinger', name: 'Rock Slinger', cost: 100, damage: 12, range: 260, cooldown: 1.0,
        projectileSpeed: 380, splash: 0, color: '#8a8a8a',
      },
      {
        id: 'eggauto', name: 'Egg Automatic', cost: 200, damage: 8, range: 260, cooldown: 0.4,
        projectileSpeed: 420, splash: 0, color: '#f3e9c6',
      },
    ],
    special: { name: 'Meteor Shower', cooldown: 60, count: 15, damage: 60, radius: 30, duration: 3, color: '#ff7a1a' },
  },
  {
    name: 'Medieval Age',
    xpToEvolve: 3000,
    baseHp: 800,
    income: 7,
    baseColor: '#7a7a85',
    skyColor: '#b5c9e0',
    groundColor: '#5f7d3a',
    units: [
      {
        id: 'swordsman', name: 'Swordsman', role: 'melee', cost: 50, hp: 120, damage: 40, range: 6,
        attackCooldown: 1.0, speed: 42, trainTime: 1.2, goldReward: 40, xpReward: 80, size: 22, color: '#b0b8c8',
      },
      {
        id: 'archer', name: 'Archer', role: 'ranged', cost: 75, hp: 100, damage: 25, range: 160,
        attackCooldown: 1.2, speed: 40, trainTime: 1.5, goldReward: 60, xpReward: 120, size: 20, color: '#3e7a3e',
        projectile: { speed: 420, color: '#5a3a1a' },
      },
      {
        id: 'knight', name: 'Knight', role: 'tank', cost: 350, hp: 380, damage: 45, range: 10,
        attackCooldown: 1.4, speed: 40, trainTime: 3.5, goldReward: 280, xpReward: 400, size: 36, color: '#d4d4e0',
      },
    ],
    turrets: [
      {
        id: 'catapult', name: 'Catapult', cost: 500, damage: 45, range: 320, cooldown: 2.0,
        projectileSpeed: 300, splash: 40, color: '#6b4a2a',
      },
      {
        id: 'firearcher', name: 'Fire Archer', cost: 750, damage: 20, range: 300, cooldown: 0.6,
        projectileSpeed: 480, splash: 0, color: '#e2541b',
      },
    ],
    special: { name: 'Arrow Rain', cooldown: 60, count: 30, damage: 40, radius: 15, duration: 3, color: '#5a3a1a' },
  },
  {
    name: 'Modern Age',
    xpToEvolve: Infinity,
    baseHp: 1200,
    income: 15,
    baseColor: '#4a5560',
    skyColor: '#c9d3db',
    groundColor: '#6d6a5c',
    units: [
      {
        id: 'infantry', name: 'Infantry', role: 'melee', cost: 150, hp: 300, damage: 68, range: 8,
        attackCooldown: 0.9, speed: 45, trainTime: 1.5, goldReward: 120, xpReward: 200, size: 22, color: '#5d6b3a',
      },
      {
        id: 'gunner', name: 'Machine Gunner', role: 'ranged', cost: 250, hp: 200, damage: 18, range: 170,
        attackCooldown: 0.3, speed: 42, trainTime: 2.0, goldReward: 200, xpReward: 300, size: 22, color: '#3b4a2a',
        projectile: { speed: 700, color: '#ffd23a' },
      },
      {
        id: 'tank', name: 'Tank', role: 'tank', cost: 900, hp: 900, damage: 100, range: 30,
        attackCooldown: 1.6, speed: 36, trainTime: 4.0, goldReward: 720, xpReward: 900, size: 44, color: '#4b5a3a',
      },
    ],
    turrets: [
      {
        id: 'cannon', name: 'Cannon', cost: 1500, damage: 80, range: 340, cooldown: 1.5,
        projectileSpeed: 450, splash: 35, color: '#2e2e2e',
      },
      {
        id: 'mgnest', name: 'MG Nest', cost: 2000, damage: 15, range: 320, cooldown: 0.15,
        projectileSpeed: 800, splash: 0, color: '#ffd23a',
      },
    ],
    special: { name: 'Air Strike', cooldown: 60, count: 12, damage: 200, radius: 45, duration: 2.5, color: '#333' },
  },
];

export interface UnitDefWithAge extends UnitDef {
  age: number;
}

export interface TurretDefWithAge extends TurretDef {
  age: number;
}

export const UNIT_DEFS: Record<string, UnitDefWithAge> = {};
export const TURRET_DEFS: Record<string, TurretDefWithAge> = {};

AGES.forEach((age, i) => {
  for (const u of age.units) UNIT_DEFS[u.id] = { ...u, age: i };
  for (const t of age.turrets) TURRET_DEFS[t.id] = { ...t, age: i };
});

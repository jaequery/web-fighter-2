import type { MoveDef, MoveId } from "../types";

// The shared "shoto" move set Ryu and Ken are both built from. Frame data is
// an approximation of the arcade original, tuned for a 60 fps simulation.
export const SHOTO_MOVES: Record<MoveId, MoveDef> = {
  lp: { anim: "jab", startup: 3, active: 3, recovery: 6, damage: 4, hitstun: 12, blockstun: 8, hitbox: { x: 0.7, y: 1.38, w: 0.5, h: 0.24 } },
  hp: { anim: "strong", startup: 6, active: 4, recovery: 16, damage: 12, hitstun: 18, blockstun: 14, heavy: true, hitbox: { x: 0.8, y: 1.38, w: 0.6, h: 0.3 } },
  lk: { anim: "short", startup: 4, active: 3, recovery: 9, damage: 5, hitstun: 12, blockstun: 8, hitbox: { x: 0.8, y: 0.75, w: 0.55, h: 0.3 } },
  hk: { anim: "roundhouse", startup: 8, active: 4, recovery: 18, damage: 13, hitstun: 18, blockstun: 14, heavy: true, hitbox: { x: 0.95, y: 1.35, w: 0.7, h: 0.4 } },

  cLp: { anim: "cJab", startup: 3, active: 3, recovery: 6, damage: 4, hitstun: 11, blockstun: 8, hitbox: { x: 0.7, y: 0.95, w: 0.5, h: 0.24 } },
  cHp: { anim: "cStrong", startup: 5, active: 5, recovery: 18, damage: 11, hitstun: 18, blockstun: 14, heavy: true, hitbox: { x: 0.45, y: 1.55, w: 0.55, h: 0.9 } },
  cLk: { anim: "cShort", startup: 4, active: 3, recovery: 8, damage: 4, hitstun: 11, blockstun: 8, low: true, hitbox: { x: 0.8, y: 0.15, w: 0.6, h: 0.3 } },
  cHk: { anim: "sweep", startup: 7, active: 4, recovery: 22, damage: 11, hitstun: 0, blockstun: 14, low: true, heavy: true, knockdown: true, hitbox: { x: 0.95, y: 0.15, w: 0.75, h: 0.3 } },

  jLp: { anim: "jPunch", startup: 3, active: 14, recovery: 0, damage: 5, hitstun: 12, blockstun: 8, air: true, hitbox: { x: 0.55, y: 0.75, w: 0.5, h: 0.45 } },
  jHp: { anim: "jPunch", startup: 5, active: 7, recovery: 0, damage: 11, hitstun: 18, blockstun: 14, air: true, heavy: true, hitbox: { x: 0.6, y: 0.7, w: 0.6, h: 0.5 } },
  jLk: { anim: "jKick", startup: 4, active: 14, recovery: 0, damage: 6, hitstun: 12, blockstun: 8, air: true, hitbox: { x: 0.6, y: 0.4, w: 0.6, h: 0.45 } },
  jHk: { anim: "jKick", startup: 6, active: 8, recovery: 0, damage: 12, hitstun: 18, blockstun: 14, air: true, heavy: true, hitbox: { x: 0.7, y: 0.4, w: 0.7, h: 0.5 } },

  hadokenL: { anim: "hadoken", startup: 12, active: 1, recovery: 34, damage: 0, hitstun: 0, blockstun: 0, hitbox: { x: 0, y: 0, w: 0, h: 0 }, projectile: { frame: 12, speed: 0.075, damage: 10 } },
  hadokenH: { anim: "hadoken", startup: 12, active: 1, recovery: 34, damage: 0, hitstun: 0, blockstun: 0, hitbox: { x: 0, y: 0, w: 0, h: 0 }, projectile: { frame: 12, speed: 0.11, damage: 10 } },

  shoryukenL: { anim: "shoryuken", startup: 3, active: 10, recovery: 30, damage: 12, chip: 2, hitstun: 0, blockstun: 16, heavy: true, knockdown: true, invuln: [0, 6], impulse: { frame: 3, vx: 0.035, vy: 0.19 }, landingLag: 12, hitbox: { x: 0.45, y: 1.6, w: 0.55, h: 1.0 } },
  shoryukenH: { anim: "shoryuken", startup: 3, active: 14, recovery: 36, damage: 16, chip: 3, hitstun: 0, blockstun: 18, heavy: true, knockdown: true, invuln: [0, 9], impulse: { frame: 3, vx: 0.045, vy: 0.235 }, landingLag: 16, hitbox: { x: 0.45, y: 1.6, w: 0.55, h: 1.0 } },

  tatsuL: { anim: "tatsu", startup: 8, active: 28, recovery: 10, damage: 5, chip: 1, hitstun: 0, blockstun: 12, heavy: true, knockdown: true, hits: 2, hitInterval: 14, impulse: { frame: 6, vx: 0, vy: 0.11 }, float: { from: 14, to: 36, vx: 0.055 }, landingLag: 8, hitbox: { x: 0.55, y: 0.9, w: 1.3, h: 0.5 } },
  tatsuH: { anim: "tatsu", startup: 8, active: 36, recovery: 10, damage: 5, chip: 1, hitstun: 0, blockstun: 12, heavy: true, knockdown: true, hits: 3, hitInterval: 12, impulse: { frame: 6, vx: 0, vy: 0.11 }, float: { from: 14, to: 44, vx: 0.07 }, landingLag: 10, hitbox: { x: 0.55, y: 0.9, w: 1.3, h: 0.5 } },

  throw: { anim: "throw", startup: 2, active: 1, recovery: 28, damage: 14, hitstun: 0, blockstun: 0, knockdown: true, heavy: true, hitbox: { x: 0, y: 0, w: 0, h: 0 } },
};

export function withOverrides(overrides: Partial<Record<MoveId, Partial<MoveDef>>>): Record<MoveId, MoveDef> {
  const moves = { ...SHOTO_MOVES };
  for (const id of Object.keys(overrides) as MoveId[]) {
    moves[id] = { ...SHOTO_MOVES[id], ...overrides[id] };
  }
  return moves;
}

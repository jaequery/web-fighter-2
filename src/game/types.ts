// Shared simulation types. The simulation runs at a fixed 60 steps per second
// and works in world units where a standing fighter is about 1.8 tall.

export type PlayerIndex = 0 | 1;
export type Facing = 1 | -1;

export interface InputFrame {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  lp: boolean;
  hp: boolean;
  lk: boolean;
  hk: boolean;
}

export type Button = "lp" | "hp" | "lk" | "hk";

export const EMPTY_INPUT: InputFrame = {
  left: false,
  right: false,
  up: false,
  down: false,
  lp: false,
  hp: false,
  lk: false,
  hk: false,
};

/** Axis-aligned box in world space: centre x/y, full width/height. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AnimId =
  | "jab"
  | "strong"
  | "short"
  | "roundhouse"
  | "cJab"
  | "cStrong"
  | "cShort"
  | "sweep"
  | "jPunch"
  | "jKick"
  | "hadoken"
  | "shoryuken"
  | "tatsu"
  | "throw";

export type MoveId =
  | "lp"
  | "hp"
  | "lk"
  | "hk"
  | "cLp"
  | "cHp"
  | "cLk"
  | "cHk"
  | "jLp"
  | "jHp"
  | "jLk"
  | "jHk"
  | "hadokenL"
  | "hadokenH"
  | "shoryukenL"
  | "shoryukenH"
  | "tatsuL"
  | "tatsuH"
  | "throw";

export interface MoveDef {
  anim: AnimId;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  /** Damage taken through a block (specials only). */
  chip?: number;
  hitstun: number;
  blockstun: number;
  /** Relative to the fighter: x is forward distance of the box centre, y its height. */
  hitbox: Box;
  /** Low attacks must be blocked crouching. */
  low?: boolean;
  heavy?: boolean;
  knockdown?: boolean;
  /** Number of times the move can hit, spaced by hitInterval frames. */
  hits?: number;
  hitInterval?: number;
  /** Air normals: active until landing. */
  air?: boolean;
  /** Frames (from move start) during which the fighter can't be hit. */
  invuln?: [number, number];
  /** One-off velocity change at a frame (vx is forward). */
  impulse?: { frame: number; vx: number; vy: number };
  /** Frames during which gravity is off and the fighter drifts forward. */
  float?: { from: number; to: number; vx: number };
  projectile?: { frame: number; speed: number; damage: number };
  /** Frames stuck on the ground after an airborne special lands. */
  landingLag?: number;
}

export interface FighterColors {
  gi: number;
  giShade: number;
  belt: number;
  skin: number;
  hair: number;
  headband?: number;
  gloves: number;
}

export interface FighterDef {
  id: string;
  name: string;
  walkSpeed: number;
  backSpeed: number;
  jumpVelocity: number;
  jumpForward: number;
  colors: FighterColors;
  /** Palette used when both players pick the same fighter. */
  altColors: FighterColors;
  moves: Record<MoveId, MoveDef>;
  /** Victory pose flavour. */
  victory: "fist" | "thumbsUp";
  quote: string;
}

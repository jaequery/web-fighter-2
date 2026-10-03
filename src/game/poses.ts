import type { Fighter } from "./fighter";
import type { AnimId } from "./types";

// Joint angles in radians for a fighter facing +x. Positive shoulder/hip
// values swing a limb forward; negative knee values bend the shin back;
// positive elbow values bend the forearm forward/up; negative lean tips the
// torso forward. "l" is the lead (far-side) limb, "r" the rear one.
export interface Pose {
  lean: number;
  head: number;
  lSh: number;
  lEl: number;
  rSh: number;
  rEl: number;
  lHip: number;
  lKnee: number;
  rHip: number;
  rKnee: number;
  /** Whole-body tilt around the hips (positive falls backwards). */
  bodyRot: number;
  /** Turn around the vertical axis. */
  spin: number;
  /** Hip height when the pose isn't planted on its feet. */
  hipY: number;
  /** 1 = keep the lowest foot on the floor; 0 = use hipY. */
  plant: number;
}

const BASE: Pose = {
  lean: 0, head: 0, lSh: 0, lEl: 0, rSh: 0, rEl: 0, lHip: 0, lKnee: 0, rHip: 0, rKnee: 0,
  bodyRot: 0, spin: 0, hipY: 0.75, plant: 1,
};

const pose = (p: Partial<Pose>, from: Pose = BASE): Pose => ({ ...from, ...p });

const STANCE = pose({ lean: -0.08, head: 0.05, lSh: 1.0, lEl: 1.55, rSh: 0.55, rEl: 2.0, lHip: 0.45, lKnee: -0.5, rHip: -0.35, rKnee: -0.25 });
const CROUCH = pose({ lean: -0.3, head: 0.25, lSh: 1.1, lEl: 1.4, rSh: 0.7, rEl: 1.9, lHip: 1.45, lKnee: -2.1, rHip: 0.55, rKnee: -2.3 });
const JUMP = pose({ lean: -0.1, lSh: 0.8, lEl: 1.6, rSh: 0.4, rEl: 1.8, lHip: 1.4, lKnee: -2.3, rHip: 0.9, rKnee: -2.1, plant: 0, hipY: 0.65 });
const SQUAT = pose({ lean: -0.15, lSh: 0.9, lEl: 1.5, rSh: 0.5, rEl: 1.9, lHip: 0.9, lKnee: -1.3, rHip: 0.1, rKnee: -1.1 });
const BLOCK = pose({ lean: 0.12, head: -0.1, lSh: 1.25, lEl: 2.45, rSh: 0.95, rEl: 2.55, lHip: 0.3, lKnee: -0.4, rHip: -0.45, rKnee: -0.2 });
const CROUCH_BLOCK = pose({ lSh: 1.35, lEl: 2.4, rSh: 1.1, rEl: 2.5, lean: -0.15 }, CROUCH);
const HIT = pose({ lean: 0.45, head: 0.45, lSh: -0.3, lEl: 0.8, rSh: -0.6, rEl: 0.6, lHip: 0.2, lKnee: -0.3, rHip: -0.5, rKnee: -0.3 });
const CROUCH_HIT = pose({ lean: 0.25, head: 0.45, lSh: -0.2, lEl: 0.8, rSh: -0.4, rEl: 0.6 }, CROUCH);
const AIR_HIT = pose({ bodyRot: 0.9, lean: 0.2, head: 0.4, lSh: -1.1, lEl: 0.4, rSh: -0.7, rEl: 0.3, lHip: 0.7, lKnee: -0.8, rHip: 0.2, rKnee: -0.4, plant: 0, hipY: 0.6 });
const DOWN = pose({ bodyRot: 1.5, head: -0.2, lSh: 2.6, lEl: 0.2, rSh: 2.2, rEl: 0.3, lHip: 0.25, lKnee: -0.25, rHip: 0.1, rKnee: -0.5, plant: 0, hipY: 0.14 });
const LOSE = pose({ lean: -0.45, head: -0.5, lSh: 0.15, lEl: 0.3, rSh: -0.1, rEl: 0.3, lHip: 0.3, lKnee: -0.5, rHip: -0.2, rKnee: -0.3 });
const VICTORY_FIST = pose({ lean: 0.05, head: 0.1, lSh: 0.3, lEl: 1.2, rSh: 3.05, rEl: 0.15, lHip: 0.2, lKnee: -0.05, rHip: -0.2, rKnee: 0 });
const VICTORY_THUMB = pose({ lean: 0.1, head: 0.15, lSh: 1.4, lEl: 1.7, rSh: 0.1, rEl: 0.4, lHip: 0.25, lKnee: -0.1, rHip: -0.25, rKnee: 0, spin: 0.5 });

const STRIKES: Record<AnimId, Partial<Pose>> = {
  jab: { lSh: 1.62, lEl: 0.05, lean: -0.15, rSh: 0.5, rEl: 2.1 },
  strong: { rSh: 1.62, rEl: 0.0, lSh: 0.5, lEl: 2.0, lean: -0.3, spin: -0.45, lHip: 0.6, lKnee: -0.6 },
  short: { lHip: 1.4, lKnee: -0.25, rHip: -0.2, rKnee: -0.1, lean: 0.25, lSh: 0.7, lEl: 1.8 },
  roundhouse: { rHip: 1.95, rKnee: -0.1, lHip: -0.15, lKnee: -0.1, lean: 0.5, spin: 0.7, rSh: -0.2, rEl: 1.2 },
  cJab: { lSh: 1.62, lEl: 0.05 },
  cStrong: { rSh: 2.95, rEl: 0.2, lean: 0.05, lHip: 1.2, lKnee: -1.6, rHip: 0.3, rKnee: -1.4 },
  cShort: { lHip: 1.6, lKnee: -0.15, lean: 0.1 },
  sweep: { rHip: 1.6, rKnee: -0.05, lean: 0.55, spin: 0.5, rSh: 0.2, rEl: 1.0 },
  jPunch: { lSh: 1.1, lEl: 0.1, lean: -0.2 },
  jKick: { lHip: 1.35, lKnee: -0.15, rHip: 0.3, rKnee: -1.9, lean: 0.25 },
  hadoken: { lSh: 1.6, lEl: 0, rSh: 1.52, rEl: 0.08, lean: -0.22, lHip: 0.75, lKnee: -0.55, rHip: -0.6, rKnee: -0.1 },
  shoryuken: { rSh: 3.05, rEl: 0.05, lSh: 0.4, lEl: 1.8, lHip: 1.1, lKnee: -1.7, rHip: -0.1, rKnee: -0.3, lean: 0.05, plant: 0, hipY: 0.92 },
  tatsu: { lHip: 0.5, lKnee: -1.9, rHip: 1.57, rKnee: 0, lSh: 1.2, lEl: 0.4, rSh: 1.0, rEl: 0.5, lean: 0.1, plant: 0, hipY: 0.9 },
  throw: { lSh: 1.45, lEl: 0.5, rSh: 1.35, rEl: 0.6, lean: -0.2 },
};

const WINDUPS: Partial<Record<AnimId, Partial<Pose>>> = {
  hadoken: { lSh: -0.55, lEl: 1.7, rSh: -0.55, rEl: 1.7, lean: 0.12, lHip: 0.7, lKnee: -0.7, rHip: -0.6, rKnee: -0.2, spin: 0.4 },
  shoryuken: { rSh: 0.2, rEl: 2.0, lHip: 1.0, lKnee: -1.4, rHip: 0.2, rKnee: -1.2, lean: -0.3 },
  throw: { lSh: 1.1, lEl: 1.4, rSh: 1.0, rEl: 1.5 },
};

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of Object.keys(a) as (keyof Pose)[]) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function walkPose(phase: number): Pose {
  const s = Math.sin(phase);
  return pose({
    lHip: 0.45 + 0.4 * s,
    lKnee: -0.5 - 0.4 * Math.max(0, Math.cos(phase)),
    rHip: -0.35 - 0.4 * s,
    rKnee: -0.25 - 0.4 * Math.max(0, -Math.cos(phase)),
    lean: -0.12,
  }, STANCE);
}

/** Work out the pose to draw a fighter in, from its simulation state. */
export function poseFor(f: Fighter, time: number): Pose {
  const breathe = Math.sin(time * 3 + f.index) * 0.04;
  const stance = pose({ lEl: STANCE.lEl + breathe, rEl: STANCE.rEl - breathe, lKnee: STANCE.lKnee - breathe, rKnee: STANCE.rKnee - breathe * 0.5 }, STANCE);
  const airborne = f.y > 0.05;

  switch (f.state) {
    case "idle":
      return stance;
    case "walk":
      return walkPose(f.x * 9 * f.facing);
    case "crouch":
      return CROUCH;
    case "guard":
      return f.crouching ? CROUCH_BLOCK : BLOCK;
    case "jumpSquat":
    case "landing":
      return SQUAT;
    case "jump":
      return f.move ? strikePose(f, JUMP) : JUMP;
    case "attack": {
      const base = f.crouching ? CROUCH : airborne ? JUMP : stance;
      return strikePose(f, base);
    }
    case "hitstun": {
      const t = clamp01(f.stun / 8);
      return lerpPose(f.crouching ? CROUCH : stance, f.crouching ? CROUCH_HIT : HIT, ease(t));
    }
    case "blockstun":
      return f.crouching ? CROUCH_BLOCK : BLOCK;
    case "airborneHit":
      return pose({ bodyRot: AIR_HIT.bodyRot + Math.max(0, -f.vy) * 4 }, AIR_HIT);
    case "down":
      return DOWN;
    case "getup":
      return lerpPose(DOWN, CROUCH, ease(clamp01(f.stateFrame / 16)));
    case "thrown":
      return pose({ bodyRot: f.stateFrame * 0.22 }, AIR_HIT);
    case "ko":
      return airborne ? pose({ bodyRot: AIR_HIT.bodyRot + Math.max(0, -f.vy) * 4 }, AIR_HIT) : DOWN;
    case "victory":
      return lerpPose(stance, f.def.victory === "fist" ? VICTORY_FIST : VICTORY_THUMB, ease(clamp01(f.stateFrame / 20)));
    case "lose":
      return lerpPose(stance, LOSE, ease(clamp01(f.stateFrame / 30)));
  }
}

function strikePose(f: Fighter, base: Pose): Pose {
  const m = f.move!;
  const strike = pose(STRIKES[m.anim], base);
  const frame = f.moveFrame;
  const s = Math.max(1, m.startup);

  if (m.anim === "tatsu") {
    const p = frame < s ? lerpPose(base, strike, ease(frame / s)) : strike;
    const spinning = frame >= s && frame < m.startup + m.active;
    return pose({ spin: spinning ? (frame - s) * 0.55 : 0 }, p);
  }

  const windup = WINDUPS[m.anim];
  if (frame < s) {
    if (windup) {
      const w = pose(windup, base);
      const t = frame / s;
      return t < 0.6 ? lerpPose(base, w, ease(t / 0.6)) : lerpPose(w, strike, ease((t - 0.6) / 0.4));
    }
    return lerpPose(base, strike, ease(frame / s));
  }
  if (frame < m.startup + m.active || m.air) return strike;
  if (m.anim === "shoryuken" && f.y > 0.05) {
    return lerpPose(strike, JUMP, ease(clamp01((frame - m.startup - m.active) / 12)));
  }
  const back = (frame - m.startup - m.active) / Math.max(1, m.recovery);
  return lerpPose(strike, base, ease(clamp01(back)));
}

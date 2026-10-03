import type { Match } from "./match";
import { EMPTY_INPUT, type Button, type InputFrame, type PlayerIndex } from "./types";

/** An input written relative to the fighter: fwd/back instead of left/right. */
interface RelInput {
  fwd?: boolean;
  back?: boolean;
  up?: boolean;
  down?: boolean;
  press?: Button;
}

interface Step {
  input: RelInput;
  frames: number;
}

const HADOKEN = (b: Button): Step[] => [
  { input: { down: true }, frames: 2 },
  { input: { down: true, fwd: true }, frames: 2 },
  { input: { fwd: true }, frames: 1 },
  { input: { fwd: true, press: b }, frames: 2 },
  { input: {}, frames: 20 },
];
const SHORYUKEN = (b: Button): Step[] => [
  { input: { fwd: true }, frames: 2 },
  { input: { down: true }, frames: 2 },
  { input: { down: true, fwd: true, press: b }, frames: 2 },
  { input: {}, frames: 30 },
];
const TATSU = (b: Button): Step[] => [
  { input: { down: true }, frames: 2 },
  { input: { down: true, back: true }, frames: 2 },
  { input: { back: true, press: b }, frames: 2 },
  { input: {}, frames: 30 },
];
const PRESS = (b: Button, extra: RelInput = {}): Step[] => [
  { input: { ...extra, press: b }, frames: 2 },
  { input: extra, frames: 10 },
];

/**
 * A simple arcade CPU: every few frames it looks at the distance to its
 * opponent and what they are doing, then queues up a short input sequence.
 */
export class CpuController {
  private queue: Step[] = [];
  private cooldown = 0;

  constructor(
    private readonly index: PlayerIndex,
    /** 0..1, how often the CPU reacts well. */
    private readonly skill = 0.6,
  ) {}

  think(match: Match): InputFrame {
    const me = match.fighters[this.index];
    if (match.phase !== "fight") {
      this.queue = [];
      return EMPTY_INPUT;
    }

    if (this.queue.length === 0 && --this.cooldown <= 0) {
      this.decide(match);
    }

    const step = this.queue[0];
    if (!step) return EMPTY_INPUT;
    step.frames--;
    if (step.frames <= 0) this.queue.shift();

    const rel = step.input;
    const facing = me.facing;
    // Buttons are edge-triggered, so a press is only held on its first frame.
    const pressNow = rel.press && step.frames >= 1;
    return {
      left: (rel.fwd && facing === -1) || (rel.back && facing === 1) || false,
      right: (rel.fwd && facing === 1) || (rel.back && facing === -1) || false,
      up: !!rel.up,
      down: !!rel.down,
      lp: pressNow ? rel.press === "lp" : false,
      hp: pressNow ? rel.press === "hp" : false,
      lk: pressNow ? rel.press === "lk" : false,
      hk: pressNow ? rel.press === "hk" : false,
    };
  }

  private plan(steps: Step[], cooldown = 6) {
    this.queue = steps.map((s) => ({ ...s }));
    this.cooldown = cooldown;
  }

  private decide(match: Match) {
    const me = match.fighters[this.index];
    const opp = match.fighters[1 - this.index];
    const r = Math.random();
    const smart = Math.random() < this.skill;
    const dist = Math.abs(opp.x - me.x);
    this.cooldown = 4 + Math.floor(Math.random() * 8);

    if (!me.neutral) return;

    const incoming = match.projectiles.find(
      (p) => p.owner !== this.index && Math.abs(p.x - me.x) < 2.8 && Math.sign(me.x - p.x) === Math.sign(p.vx),
    );
    if (incoming && smart) {
      if (r < 0.35 && dist < 4) return this.plan([{ input: { up: true, fwd: true }, frames: 4 }, { input: {}, frames: 14 }, ...PRESS("hk")]);
      if (r < 0.55 && !match.projectiles.some((p) => p.owner === this.index)) return this.plan(HADOKEN("hp"));
      return this.plan([{ input: { back: true }, frames: 24 }]);
    }

    const oppAirborne = opp.state === "jump" || (opp.state === "attack" && opp.y > 0.3);
    if (oppAirborne && dist < 2.4 && Math.sign(opp.vx || -me.facing) !== Math.sign(opp.x - me.x)) {
      if (smart && r < 0.5) return this.plan(SHORYUKEN("hp"));
      if (smart && r < 0.8) return this.plan(PRESS("hp", { down: true }));
      return this.plan([{ input: { back: true }, frames: 20 }]);
    }

    if (opp.attacking && dist < 2.4 && smart) {
      const low = !!opp.move?.low;
      return this.plan([{ input: { back: true, down: low }, frames: 16 }]);
    }

    if (dist > 3.6) {
      if (r < 0.3 && !match.projectiles.some((p) => p.owner === this.index)) return this.plan(HADOKEN(Math.random() < 0.5 ? "lp" : "hp"));
      if (r < 0.75) return this.plan([{ input: { fwd: true }, frames: 20 + Math.floor(Math.random() * 20) }]);
      if (r < 0.85) return this.plan([{ input: { up: true, fwd: true }, frames: 4 }, { input: {}, frames: 30 }]);
      return this.plan([{ input: {}, frames: 15 }]);
    }

    if (dist > 1.5) {
      if (r < 0.3) return this.plan([{ input: { fwd: true }, frames: 12 + Math.floor(Math.random() * 14) }]);
      if (r < 0.45 && !match.projectiles.some((p) => p.owner === this.index)) return this.plan(HADOKEN("lp"));
      if (r < 0.6 && dist < 2.8) {
        return this.plan([{ input: { up: true, fwd: true }, frames: 4 }, { input: {}, frames: 16 }, ...PRESS("hk")]);
      }
      if (r < 0.7) return this.plan(TATSU(Math.random() < 0.5 ? "lk" : "hk"));
      if (r < 0.85) return this.plan([{ input: { back: true }, frames: 14 }]);
      return this.plan(PRESS("hk"));
    }

    // Up close.
    if (r < 0.15 && dist < 0.95) return this.plan(PRESS("hp", { fwd: true }));
    if (r < 0.3) return this.plan(PRESS("hk", { down: true }));
    if (r < 0.45) return this.plan([...PRESS("lk", { down: true }), ...PRESS("lp", { down: true })]);
    if (r < 0.6) return this.plan(PRESS(Math.random() < 0.5 ? "hp" : "lp"));
    if (r < 0.7) return this.plan(SHORYUKEN("lp"));
    if (r < 0.85) return this.plan([{ input: { back: true, down: true }, frames: 18 }]);
    return this.plan([{ input: { back: true }, frames: 18 }]);
  }
}

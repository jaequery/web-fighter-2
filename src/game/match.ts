import {
  BODY_WIDTH,
  FPS,
  MAX_HEALTH,
  MAX_ROUNDS,
  MAX_SEPARATION,
  ROUND_TIME,
  ROUNDS_TO_WIN,
  STAGE_HALF,
} from "./constants";
import { Fighter } from "./fighter";
import { EMPTY_INPUT, type Box, type Facing, type FighterDef, type InputFrame, type PlayerIndex } from "./types";

export interface Projectile {
  owner: PlayerIndex;
  x: number;
  y: number;
  vx: number;
  damage: number;
  age: number;
  alive: boolean;
}

export interface MatchEvent {
  kind: "hit" | "block" | "clash";
  x: number;
  y: number;
  heavy: boolean;
}

export type MatchPhase = "intro" | "fight" | "roundOver" | "matchOver";

const INTRO_FRAMES = 110;
const ROUND_OVER_FRAMES = 270;
const RESULT_AT = 110;
const THROW_FRAMES = 22;

function overlaps(a: Box, b: Box) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

export class Match {
  readonly fighters: [Fighter, Fighter];
  projectiles: Projectile[] = [];
  events: MatchEvent[] = [];
  phase: MatchPhase = "intro";
  phaseFrame = 0;
  round = 1;
  wins: [number, number] = [0, 0];
  timer = ROUND_TIME;
  private timerFrames = 0;
  /** Freeze frames after a hit lands. */
  hitstop = 0;
  /** Frames of half-speed play after a KO. */
  slowmo = 0;
  private tick = 0;
  /** Round result: winner index, or null for a draw. */
  roundWinner: PlayerIndex | null = null;
  roundEnd: "ko" | "time" | null = null;
  perfect = false;
  /** Match result, set when phase is matchOver. */
  matchWinner: PlayerIndex | null = null;
  shake = 0;

  constructor(p1: FighterDef, p2: FighterDef) {
    const mirror = p1.id === p2.id;
    this.fighters = [new Fighter(p1, 0, p1.colors), new Fighter(p2, 1, mirror ? p2.altColors : p2.colors)];
    this.startRound();
  }

  private startRound() {
    this.fighters[0].reset(-1.6, 1);
    this.fighters[1].reset(1.6, -1);
    this.projectiles = [];
    this.timer = ROUND_TIME;
    this.timerFrames = 0;
    this.hitstop = 0;
    this.slowmo = 0;
    this.roundWinner = null;
    this.roundEnd = null;
    this.perfect = false;
    this.phase = "intro";
    this.phaseFrame = 0;
  }

  /** Text shown in the centre of the screen, if any. */
  get banner(): { text: string; sub?: string } | null {
    const f = this.phaseFrame;
    if (this.phase === "intro") {
      if (f < 65) return { text: this.round === MAX_ROUNDS ? "FINAL ROUND" : `ROUND ${this.round}` };
      return { text: "FIGHT!" };
    }
    if (this.phase === "roundOver" || this.phase === "matchOver") {
      if (this.phase === "roundOver" && f < RESULT_AT) {
        const both = this.fighters.every((p) => p.health <= 0);
        return { text: this.roundEnd === "time" ? "TIME OVER" : both ? "DOUBLE K.O." : "K.O." };
      }
      if (this.roundWinner === null) return { text: "DRAW" };
      const name = this.fighters[this.roundWinner].def.name.toUpperCase();
      return { text: `${name} WINS`, sub: this.perfect ? "PERFECT" : undefined };
    }
    return null;
  }

  step(inputs: [InputFrame, InputFrame]) {
    if (this.phase === "matchOver") return;
    this.tick++;
    if (this.slowmo > 0) {
      this.slowmo--;
      if (this.tick % 2 === 0) return;
    }
    this.phaseFrame++;

    const live = this.phase === "fight";
    const [a, b] = this.fighters;

    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }

    a.act(live ? inputs[0] : EMPTY_INPUT, this.context(0));
    b.act(live ? inputs[1] : EMPTY_INPUT, this.context(1));

    const prevA = a.x;
    const prevB = b.x;
    a.advance();
    b.advance();
    this.resolveThrows();
    this.resolveSpacing(prevA, prevB);
    this.spawnProjectiles();
    this.updateProjectiles();
    this.resolveHits();
    this.updateFacing();
    if (this.shake > 0) this.shake--;

    if (this.phase === "intro" && this.phaseFrame >= INTRO_FRAMES) {
      this.phase = "fight";
      this.phaseFrame = 0;
    } else if (this.phase === "fight") {
      this.tickTimer();
      this.checkRoundEnd();
    } else if (this.phase === "roundOver") {
      this.updateRoundOver();
    }
  }

  private context(i: PlayerIndex) {
    const me = this.fighters[i];
    const opp = this.fighters[1 - i];
    const dist = Math.abs(opp.x - me.x);
    const fireball = this.projectiles.some(
      (p) => p.alive && p.owner !== i && Math.abs(p.x - me.x) < 3.2 && Math.sign(me.x - p.x) === Math.sign(p.vx),
    );
    return {
      opponent: opp,
      threatened: fireball || (opp.attacking && dist < 2.6),
      ownProjectileAlive: this.projectiles.some((p) => p.alive && p.owner === i),
    };
  }

  private tickTimer() {
    if (++this.timerFrames >= FPS) {
      this.timerFrames = 0;
      this.timer = Math.max(0, this.timer - 1);
    }
  }

  private resolveThrows() {
    for (const f of this.fighters) {
      const opp = this.fighters[1 - f.index];
      if (f.moveId === "throw" && f.pendingThrow && f.moveFrame === f.move!.startup) {
        if (opp.throwable && Math.abs(opp.x - f.x) < 1.05 && f.grounded) {
          opp.endMove();
          opp.setState("thrown");
          opp.vx = 0;
          opp.vy = 0;
        } else {
          f.pendingThrow = null;
        }
      }
      if (f.moveId === "throw" && f.pendingThrow && opp.state === "thrown") {
        const t = Math.min(1, (f.moveFrame - f.move!.startup) / THROW_FRAMES);
        const side = f.pendingThrow * f.facing;
        const from = f.facing * 0.7;
        const to = side * 0.9;
        opp.x = f.x + from + (to - from) * t;
        opp.y = Math.sin(Math.PI * t) * 1.3 + 0.01;
        if (t >= 1) {
          const dir = (side >= 0 ? 1 : -1) as Facing;
          opp.y = 0.3;
          opp.receiveHit({ damage: f.move!.damage, hitstun: 0, knockdown: true, heavy: true, pushDir: dir });
          f.score += f.move!.damage * 100;
          f.pendingThrow = null;
          this.shake = 10;
          this.events.push({ kind: "hit", x: opp.x, y: 0.4, heavy: true });
        }
      }
    }
  }

  private resolveSpacing(prevA: number, prevB: number) {
    const [a, b] = this.fighters;
    const limit = STAGE_HALF - BODY_WIDTH / 2;

    // Bodies push each other unless one is jumping over the other.
    const dx = b.x - a.x;
    const verticalOverlap = Math.abs(a.y - b.y) < 1.4;
    const solid = (f: Fighter) => f.state !== "down" && f.state !== "getup" && f.state !== "thrown";
    if (Math.abs(dx) < BODY_WIDTH && verticalOverlap && solid(a) && solid(b)) {
      const push = (BODY_WIDTH - Math.abs(dx)) / 2;
      const dir = dx === 0 ? (a.facing === 1 ? 1 : -1) : Math.sign(dx);
      a.x -= dir * push;
      b.x += dir * push;
    }

    // The camera can only fit so much: stop fighters walking further apart.
    if (Math.abs(b.x - a.x) > MAX_SEPARATION) {
      const prevSep = Math.abs(prevB - prevA);
      if (Math.abs(b.x - prevA) <= Math.max(MAX_SEPARATION, prevSep)) a.x = prevA;
      else if (Math.abs(prevB - a.x) <= Math.max(MAX_SEPARATION, prevSep)) b.x = prevB;
      const sep = b.x - a.x;
      if (Math.abs(sep) > MAX_SEPARATION) {
        const excess = (Math.abs(sep) - MAX_SEPARATION) / 2;
        a.x += Math.sign(sep) * excess;
        b.x -= Math.sign(sep) * excess;
      }
    }

    for (const f of this.fighters) f.x = Math.max(-limit, Math.min(limit, f.x));
  }

  private spawnProjectiles() {
    for (const f of this.fighters) {
      if (!f.spawnProjectile) continue;
      const p = f.spawnProjectile;
      f.spawnProjectile = null;
      this.projectiles.push({
        owner: f.index,
        x: f.x + f.facing * 0.8,
        y: 1.3,
        vx: p.speed * f.facing,
        damage: p.damage,
        age: 0,
        alive: true,
      });
    }
  }

  private updateProjectiles() {
    for (const p of this.projectiles) {
      p.x += p.vx;
      p.age++;
      if (Math.abs(p.x) > STAGE_HALF + 4) p.alive = false;
    }
    // Opposing fireballs cancel out.
    const alive = this.projectiles.filter((p) => p.alive);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const p = alive[i];
        const q = alive[j];
        if (p.owner !== q.owner && p.alive && q.alive && Math.abs(p.x - q.x) < 0.5) {
          p.alive = q.alive = false;
          this.events.push({ kind: "clash", x: (p.x + q.x) / 2, y: p.y, heavy: true });
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  private resolveHits() {
    // Gather hits first so both fighters can trade on the same frame.
    const pending: (() => void)[] = [];

    for (const atk of this.fighters) {
      const def = this.fighters[1 - atk.index];
      const hb = atk.hitbox();
      const hurt = def.hurtbox();
      if (!hb || !hurt || def.invulnerable || !overlaps(hb, hurt)) continue;
      const move = atk.move!;
      atk.hitsDone++;
      atk.lastHitFrame = atk.moveFrame;
      const pushDir = atk.facing;
      const blocked = def.canBlock(!!move.low);
      const hx = (Math.max(hb.x - hb.w / 2, hurt.x - hurt.w / 2) + Math.min(hb.x + hb.w / 2, hurt.x + hurt.w / 2)) / 2;
      const hy = (Math.max(hb.y - hb.h / 2, hurt.y - hurt.h / 2) + Math.min(hb.y + hb.h / 2, hurt.y + hurt.h / 2)) / 2;
      pending.push(() => {
        if (blocked) {
          def.receiveBlock(move.blockstun, move.chip ?? 0, pushDir, !!move.heavy);
          this.events.push({ kind: "block", x: hx, y: hy, heavy: !!move.heavy });
        } else {
          def.receiveHit({ damage: move.damage, hitstun: move.hitstun, knockdown: !!move.knockdown, heavy: !!move.heavy, pushDir });
          atk.score += move.damage * 100;
          this.events.push({ kind: "hit", x: hx, y: hy, heavy: !!move.heavy });
          if (move.heavy) this.shake = 8;
        }
        // Pushback goes to the attacker when the defender is cornered.
        if (Math.abs(def.x) >= STAGE_HALF - BODY_WIDTH / 2 - 0.05 && atk.grounded) {
          atk.slide = -pushDir * (move.heavy ? 0.1 : 0.07);
        }
        this.hitstop = Math.max(this.hitstop, move.heavy ? 9 : 6);
      });
    }

    for (const p of this.projectiles) {
      const def = this.fighters[1 - p.owner];
      const hurt = def.hurtbox();
      const box = { x: p.x, y: p.y, w: 0.55, h: 0.5 };
      if (!hurt || def.invulnerable || !overlaps(box, hurt)) continue;
      p.alive = false;
      const pushDir = (p.vx > 0 ? 1 : -1) as Facing;
      const owner = this.fighters[p.owner];
      pending.push(() => {
        if (def.canBlock(false)) {
          def.receiveBlock(16, 3, pushDir, true);
          this.events.push({ kind: "block", x: p.x, y: p.y, heavy: true });
        } else {
          def.receiveHit({ damage: p.damage, hitstun: 20, knockdown: false, heavy: true, pushDir });
          owner.score += p.damage * 100;
          this.events.push({ kind: "hit", x: p.x, y: p.y, heavy: true });
          this.shake = 6;
        }
        this.hitstop = Math.max(this.hitstop, 7);
      });
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);

    for (const apply of pending) apply();
  }

  private updateFacing() {
    const [a, b] = this.fighters;
    for (const f of [a, b]) {
      const opp = f === a ? b : a;
      if (f.grounded && f.neutral && Math.abs(opp.x - f.x) > 0.05) {
        const facing: Facing = opp.x > f.x ? 1 : -1;
        if (facing !== f.facing) {
          f.facing = facing;
          // Keep the motion buffer meaningful after turning around.
          f.reader.clearMotion();
        }
      }
    }
  }

  private checkRoundEnd() {
    const [a, b] = this.fighters;
    const koA = a.health <= 0;
    const koB = b.health <= 0;
    if (koA || koB) {
      this.roundEnd = "ko";
      this.roundWinner = koA && koB ? null : koA ? 1 : 0;
      this.slowmo = 60;
    } else if (this.timer <= 0) {
      this.roundEnd = "time";
      this.roundWinner = a.health === b.health ? null : a.health > b.health ? 0 : 1;
    } else {
      return;
    }
    this.phase = "roundOver";
    this.phaseFrame = 0;
    this.projectiles = [];
    if (this.roundWinner !== null) {
      const w = this.fighters[this.roundWinner];
      this.wins[this.roundWinner]++;
      this.perfect = w.health === MAX_HEALTH;
      // Arcade-style bonuses: time remaining and vitality.
      w.score += this.timer * 100 + w.health * 100 + (this.perfect ? 5000 : 0);
    }
  }

  private updateRoundOver() {
    if (this.phaseFrame === RESULT_AT) {
      this.fighters.forEach((f, i) => {
        if (f.state === "ko") return;
        f.endMove();
        if (this.roundWinner === i) f.setState("victory");
        else f.setState("lose");
      });
    }
    if (this.phaseFrame >= ROUND_OVER_FRAMES) {
      const done = this.wins.some((w) => w >= ROUNDS_TO_WIN) || this.round >= MAX_ROUNDS;
      if (done) {
        this.phase = "matchOver";
        this.matchWinner = this.wins[0] === this.wins[1] ? null : this.wins[0] > this.wins[1] ? 0 : 1;
      } else {
        this.round++;
        this.startRound();
      }
    }
  }
}

import { BODY_WIDTH, GRAVITY, MAX_HEALTH } from "./constants";
import { InputReader } from "./input";
import type { Box, Facing, FighterColors, FighterDef, InputFrame, MoveDef, MoveId, PlayerIndex } from "./types";

export type FighterState =
  | "idle"
  | "walk"
  | "crouch"
  | "guard"
  | "jumpSquat"
  | "jump"
  | "attack"
  | "landing"
  | "hitstun"
  | "blockstun"
  | "airborneHit"
  | "down"
  | "getup"
  | "thrown"
  | "ko"
  | "victory"
  | "lose";

const NEUTRAL_STATES: FighterState[] = ["idle", "walk", "crouch", "guard"];
const JUMP_SQUAT = 3;
const DOWN_TIME = 34;
const GETUP_TIME = 18;

export interface ActContext {
  opponent: Fighter;
  /** The opponent is attacking (or has a fireball) close enough to block. */
  threatened: boolean;
  ownProjectileAlive: boolean;
}

export interface HitInfo {
  damage: number;
  hitstun: number;
  knockdown: boolean;
  heavy: boolean;
  /** World direction the victim is pushed (1 = +x). */
  pushDir: Facing;
}

export function totalFrames(move: MoveDef) {
  return move.startup + move.active + move.recovery;
}

export class Fighter {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Pushback velocity, decays every frame. */
  slide = 0;
  facing: Facing = 1;
  health = MAX_HEALTH;
  state: FighterState = "idle";
  stateFrame = 0;
  /** Frames left in timed states (hitstun, blockstun, landing, down, getup). */
  stun = 0;
  crouching = false;
  moveId: MoveId | null = null;
  move: MoveDef | null = null;
  moveFrame = 0;
  hitsDone = 0;
  lastHitFrame = -99;
  /** Set on the frame a fireball should spawn; the match consumes it. */
  spawnProjectile: MoveDef["projectile"] | null = null;
  /** Set when a throw connects: 1 = forward throw, -1 = back throw. */
  pendingThrow: Facing | null = null;
  walkDir = 0;
  score = 0;
  readonly reader = new InputReader();

  constructor(
    readonly def: FighterDef,
    readonly index: PlayerIndex,
    readonly colors: FighterColors,
  ) {}

  reset(x: number, facing: Facing) {
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.slide = 0;
    this.facing = facing;
    this.health = MAX_HEALTH;
    this.setState("idle");
    this.endMove();
    this.spawnProjectile = null;
    this.pendingThrow = null;
    this.reader.clearMotion();
  }

  get grounded() {
    return this.y <= 0 && this.vy <= 0;
  }

  get neutral() {
    return NEUTRAL_STATES.includes(this.state);
  }

  get invulnerable() {
    if (this.state === "down" || this.state === "getup" || this.state === "thrown") return true;
    if (this.state === "ko" || this.state === "victory" || this.state === "lose") return true;
    if (this.move?.invuln) {
      const [a, b] = this.move.invuln;
      return this.moveFrame >= a && this.moveFrame < b;
    }
    return false;
  }

  /** Whether the current move's attack is in (or before) its active frames. */
  get attacking() {
    return !!this.move && this.moveFrame < this.move.startup + this.move.active && this.move.damage > 0;
  }

  setState(state: FighterState, stun = 0) {
    this.state = state;
    this.stateFrame = 0;
    this.stun = stun;
    if (state !== "crouch" && state !== "hitstun" && state !== "blockstun" && state !== "attack") this.crouching = false;
  }

  hurtbox(): Box | null {
    if (this.state === "down" || this.state === "getup") return null;
    if (this.state === "jump" || this.state === "airborneHit" || (this.state === "attack" && this.y > 0.3)) {
      return { x: this.x, y: this.y + 0.95, w: BODY_WIDTH, h: 1.2 };
    }
    if (this.crouching) return { x: this.x, y: 0.575, w: BODY_WIDTH + 0.1, h: 1.15 };
    return { x: this.x, y: 0.9, w: BODY_WIDTH, h: 1.8 };
  }

  /** The active hitbox in world space, if this frame can hit. */
  hitbox(): Box | null {
    const m = this.move;
    if (!m || m.damage <= 0 || this.moveId === "throw") return null;
    if (this.moveFrame < m.startup || this.moveFrame >= m.startup + m.active) return null;
    const hits = m.hits ?? 1;
    if (this.hitsDone >= hits) return null;
    if (this.hitsDone > 0 && this.moveFrame - this.lastHitFrame < (m.hitInterval ?? 99)) return null;
    return { x: this.x + this.facing * m.hitbox.x, y: this.y + m.hitbox.y, w: m.hitbox.w, h: m.hitbox.h };
  }

  /** Read this frame's input and decide what to do with it. */
  act(input: InputFrame, ctx: ActContext) {
    const r = this.reader;
    r.update(input, this.facing);

    if (this.state === "jump" && !this.move) {
      const b = r.pressed.hk ? "jHk" : r.pressed.lk ? "jLk" : r.pressed.hp ? "jHp" : r.pressed.lp ? "jLp" : null;
      if (b) this.startMove(b, true);
      return;
    }
    if (!this.neutral) return;

    // 236 and 623 overlap (walk forward, then quarter-circle); the direction
    // held at the button press decides which one was meant.
    const fireball = r.anyPunch && r.hasMotion([2, 3, 6]);
    if (r.anyPunch && r.hasMotion([6, 2, 3]) && (!fireball || r.dir === 3)) {
      this.startMove(r.pressed.hp ? "shoryukenH" : "shoryukenL");
      r.clearMotion();
      return;
    }
    if (fireball && !ctx.ownProjectileAlive) {
      this.startMove(r.pressed.hp ? "hadokenH" : "hadokenL");
      r.clearMotion();
      return;
    }
    if (r.anyKick && r.hasMotion([2, 1, 4])) {
      this.startMove(r.pressed.hk ? "tatsuH" : "tatsuL");
      r.clearMotion();
      return;
    }

    const opp = ctx.opponent;
    if (r.pressed.hp && (r.dir === 6 || r.dir === 4) && Math.abs(opp.x - this.x) < 0.95 && opp.throwable) {
      this.startMove("throw");
      this.pendingThrow = r.dir === 6 ? 1 : -1;
      return;
    }

    if (r.pressed.lp || r.pressed.hp || r.pressed.lk || r.pressed.hk) {
      const crouch = r.downHeld;
      const id: MoveId = r.pressed.hk
        ? crouch ? "cHk" : "hk"
        : r.pressed.lk
          ? crouch ? "cLk" : "lk"
          : r.pressed.hp
            ? crouch ? "cHp" : "hp"
            : crouch ? "cLp" : "lp";
      this.startMove(id);
      return;
    }

    if (r.upHeld) {
      this.walkDir = r.dir === 9 ? 1 : r.dir === 7 ? -1 : 0;
      this.setState("jumpSquat");
      return;
    }
    if (r.downHeld) {
      if (this.state !== "crouch") this.setState("crouch");
      this.crouching = true;
      this.walkDir = 0;
      return;
    }
    if (r.backHeld && ctx.threatened) {
      if (this.state !== "guard") this.setState("guard");
      this.walkDir = 0;
      return;
    }
    if (r.forwardHeld || r.backHeld) {
      const dir = r.forwardHeld ? 1 : -1;
      if (this.state !== "walk" || this.walkDir !== dir) this.setState("walk");
      this.walkDir = dir;
      return;
    }
    if (this.state !== "idle") this.setState("idle");
    this.walkDir = 0;
  }

  get throwable() {
    return this.grounded && (this.neutral || this.state === "landing") && !this.invulnerable;
  }

  /** Can block an incoming attack right now (holding back, on the ground). */
  canBlock(low: boolean) {
    if (!this.grounded) return false;
    if (!this.neutral && this.state !== "blockstun") return false;
    if (!this.reader.backHeld) return false;
    if (low && !this.reader.downHeld) return false;
    return true;
  }

  startMove(id: MoveId, air = false) {
    this.moveId = id;
    this.move = this.def.moves[id];
    this.moveFrame = 0;
    this.hitsDone = 0;
    this.lastHitFrame = -99;
    if (!air) {
      this.setState("attack");
      this.crouching = id.startsWith("c");
      this.vx = 0;
    }
  }

  endMove() {
    this.moveId = null;
    this.move = null;
    this.moveFrame = 0;
  }

  /** Advance timers and physics by one frame. */
  advance() {
    this.stateFrame++;
    let gravity = !this.grounded;

    switch (this.state) {
      case "walk":
        this.vx = this.walkDir * this.facing * (this.walkDir > 0 ? this.def.walkSpeed : this.def.backSpeed);
        break;
      case "idle":
      case "crouch":
      case "guard":
        this.vx = 0;
        break;
      case "jumpSquat":
        this.vx = 0;
        if (this.stateFrame >= JUMP_SQUAT) {
          this.setState("jump");
          this.vy = this.def.jumpVelocity;
          this.vx = this.walkDir * this.facing * this.def.jumpForward;
          gravity = false;
        }
        break;
      case "jump":
        if (this.move) {
          this.moveFrame++;
          if (this.moveFrame >= totalFrames(this.move) && !this.move.air) this.endMove();
        }
        break;
      case "attack": {
        const m = this.move!;
        this.moveFrame++;
        if (m.impulse && this.moveFrame === m.impulse.frame) {
          this.vx = m.impulse.vx * this.facing;
          this.vy = m.impulse.vy;
          gravity = false;
        }
        if (m.float && this.moveFrame >= m.float.from && this.moveFrame < m.float.to) {
          this.vx = m.float.vx * this.facing;
          this.vy = 0;
          gravity = false;
        }
        if (m.projectile && this.moveFrame === m.projectile.frame) this.spawnProjectile = m.projectile;
        if (this.moveFrame >= totalFrames(m) && this.grounded) {
          this.endMove();
          this.setState(this.crouching ? "crouch" : "idle");
        }
        break;
      }
      case "landing":
      case "hitstun":
      case "blockstun":
      case "getup":
        this.vx = 0;
        if (--this.stun <= 0) this.setState("idle");
        break;
      case "down":
        this.vx = 0;
        if (--this.stun <= 0) this.setState("getup", GETUP_TIME);
        break;
      case "thrown":
        gravity = false;
        break;
      default:
        break;
    }

    if (gravity) this.vy -= GRAVITY;
    this.x += this.vx + this.slide;
    this.y += this.vy;
    this.slide *= 0.8;
    if (Math.abs(this.slide) < 0.001) this.slide = 0;

    if (this.y <= 0 && this.state !== "thrown") {
      const wasAirborne = this.y < 0 || this.vy < 0;
      this.y = 0;
      if (wasAirborne) this.land();
      this.vy = 0;
    }
  }

  private land() {
    switch (this.state) {
      case "jump":
        this.endMove();
        this.vx = 0;
        this.setState("landing", 3);
        break;
      case "attack":
        if (this.move && (this.move.impulse || this.move.float) && this.moveFrame > (this.move.impulse?.frame ?? 0)) {
          const lag = this.move.landingLag ?? 4;
          this.endMove();
          this.vx = 0;
          this.setState("landing", lag);
        }
        break;
      case "airborneHit":
        this.vx = 0;
        this.setState("down", DOWN_TIME);
        break;
      case "ko":
        this.vx = 0;
        break;
    }
  }

  receiveHit(hit: HitInfo) {
    this.health = Math.max(0, this.health - hit.damage);
    this.endMove();
    this.pendingThrow = null;
    const airborne = !this.grounded;
    if (this.health <= 0) {
      this.setState("ko");
      this.vy = 0.14;
      this.vx = hit.pushDir * 0.05;
      this.y = Math.max(this.y, 0.01);
      return;
    }
    if (hit.knockdown || airborne) {
      this.setState("airborneHit");
      this.vy = hit.knockdown ? 0.15 : 0.1;
      this.vx = hit.pushDir * 0.045;
      this.y = Math.max(this.y, 0.01);
      return;
    }
    const wasCrouching = this.crouching || this.state === "crouch";
    this.setState("hitstun", hit.hitstun);
    this.crouching = wasCrouching;
    this.vx = 0;
    this.slide = hit.pushDir * (hit.heavy ? 0.11 : 0.08);
  }

  receiveBlock(blockstun: number, chip: number, pushDir: Facing, heavy: boolean) {
    // Chip damage can't KO in this version; it leaves the blocker at 1.
    this.health = Math.max(1, this.health - chip);
    const crouch = this.reader.downHeld;
    this.setState("blockstun", blockstun);
    this.crouching = crouch;
    this.vx = 0;
    this.slide = pushDir * (heavy ? 0.09 : 0.065);
  }
}

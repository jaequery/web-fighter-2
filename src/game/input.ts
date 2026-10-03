import type { Button, Facing, InputFrame } from "./types";

// Keyboard bindings use KeyboardEvent.code so they follow physical key
// positions regardless of keyboard layout.
export const KEYMAP: Record<0 | 1, Record<keyof InputFrame, string[]>> = {
  0: {
    left: ["KeyA"],
    right: ["KeyD"],
    up: ["KeyW"],
    down: ["KeyS"],
    lp: ["KeyR"],
    hp: ["KeyT"],
    lk: ["KeyF"],
    hk: ["KeyG"],
  },
  1: {
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    lp: ["KeyK", "Numpad4"],
    hp: ["KeyL", "Numpad5"],
    lk: ["Comma", "Numpad1"],
    hk: ["Period", "Numpad2"],
  },
};

const GAME_KEYS = new Set(Object.values(KEYMAP).flatMap((m) => Object.values(m).flat()));

export class Keyboard {
  private held = new Set<string>();

  private onDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    this.held.add(e.code);
  };
  private onUp = (e: KeyboardEvent) => {
    this.held.delete(e.code);
  };
  private onBlur = () => this.clear();

  attach() {
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", this.onBlur);
  }

  detach() {
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    window.removeEventListener("blur", this.onBlur);
  }

  clear() {
    this.held.clear();
  }

  read(player: 0 | 1): InputFrame {
    const map = KEYMAP[player];
    const frame = {} as InputFrame;
    for (const key of Object.keys(map) as (keyof InputFrame)[]) {
      frame[key] = map[key].some((code) => this.held.has(code));
    }
    return frame;
  }
}

/**
 * Turns raw input frames into fighter-relative directions (numpad notation:
 * 6 = forward, 4 = back, 2 = down, 5 = neutral) and button presses, and keeps
 * a short history for detecting special-move motions.
 */
export class InputReader {
  dir = 5;
  held: InputFrame | null = null;
  pressed: Record<Button, boolean> = { lp: false, hp: false, lk: false, hk: false };
  private history: number[] = [];

  update(frame: InputFrame, facing: Facing) {
    const prev = this.held;
    for (const b of ["lp", "hp", "lk", "hk"] as Button[]) {
      this.pressed[b] = frame[b] && !(prev?.[b] ?? false);
    }
    this.held = frame;

    const h = frame.left === frame.right ? 0 : frame.right ? 1 : -1;
    const fwd = h * facing; // 1 forward, -1 back
    const v = frame.up === frame.down ? 0 : frame.up ? 1 : -1;
    this.dir = 5 + fwd + v * 3;

    this.history.push(this.dir);
    if (this.history.length > 30) this.history.shift();
  }

  get anyPunch() {
    return this.pressed.lp || this.pressed.hp;
  }

  get anyKick() {
    return this.pressed.lk || this.pressed.hk;
  }

  /** True if `sequence` was entered, in order, within the last `window` frames. */
  hasMotion(sequence: number[], window = 18): boolean {
    let idx = sequence.length - 1;
    const start = Math.max(0, this.history.length - window);
    for (let i = this.history.length - 1; i >= start && idx >= 0; i--) {
      if (this.history[i] === sequence[idx]) idx--;
    }
    return idx < 0;
  }

  clearMotion() {
    this.history.length = 0;
  }

  get forwardHeld() {
    return this.dir === 6 || this.dir === 3 || this.dir === 9;
  }

  get backHeld() {
    return this.dir === 4 || this.dir === 1 || this.dir === 7;
  }

  get downHeld() {
    return this.dir <= 3;
  }

  get upHeld() {
    return this.dir >= 7;
  }
}

import type { FighterDef } from "../types";
import { withOverrides } from "./shoto";

// Ryu: the purist. Stronger, faster fireballs; a slightly shorter dragon punch.
export const RYU: FighterDef = {
  id: "ryu",
  name: "Ryu",
  walkSpeed: 0.042,
  backSpeed: 0.034,
  jumpVelocity: 0.205,
  jumpForward: 0.055,
  colors: { gi: 0xf2f0e8, giShade: 0xc9c5b8, belt: 0x1a1a1a, skin: 0xd9a57a, hair: 0x3b2618, headband: 0xd2232a, gloves: 0xb3462e },
  altColors: { gi: 0xd8d0a0, giShade: 0xa89f70, belt: 0x1a1a1a, skin: 0xd9a57a, hair: 0x3b2618, headband: 0x2a5bd7, gloves: 0x6b6b6b },
  moves: withOverrides({
    hadokenL: { projectile: { frame: 12, speed: 0.08, damage: 12 } },
    hadokenH: { projectile: { frame: 12, speed: 0.12, damage: 12 }, recovery: 32 },
  }),
  victory: "fist",
  quote: "You must defeat my Shoryuken to stand a chance.",
};

import type { FighterDef } from "../types";
import { withOverrides } from "./shoto";

// Ken: the showman. Quicker on his feet, with a multi-hit dragon punch that
// travels further and a faster hurricane kick.
export const KEN: FighterDef = {
  id: "ken",
  name: "Ken",
  walkSpeed: 0.046,
  backSpeed: 0.036,
  jumpVelocity: 0.205,
  jumpForward: 0.058,
  colors: { gi: 0xc81e1e, giShade: 0x8e1414, belt: 0x1a1a1a, skin: 0xe2b48c, hair: 0xe8c45a, gloves: 0x3a3a3a },
  altColors: { gi: 0x2f6fd6, giShade: 0x1f4a91, belt: 0x1a1a1a, skin: 0xe2b48c, hair: 0xe8c45a, gloves: 0x3a3a3a },
  moves: withOverrides({
    shoryukenL: { damage: 5, hits: 2, hitInterval: 4, impulse: { frame: 3, vx: 0.05, vy: 0.2 } },
    shoryukenH: { damage: 6, hits: 3, hitInterval: 4, impulse: { frame: 3, vx: 0.065, vy: 0.245 } },
    tatsuL: { float: { from: 14, to: 36, vx: 0.065 } },
    tatsuH: { float: { from: 14, to: 44, vx: 0.08 } },
  }),
  victory: "thumbsUp",
  quote: "Attack me if you dare, I will crush you!",
};

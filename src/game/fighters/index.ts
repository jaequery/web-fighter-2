import type { FighterDef } from "../types";
import { KEN } from "./ken";
import { RYU } from "./ryu";

// The roster. Adding a fighter means adding a data file and listing it here.
export const ROSTER: FighterDef[] = [RYU, KEN];

export type FighterId = (typeof ROSTER)[number]["id"];

export function getFighter(id: string): FighterDef {
  const def = ROSTER.find((f) => f.id === id);
  if (!def) throw new Error(`Unknown fighter: ${id}`);
  return def;
}

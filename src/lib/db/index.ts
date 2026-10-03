// Postgres data layer for players, matches, high scores and saves.
// Server-only: import it from route handlers or server actions, never from a
// client component. The schema lives in db/schema.sql. Nothing connects until
// a function here is called, so the app builds and runs without DATABASE_URL.

import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function isDatabaseConfigured() {
  return !!process.env.DATABASE_URL;
}

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set; see .env.example");
    // Keep the pool small: each serverless instance gets its own. TLS comes from
    // the connection string (hosted providers include sslmode=require).
    pool = new Pool({ connectionString, max: 3 });
  }
  return pool;
}

async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return (await getPool().query<T>(text, values)).rows;
}

export interface Player {
  id: string;
  handle: string;
  created_at: Date;
}

export interface MatchRecord {
  mode: "cpu" | "versus";
  p1PlayerId?: string | null;
  p2PlayerId?: string | null;
  p1Fighter: string;
  p2Fighter: string;
  /** 1 or 2, or null for a draw. */
  winner: 1 | 2 | null;
  p1Rounds: number;
  p2Rounds: number;
  p1Score: number;
  p2Score: number;
}

export interface HighScore {
  handle: string;
  fighter: string;
  score: number;
  created_at: Date;
}

export async function findOrCreatePlayer(handle: string): Promise<Player> {
  const [player] = await query<Player>(
    `INSERT INTO players (handle) VALUES ($1)
     ON CONFLICT (handle) DO UPDATE SET handle = EXCLUDED.handle
     RETURNING id, handle, created_at`,
    [handle.trim()],
  );
  return player;
}

export async function recordMatch(m: MatchRecord): Promise<string> {
  const [row] = await query<{ id: string }>(
    `INSERT INTO matches (mode, p1_player_id, p2_player_id, p1_fighter, p2_fighter, winner, p1_rounds, p2_rounds, p1_score, p2_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [m.mode, m.p1PlayerId ?? null, m.p2PlayerId ?? null, m.p1Fighter, m.p2Fighter, m.winner, m.p1Rounds, m.p2Rounds, m.p1Score, m.p2Score],
  );
  return row.id;
}

export async function submitHighScore(playerId: string, fighter: string, score: number, matchId?: string) {
  await query(
    `INSERT INTO high_scores (player_id, match_id, fighter, score) VALUES ($1, $2, $3, $4)`,
    [playerId, matchId ?? null, fighter, Math.max(0, Math.floor(score))],
  );
}

export async function topScores(limit = 10): Promise<HighScore[]> {
  return query<HighScore>(
    `SELECT p.handle, h.fighter, h.score, h.created_at
     FROM high_scores h JOIN players p ON p.id = h.player_id
     ORDER BY h.score DESC, h.created_at ASC
     LIMIT $1`,
    [Math.min(100, Math.max(1, limit))],
  );
}

export async function loadSave<T = Record<string, unknown>>(playerId: string): Promise<T | null> {
  const [row] = await query<{ data: T }>(`SELECT data FROM player_saves WHERE player_id = $1`, [playerId]);
  return row?.data ?? null;
}

export async function writeSave(playerId: string, data: unknown) {
  await query(
    `INSERT INTO player_saves (player_id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (player_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [playerId, JSON.stringify(data)],
  );
}

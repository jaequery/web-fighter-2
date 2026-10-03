-- Postgres schema for web-fighter-2: players, matches, high scores and saves.
-- Apply with: psql "$DATABASE_URL" -f db/schema.sql
-- Idempotent, so it is safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() on Postgres < 13

CREATE TABLE IF NOT EXISTS players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle      text NOT NULL UNIQUE CHECK (char_length(handle) BETWEEN 1 AND 24),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per finished match. Fighter ids match src/game/fighters ("ryu", "ken", ...).
CREATE TABLE IF NOT EXISTS matches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode          text NOT NULL CHECK (mode IN ('cpu', 'versus')),
  p1_player_id  uuid REFERENCES players (id) ON DELETE SET NULL,
  p2_player_id  uuid REFERENCES players (id) ON DELETE SET NULL,
  p1_fighter    text NOT NULL,
  p2_fighter    text NOT NULL,
  -- 1 or 2 for the winning side, NULL for a draw game.
  winner        smallint CHECK (winner IN (1, 2)),
  p1_rounds     smallint NOT NULL DEFAULT 0,
  p2_rounds     smallint NOT NULL DEFAULT 0,
  p1_score      integer NOT NULL DEFAULT 0,
  p2_score      integer NOT NULL DEFAULT 0,
  played_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matches_played_at_idx ON matches (played_at DESC);

CREATE TABLE IF NOT EXISTS high_scores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  match_id    uuid REFERENCES matches (id) ON DELETE SET NULL,
  fighter     text NOT NULL,
  score       integer NOT NULL CHECK (score >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS high_scores_score_idx ON high_scores (score DESC);

-- Per-player save data (settings, unlocks, arcade progress) as JSON.
CREATE TABLE IF NOT EXISTS player_saves (
  player_id   uuid PRIMARY KEY REFERENCES players (id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

# web-fighter-2

A browser fighting game in the spirit of the Street Fighter II arcade,
starring Ryu and Ken. Built with Next.js (App Router) and three.js.

Created with [Fredrin](https://fredrin.com).

## Commands

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (what Vercel runs)
npm run start   # serve the production build
npm run lint
```

## Controls

|            | Player 1 | Player 2            |
| ---------- | -------- | ------------------- |
| Move       | W A S D  | Arrow keys          |
| Light punch| R        | K  (or Numpad 4)    |
| Heavy punch| T        | L  (or Numpad 5)    |
| Light kick | F        | ,  (or Numpad 1)    |
| Heavy kick | G        | .  (or Numpad 2)    |

Hold back to block (down-back blocks lows). `Enter` pauses, `Esc` quits to the
select screen.

Specials (written for a fighter facing right):

- Hadoken: ↓ ↘ → + punch
- Shoryuken: → ↓ ↘ + punch
- Tatsumaki Senpukyaku: ↓ ↙ ← + kick
- Throw: ← or → + heavy punch, up close

## Database

The game itself needs no database. `db/schema.sql` and `src/lib/db` hold the
Postgres schema and data-access layer for players, matches, high scores and
saves. To use it, set `DATABASE_URL` (see `.env.example`) and apply the
schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## Deployment

Vercel builds the app with its default Next.js settings — no environment
variables are required. Each branch gets a preview deployment and merges to
`main` deploy to production once the repository is connected to a Vercel
project.

## Adding a fighter

Fighters are data. Copy `src/game/fighters/ken.ts`, change its colours and
move overrides, and register it in `src/game/fighters/index.ts`.

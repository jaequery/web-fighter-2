<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Conventions for AI coding agents working in **web-fighter-2**. This file is the
canonical entry point under the [AGENTS.md](https://agents.md) standard, and it
is the first thing a Fredrin Worker reads.

## Project

A Street Fighter II–style arcade fighter (Ryu and Ken) that runs in the
browser: Next.js App Router for the shell, three.js for the game, and a
Postgres data layer for players, matches, high scores and saves. Deploys to
Vercel with no environment variables required.

## Commands

```bash
npm run dev     # local dev server
npm run build   # production build — what Vercel runs; also typechecks
npm run lint
```

## Conventions

- `src/game/` is the engine and must stay framework-free: the simulation
  (`match.ts`, `fighter.ts`, `ai.ts`) has no DOM or three.js imports, so it can
  run headless; only `src/game/render/` touches three.js.
- The simulation is a fixed 60 steps/second; frame data in
  `src/game/fighters/` is in frames. New fighters are a data file plus an entry
  in `src/game/fighters/index.ts`.
- The game is client-only (`next/dynamic` with `ssr: false` in
  `src/components/Arcade.tsx`). Never import `src/lib/db` from client code.
- A bare `npx tsc --noEmit` fails on a fresh checkout (`Cannot find name
  'LayoutProps'`) because Next generates that type; run `npx next typegen`
  first, or just use `npm run build`.

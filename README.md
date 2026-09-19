# LILA BLACK — Player Journey Explorer

A browser-based tool for LILA Games' Level Design team to explore player movement, combat,
loot, and storm-death patterns across LILA BLACK's three maps, built from 5 days of production
telemetry.

**Live tool:** _add your Vercel URL here after deploying_

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for design decisions, data flow, and the coordinate
mapping walkthrough, and [`INSIGHTS.md`](INSIGHTS.md) for three data-backed findings about the
game itself.

## What it does

- **Heatmap Overview** — pick a map + date range, see high-traffic areas, kill zones, death
  zones, storm deaths, or loot pickups as a density heatmap over the minimap.
- **Match Playback** — pick a specific match, scrub or play through it in real time, and watch
  every human/bot's path animate with kill/death/storm/loot markers appearing as they happen.
- Humans vs. bots are visually distinct everywhere (color + line style), and both a Humans/Bots
  toggle and an event-type toggle let you isolate exactly what you want to see.

## Tech stack

- **Data pipeline:** Python (pandas + pyarrow + Pillow) — a one-time offline step, not a
  runtime service.
- **Frontend:** Vite + React + TypeScript, rendering to a single `<canvas>` (no map/chart
  library).
- **Hosting:** static build, deployed to Vercel.

There is no backend, no database, and no environment variables — everything the app needs is
pre-computed JSON + WebP images served as static files.

## Repo layout

```
player_data/                 raw source data (parquet + original minimaps + the provided README)
pipeline/
  build_data.py               parquet -> web/public/data/*.json
  prepare_minimaps.py         downscales minimaps -> web/public/minimaps/*.webp
  requirements.txt
web/                          the deployed app
  src/                        React + TypeScript source
  public/data/                generated JSON (committed, so the app runs with no build step)
  public/minimaps/            generated WebP minimaps (committed)
ARCHITECTURE.md
INSIGHTS.md
```

## Running locally

**Just the app (uses the already-generated data in `web/public/`):**

```bash
cd web
npm install
npm run dev       # http://localhost:5173
```

**Regenerating the data from raw parquet** (only needed if `player_data/` changes):

```bash
cd pipeline
python -m venv .venv && . .venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python build_data.py          # writes web/public/data/
python prepare_minimaps.py    # writes web/public/minimaps/
```

## Deploying (Vercel)

Since the app lives in the `web/` subfolder of the repo (not the repo root), set the **Root
Directory** accordingly:

1. [vercel.com/new](https://vercel.com/new) → import this GitHub repo.
2. **Root Directory:** `web`. Framework preset: **Vite** (auto-detected). Build command
   (`npm run build`) and output directory (`dist`) are also auto-detected.
3. No environment variables needed. Deploy.

Or via CLI, from the `web/` folder:

```bash
cd web
npx vercel --prod
```

No custom `base` path is needed in `vite.config.ts` — Vercel serves the app from the domain
root, so the default Vite config works as-is.

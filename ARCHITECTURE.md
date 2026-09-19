# ARCHITECTURE

## What it's built with, and why

| Layer | Choice | Why |
|---|---|---|
| Data pipeline | Python (pandas + pyarrow), one-time script | The source data is Parquet; pandas/pyarrow is the path of least resistance to read it, fix the data quirks below, and re-shape it. Runs once at build time, not per-request. |
| Frontend | Vite + React + TypeScript | Fast dev loop, small bundle, no framework overhead for what is fundamentally one interactive canvas + a control panel. |
| Rendering | Native HTML5 Canvas (no map/charting library) | Full control over the world→pixel projection, per-frame playback redraws, and a custom density heatmap — all cheap operations that don't need a mapping library's overhead (Leaflet/Mapbox are built for lat/lng tiles, not a static minimap with a linear projection). |
| Hosting | Static site (GitHub Pages) | Everything the tool needs is pre-computed JSON + images — there is no backend, no database, and no server-side logic at request time, so static hosting is sufficient and free. |

**No backend / database at runtime.** All 796 matches, ~89k events, and per-map/day
aggregates are pre-processed into flat JSON files once, checked into the repo under
`web/public/data/`, and fetched directly by the browser. This trades "query anything on
demand" for "everything is a static file" — the right trade for a fixed, five-day telemetry
export that isn't growing in real time.

## Data flow

```
player_data/*.nakama-0 (raw parquet, 1,243 files)
        │
        ▼  pipeline/build_data.py  (run once, offline)
        │    - decode `event` bytes → string
        │    - fix the timestamp bug (see below)
        │    - strip the redundant .nakama-0 suffix from match_id
        │    - bucket combat events into 4 categories: kill / death / storm / loot
        │    - group rows by match_id → one JSON file per match
        │    - also accumulate per-(map, date) point lists for heatmaps
        ▼
web/public/data/
   manifest.json              — every match's summary (map, date, counts, file path)
   matches/<id>.json          — one match: players[], paths[] (position samples), events[]
   aggregates/<map>/<date>.json — raw (x,z) point lists per category, for the heatmap view

pipeline/prepare_minimaps.py — downscales the 3 source minimaps (up to 9000×9000, 24MB
   total) to a 2048px-max-edge WebP (~270KB each) — web/public/minimaps/*.webp
        │
        ▼
web/src (React) fetches manifest.json once, then match/aggregate files on demand
        │
        ▼  MapCanvas.tsx
   draws: minimap image → heatmap layer (if enabled) → ghost paths → traveled
   path + live marker per player (up to the scrub position) → event glyphs
```

Filtering by map/date/match is just array filtering over `manifest.json` in the browser —
no query layer needed at this data size (~200KB manifest for 796 matches).

## Coordinate mapping (world → minimap pixel)

The README's formula is resolution-independent — `u`/`v` are 0–1 fractions of the map, not
literal 1024px offsets:

```
u = (x - originX) / scale
v = (z - originZ) / scale
pixelX = u * imageWidth
pixelY = (1 - v) * imageHeight     // Z grows "up"; image Y grows down
```

`src/lib/coords.ts` implements exactly this, but multiplies by the **actual loaded image's**
`naturalWidth`/`naturalHeight`, not a hardcoded 1024 — the real minimaps are 4320×4320,
2160×2158, and 9000×9000 (re-encoded down to ≤2048px for the web build), so hardcoding 1024
would have put every marker in the wrong place. `MapCanvas.tsx` then applies one more linear
scale+offset on top to letterbox that image into whatever size the canvas element actually is
(it's responsive), so the same projection works at any viewport size.

I verified this by cross-referencing named POIs visible on the Grand Rift minimap art (e.g.
"Mine Pit", "Gas Station") against where player paths and events actually cluster — they land
inside the correct named regions, not offset or mirrored.

## Assumptions & data quirks (this is where the "attention to detail" lives)

| # | What I found | How I handled it |
|---|---|---|
| 1 | `ts` is typed `timestamp[ms]` in the parquet schema, but the underlying integer is actually **Unix seconds**, not milliseconds. Reading it "normally" produces bogus dates around 1970-01-21. Multiplying the raw int by 1000 recovers the real wall-clock time (verified: it lands exactly on Feb 10–14, 2026, matching the folder names, and overlapping players in the same match share overlapping real-world timestamps). | `ts_ms = raw_int64 * 1000` in `build_data.py`. This directly contradicts the README's claim that `ts` is "match-relative elapsed time, not wall-clock" — it's real wall-clock time; match-relative time is simply `ts - match_start`. |
| 2 | `match_id` column values carry a redundant trailing `.nakama-0` (matching the file extension), so raw values aren't a clean key. | Stripped the suffix once at load time. |
| 3 | `BotKill`/`BotKilled` are **not** exclusively "human perspective" events as the README states — bot-owned files also log them (e.g. a bot that lands a kill gets `BotKill` in its own file). There is also no killer/victim pair id in the schema, so attack attribution between two specific entities isn't recoverable. | Every combat event is treated as a location marker from the *file owner's* point of view, bucketed into 4 categories that match the brief's own checklist exactly: `kill` (`Kill`+`BotKill`), `death` (`Killed`+`BotKilled`), `storm` (`KilledByStorm`), `loot` (`Loot`). No attribution lines are drawn between players. |
| 4 | A match's true date (from fix #1) doesn't always match the folder it shipped in — one match starts 2026-02-09 23:5x and was filed under `February_10/`. | Matches are bucketed by the **decoded** date of their first event, not the folder name. `2026-02-09` shows up as a legitimate (single-match) filter option as a result. |
| 5 | ~93% of matches only have one participant's file present at all (see `INSIGHTS.md` #3) — most "matches" are not full lobbies in this export. | Not "fixed" — surfaced. The UI shows human/bot counts per match in the list so this is visible before opening one, and it's called out as insight #3 since it affects how much to trust aggregate stats. |
| 6 | Minimaps are far larger than needed (up to 9000×9000, 24MB total) for a browser-rendered background. | Downscaled to a 2048px max edge and re-encoded as WebP (~270KB each) in `pipeline/prepare_minimaps.py`, without touching the projection math (see above). |

## Major trade-offs

| Decision | Chosen | Alternative considered | Why |
|---|---|---|---|
| Backend | None — static JSON, static hosting | A small API (FastAPI/Node) over a real DB (DuckDB/Postgres) | The dataset is a fixed 5-day export, not a live feed; ad-hoc "query anything" flexibility isn't needed yet, and static hosting is free, instant, and has nothing to operate. If telemetry starts streaming continuously, this is the first thing to replace. |
| Combat semantics | Collapse 6 raw combat event types into 4 categories (kill/death/storm/loot), no attacker↔victim lines | Try to pair `BotKill`↔`BotKilled` rows by timestamp+proximity to draw attributed kill lines | The schema has no shared id to pair on, and heuristic timestamp/proximity matching would produce confident-looking but unverifiable lines — worse than being explicit about the limitation. |
| Rendering | Hand-rolled Canvas + a small custom heatmap (density stamps + single-hue sequential ramp) | A mapping library (Leaflet/deck.gl) or a charting library's heatmap | Those libraries assume tile-based maps or chart axes; a static image with a linear projection and a few thousand points is simpler and faster to hand-roll, and it keeps the bundle under 60KB gzipped. |
| Color system | One hue per event category + shape glyphs (crosshair/X/spiral/diamond) as a second, colorblind-safe channel; humans get a saturated blue, bots a muted neutral gray | A larger fully-distinct categorical palette | Validated with a palette-accessibility checker: 5 fully-orthogonal hues aren't achievable at this count without failing colorblind-safety floors, so color is reinforcement and shape carries identity. |
| Match population default | Auto-select the first match when entering Playback mode | Empty canvas until the user picks one | A Level Designer opening the tool for the first time should see something moving immediately, not a blank map. |

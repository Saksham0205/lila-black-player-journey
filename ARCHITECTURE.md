# ARCHITECTURE

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| Data pipeline | Python (pandas + pyarrow), one offline script | Parquet in, quirks fixed, flat JSON out. It runs once, not per request. |
| Frontend | Vite + React + TypeScript | Fast loop and a small bundle for one canvas plus a control panel. |
| Rendering | Hand-written HTML5 Canvas, no map library | Leaflet/Mapbox assume lat/lng tiles. This is one static image with a linear projection, so a few hundred lines are simpler and faster. |
| Hosting | Static site on Vercel | Everything is pre-computed JSON and images. There is no backend, database or env var. |

## Data flow

```
player_data/*.nakama-0 (1,243 parquet files)
  -> pipeline/build_data.py: decode event bytes, drop duplicate rows, fix timestamps,
     strip the match_id suffix, tag bots by filename, bucket events, group by match
  -> web/public/data/manifest.json          summary of every match (filters run on this)
     web/public/data/matches/<id>.json      players, position paths, events for one match
     web/public/data/aggregates/<map>/<date>.json   raw (x,z) points per category (heatmaps)
  -> React fetches the manifest once, then match or aggregate files on demand
  -> MapCanvas: minimap -> heatmap -> ghost paths -> travelled path + marker -> event glyphs
pipeline/prepare_minimaps.py: 9000px minimaps -> 2048px WebP (~270 KB each)
```

Filtering by map, date and match is plain array filtering over the manifest in the browser.

## Coordinate mapping

The README's formula uses fractions, so it is resolution-independent:

```
u = (x - originX) / scale        v = (z - originZ) / scale
pixelX = u * imageWidth          pixelY = (1 - v) * imageHeight     (Z is up, image Y is down)
```

`src/lib/coords.ts` multiplies by the **loaded image's real size**, not the README's 1024. The
source minimaps are 4320², 2160×2158 and 9000², and the web copies are 2048², 2048×2046 and
2048². `MapCanvas` then applies one more scale and offset to letterbox the image into the
responsive canvas. `y` is elevation and is ignored. Checks: every position sample lands inside
[0,1] on both axes for all three maps, and paths follow the roads and POIs drawn on the minimap.

## Assumptions and data quirks

| # | Found | Handled |
|---|---|---|
| 1 | `ts` is typed `timestamp[ms]`, but the integers are Unix **seconds**, not the README's match-relative time. Read literally they give 1970-01-21. | Multiply by 1000. This gives Feb 9 23:58 to Feb 14 15:01 (UTC), matching the folders, with match durations of 13 to 890 s. Clock times in the UI are UTC. |
| 2 | 1,505 exact duplicate rows (same file, second, position, event). They inflate loot by 9.7% and bot kills by 1.6%. | Dropped in the pipeline. |
| 3 | `match_id` has a redundant `.nakama-0` suffix. | Stripped. |
| 4 | Bot files also log `BotKill`/`BotKilled`, and there is no killer/victim id. | Every combat event is a marker from the file owner's view (kill / death / storm / loot). No attribution lines are drawn. |
| 5 | Numeric-ID (bot) files include 636 `Position` rows from 3 ids. | Bot status comes from the filename, as the README says, so these draw as bots. |
| 6 | 4 matches sit in a different folder than their decoded start date (for example, started Feb 10, filed under Feb 11). | Matches use the decoded date, so Feb 9 appears as a date. |
| 7 | 779 of 796 matches have exactly one human file. | Not fixable. It is shown in the match list (human/bot counts), and `INSIGHTS.md` avoids any PvP claim. |

## Trade-offs

| Decision | Chosen | Alternative | Why |
|---|---|---|---|
| Backend | None, static JSON | API over DuckDB or Postgres | The data is a fixed 5-day export. Replace this first if telemetry starts streaming. |
| Combat semantics | 4 categories, no attribution lines | Pair kill and death rows by time and distance | There is no shared id, so pairing would look confident but be unverifiable. |
| Rendering | Custom canvas heatmap | Leaflet or deck.gl | No tile map is needed. Bundle stays around 57 KB gzipped. |
| Colour | One hue per event plus a shape glyph; humans blue, bots neutral grey, dashed | More distinct hues | Five orthogonal hues fail colour-blind checks, so shape carries the identity. |
| Default view | Playback with the first match selected | Empty map until a match is picked | A first-time user sees movement immediately. |

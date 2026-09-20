"""
LILA BLACK - Player Journey Data Pipeline
==========================================

Reads the raw per-player parquet files (extension `.nakama-0`) from
`player_data/`, corrects two data quality issues discovered during
inspection (see ARCHITECTURE.md -> "Assumptions & data quirks"), and
emits compact, web-friendly JSON under `web/public/data/` that the
frontend fetches directly (no backend / database needed at runtime).

Run:
    python pipeline/build_data.py

Data quirks handled here:
  0. Exact duplicate rows are dropped (see load_all_rows).
  1. Timestamps: the parquet `ts` column is typed `timestamp[ms]`, but
     the underlying integer is actually a Unix timestamp in SECONDS
     (verified against the real Feb 2026 recording dates). Reading it
     as literal milliseconds produces bogus "1970-01-21" dates. We
     recover the true wall-clock time as `raw_int * 1000` ms-since-epoch.
  2. `match_id` column values carry a redundant trailing `.nakama-0`
     suffix (the server instance tag) that we strip for a clean id.
  3. `BotKill` / `BotKilled` are NOT exclusively human-perspective
     events as the README states -- bot-owned files also log them
     (e.g. a bot that lands a kill gets `BotKill` in its own file).
     Since the schema has no killer/victim pair id, we cannot draw
     attributed kill lines; we simply bucket every combat event into
     4 categories from the *file owner's* point of view:
        Kill / BotKill        -> "kill"   (owner scored a kill)
        Killed / BotKilled    -> "death"  (owner was killed by a player/bot)
        KilledByStorm         -> "storm"  (owner died to the storm)
        Loot                  -> "loot"   (owner picked up an item)
     This matches exactly the 4 marker categories requested by the brief.
"""
from __future__ import annotations

import json
import os
from collections import defaultdict

import pandas as pd
import pyarrow.parquet as pq

RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "player_data")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "web", "public", "data")
DAY_FOLDERS = [
    "February_10",
    "February_11",
    "February_12",
    "February_13",
    "February_14",
]

# world -> minimap projection config, taken from the README's Map Configuration table.
MAP_CONFIG = {
    "AmbroseValley": {"scale": 900, "originX": -370, "originZ": -473, "image": "minimaps/AmbroseValley.webp"},
    "GrandRift": {"scale": 581, "originX": -290, "originZ": -290, "image": "minimaps/GrandRift.webp"},
    "Lockdown": {"scale": 1000, "originX": -500, "originZ": -500, "image": "minimaps/Lockdown.webp"},
}

EVENT_CATEGORY = {
    "Kill": "kill",
    "BotKill": "kill",
    "Killed": "death",
    "BotKilled": "death",
    "KilledByStorm": "storm",
    "Loot": "loot",
    "Position": "position",
    "BotPosition": "position",
}


def load_all_rows() -> pd.DataFrame:
    frames = []
    for folder in DAY_FOLDERS:
        folder_path = os.path.join(RAW_DATA_DIR, folder)
        if not os.path.isdir(folder_path):
            continue
        for fname in os.listdir(folder_path):
            fpath = os.path.join(folder_path, fname)
            if not os.path.isfile(fpath):
                continue
            table = pq.read_table(fpath)
            df = table.to_pandas()
            if df.empty:
                continue
            df["event"] = df["event"].apply(lambda v: v.decode("utf-8") if isinstance(v, (bytes, bytearray)) else v)
            base = fname[: -len(".nakama-0")] if fname.endswith(".nakama-0") else fname
            owner_id, _, _match_from_name = base.partition("_")
            df["owner_id"] = owner_id
            df["is_bot"] = owner_id.isdigit()
            suffix = ".nakama-0"
            df["clean_match_id"] = df["match_id"].apply(
                lambda s: s[: -len(suffix)] if isinstance(s, str) and s.endswith(suffix) else s
            )
            frames.append(df)
    full = pd.concat(frames, ignore_index=True)

    # --- Drop exact duplicate rows (same owner/match/second/position/event). ---
    # ~1.5k rows are logged twice; left in, they inflate loot by ~10% and kills by ~2%.
    before = len(full)
    full = full.drop_duplicates(
        subset=["owner_id", "clean_match_id", "ts", "x", "y", "z", "event"], ignore_index=True
    )
    print(f"  dropped {before - len(full):,} exact duplicate rows")

    # --- Timestamp fix: raw int64 (labelled ms) is actually whole seconds. ---
    raw_seconds = full["ts"].astype("int64")
    full["ts_ms"] = raw_seconds * 1000
    return full


def build():
    print("Loading + correcting raw parquet data...")
    df = load_all_rows()
    print(f"  {len(df):,} rows, {df['clean_match_id'].nunique():,} matches, "
          f"{df['owner_id'].nunique():,} unique player/bot ids")

    df["category"] = df["event"].map(EVENT_CATEGORY)

    os.makedirs(OUT_DIR, exist_ok=True)
    matches_dir = os.path.join(OUT_DIR, "matches")
    agg_dir = os.path.join(OUT_DIR, "aggregates")
    os.makedirs(matches_dir, exist_ok=True)
    os.makedirs(agg_dir, exist_ok=True)

    manifest_matches = []
    date_set = set()

    # aggregate accumulators keyed by (map, date) -> category -> list[[x,z]]
    agg = defaultdict(lambda: defaultdict(list))

    grouped = df.groupby("clean_match_id", sort=False)
    n_matches = grouped.ngroups
    for i, (match_id, mdf) in enumerate(grouped):
        map_id = mdf["map_id"].iloc[0]
        if map_id not in MAP_CONFIG:
            continue  # unknown map, skip defensively

        start_ms = int(mdf["ts_ms"].min())
        end_ms = int(mdf["ts_ms"].max())
        match_date = pd.to_datetime(start_ms, unit="ms", utc=True).date().isoformat()
        date_set.add(match_date)

        # players in this match
        owners = mdf[["owner_id", "is_bot"]].drop_duplicates(subset="owner_id")
        owners = owners.reset_index(drop=True)
        idx_of = {oid: i for i, oid in enumerate(owners["owner_id"].tolist())}
        players = [{"id": row.owner_id, "bot": bool(row.is_bot)} for row in owners.itertuples()]

        paths = [[] for _ in players]
        events = []
        counts = {"kill": 0, "death": 0, "storm": 0, "loot": 0}

        mdf_sorted = mdf.sort_values("ts_ms")
        for row in mdf_sorted.itertuples():
            t_sec = round((row.ts_ms - start_ms) / 1000)
            x = round(float(row.x), 1)
            z = round(float(row.z), 1)
            pidx = idx_of[row.owner_id]
            cat = row.category
            if cat == "position":
                paths[pidx].append([t_sec, x, z])
                agg[(map_id, match_date)]["traffic"].append([round(x), round(z)])
            elif cat in counts:
                events.append([t_sec, x, z, cat, pidx])
                counts[cat] += 1
                agg[(map_id, match_date)][cat].append([round(x), round(z)])

        humans = sum(1 for p in players if not p["bot"])
        bots = sum(1 for p in players if p["bot"])

        match_out = {
            "id": match_id,
            "map": map_id,
            "date": match_date,
            "startMs": start_ms,
            "durationSec": round((end_ms - start_ms) / 1000),
            "players": players,
            "paths": paths,
            "events": events,
        }

        rel_path = f"matches/{match_id}.json"
        with open(os.path.join(matches_dir, f"{match_id}.json"), "w", encoding="utf-8") as f:
            json.dump(match_out, f, separators=(",", ":"))

        manifest_matches.append({
            "id": match_id,
            "map": map_id,
            "date": match_date,
            "startMs": start_ms,
            "durationSec": match_out["durationSec"],
            "humans": humans,
            "bots": bots,
            "kills": counts["kill"],
            "deaths": counts["death"],
            "stormDeaths": counts["storm"],
            "loot": counts["loot"],
            "file": rel_path,
        })

        if (i + 1) % 100 == 0 or i + 1 == n_matches:
            print(f"  processed {i + 1}/{n_matches} matches")

    # --- write aggregate files ---
    for (map_id, date), cats in agg.items():
        out = {"map": map_id, "date": date}
        for cat in ("traffic", "kill", "death", "storm", "loot"):
            out[cat] = cats.get(cat, [])
        safe_date = date.replace("-", "")
        map_dir = os.path.join(agg_dir, map_id)
        os.makedirs(map_dir, exist_ok=True)
        with open(os.path.join(map_dir, f"{safe_date}.json"), "w", encoding="utf-8") as f:
            json.dump(out, f, separators=(",", ":"))

    manifest_matches.sort(key=lambda m: m["startMs"])
    manifest = {
        "maps": MAP_CONFIG,
        "dates": sorted(date_set),
        "matches": manifest_matches,
    }
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, separators=(",", ":"))

    print(f"\nDone. Wrote {len(manifest_matches)} match files + manifest.json to {OUT_DIR}")


if __name__ == "__main__":
    build()

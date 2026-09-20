# INSIGHTS — Three things learned about LILA BLACK

Source: all 5 days of telemetry (Feb 10–14, 2026) after de-duplication: 796 matches, 87,599
events, 781 human journeys. "Journey" = one human's file in one match. Every number here comes
from `web/public/data/` (the pipeline output) and can be reproduced by re-running
`pipeline/build_data.py`. Only human-owned files are used for kill/death counts, because a human's
file logs both sides of their own fights, so those ratios are not distorted by missing files.

**Read this caveat first.** 779 of 796 matches contain exactly one human file (16 contain none, and
only one has two humans). This export can therefore say almost nothing about human-vs-human play:
there are just 6 `Kill`/`Killed` events in total. None of the insights below relies on PvP.

---

## 1. Bots are the main killer of humans, yet humans beat them ~5.5 to 1

**What stood out:** in Match Playback, nearly every death marker was a bot kill, and deaths were
far rarer than kills. Counting them confirmed both.

**Evidence (human journeys only, de-duplicated):**

| | Count |
|---|---|
| Humans killing bots (`BotKill`) | 2,193 (2.8 per journey) |
| Humans killed by bots (`BotKilled`) | 400 (0.5 per journey; 51% of journeys contain one) |
| Humans killed by the storm | 39 |
| Humans killed by other humans | 3 |

Bots cause **90.5%** of all recorded human deaths (400 of 442), while humans win bot fights **5.5 : 1**.
By map: Ambrose Valley 5.5 : 1 (1,639 vs 296), Lockdown 4.7 : 1 (378 vs 80), Grand Rift 7.3 : 1
(176 vs 24; small sample).

**Actionable:** bots are the game's real opponent right now, and they lose most fights but still
end half of all journeys. Metrics affected: bot K/D against humans, journey length, and the share
of journeys that end in a bot death.
- Actions: set a target bot-vs-human K/D per map (Grand Rift looks the easiest); if bots are
  meant to be a threat, move bot spawns and patrol routes toward contested loot POIs rather
  than open ground; if they are meant to be fodder, the 51% death rate is high enough to check
  for cheap deaths (spawn-adjacent bots, no cover to reset).
- The Kill and Death heatmap layers show *where* each side wins: the gap between them is where
  bots are over- or under-tuned.

**Why a level designer should care:** bot placement and cover layout are level-design levers.
This one number says whether the maps are producing fair fights.

---

## 2. Lockdown has large stretches of map that players almost never visit

**What stood out:** Lockdown has by far the lowest share of its playable area ever walked. I
masked out the black void around each island using the minimap image itself, so empty
space outside the island does not count as "ignored".

**Evidence (32×32 grid over each map, playable cells only, all position samples):**

| Map | Playable cells visited at all | Cells with ≤3 samples ("cold") | Human loot pickups / match |
|---|---|---|---|
| Ambrose Valley | 95% | 9% | 15.7 |
| Grand Rift | 87% | 29% | 12.7 |
| **Lockdown** | **68%** | **38%** | **11.1** |

On Lockdown the cold ground is mostly the **north half**: 142 of 316 playable cells there are cold,
against 39 of 164 in the south. Movement and loot line up tightly: across a 20×20 grid the
correlation between loot pickups and traffic is 0.76–0.88 (Spearman) on all three maps. Players
walk where the loot is, and the top 5% of cells hold 56–64% of all pickups.

**Actionable:** Lockdown is the smaller map, so wasted space costs it the most. Metrics affected:
map-area utilisation, loot pickups per match, and encounter density.
- Actions: add or upgrade loot in the cold north half of Lockdown (traffic follows loot, so this is
  the cheapest way to pull players there); if the ground is cold because of blocked routes or
  poor sightlines, fix that first. Re-run the traffic heatmap after the change and target cold cells < 15%.

**Why a level designer should care:** this is the "which areas get ignored" question from the
brief. It is answerable in seconds with the traffic layer, and the fix is a placement change
rather than a rebuild.

---

## 3. The storm hits Lockdown hardest, and only at the very end

**What stood out:** Lockdown logged the same number of storm deaths as Ambrose Valley (17 each)
from under a third of the matches.

**Evidence:** share of human journeys that end in a storm death:

| Map | Journeys | Storm deaths | Rate |
|---|---|---|---|
| Ambrose Valley | 554 | 17 | 3.1% |
| Grand Rift | 57 | 5 | 8.8% |
| **Lockdown** | 170 | 17 | **10.0%** |

Lockdown vs Ambrose Valley is 3.3× (Fisher exact test p = 0.0006). Grand Rift is similar but
rests on 5 deaths (p = 0.045), so treat it as a hint. Storm deaths occur a median **739 s** into
a journey, against a median journey length of 367 s: the storm only catches players who are still
alive at the very end of a match, and overall it accounts for 8.8% of human deaths.

**Actionable:** Metrics affected: storm deaths as a share of all deaths per map, and time-to-storm-death.
- Actions: audit Lockdown's final shrink phase (timing and safe-zone travel distance) against
  the other maps. Because insight 2 shows Lockdown's north is under-used, check whether the safe
  zone regularly ends somewhere players have no reason to be. This is a hypothesis to test, not a finding.

**Why a level designer should care:** storm deaths feel unfair when they reflect layout and not
player mistakes. The tool shows the problem is specific to Lockdown (and possibly Grand Rift), so
the fix is a targeted timing or route pass, not a global storm change.

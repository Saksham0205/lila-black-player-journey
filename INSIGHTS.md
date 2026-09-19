# INSIGHTS — Three things learned about LILA BLACK

Generated using the Player Journey Explorer against all 5 days of telemetry (Feb 9–14, 2026;
796 matches, 89,104 events, 339 unique player/bot ids). Exact figures below come from
`pipeline/build_data.py`'s output (`web/public/data/manifest.json`) and can be reproduced by
re-running the pipeline.

---

## 1. Human-vs-human combat is almost nonexistent — bots are absorbing nearly all the fights

**What caught my eye:** Switching the heatmap layer between "Kill zones" and toggling event
types in Match Playback, I noticed I could barely find a `Kill`/`Killed` marker anywhere,
while `BotKill`/`BotKilled` markers were everywhere.

**The pattern:** Across all 796 matches / 5 days:

| Event | Count |
|---|---|
| `Kill` (human killed a human) | 3 |
| `Killed` (human killed by a human) | 3 |
| `BotKill` (killed a bot) | 2,415 |
| `BotKilled` (killed by a bot) | 700 |

Human-vs-human kills make up **0.19%** of all 3,121 combat log entries. Practically every
recorded fight in the dataset is a human-vs-bot encounter, not a human-vs-human one.

**Actionable:** For an extraction shooter, player-vs-player tension is usually a core part of
the fantasy ("someone else might be here for the same loot"). Right now the bot population is
absorbing almost all combat before two human squads ever meet. This affects:

- **Player-vs-player encounter rate** — currently near zero.
- **Perceived match tension / replay value** — humans are fighting a shooting gallery, not
  each other.

Actionable items: reduce bot density or bot aggression in contested/late-game POIs so humans
survive long enough to cross paths with each other; or deliberately funnel spawns/extraction
points to increase human-human overlap, then track the `Kill`/`Killed` count as a KPI to see
if it moves off ~0.

**Why a level designer should care:** Bot spawn density and POI placement are level-design
levers. This metric tells you directly whether your map layout is creating human-vs-human
friction or just dropping players into a bot arena — something that's very hard to see from
raw telemetry tables but jumps out immediately once kills are plotted on the map.

---

## 2. Storm-death rate is ~3× higher on Lockdown than on Ambrose Valley, despite it being the smaller map

**What caught my eye:** Filtering the heatmap to "Storm deaths" and switching between maps,
Lockdown's storm markers looked disproportionately frequent given how few matches it has
compared to Ambrose Valley.

**The pattern (storm deaths per match, by map):**

| Map | Matches | Storm deaths | Storm deaths / match |
|---|---|---|---|
| Ambrose Valley (primary, largest) | 566 | 17 | 0.030 |
| Grand Rift (secondary) | 59 | 5 | 0.085 |
| **Lockdown** (smaller/close-quarters) | 171 | 17 | **0.099** |

Lockdown's per-match storm-death rate is **3.3×** Ambrose Valley's, and Grand Rift's is close
behind at 2.8× despite a much smaller sample (59 matches — worth re-checking as more data
comes in). Storm deaths logged also line up almost exactly with the end of the affected
player's tracked timeline (median 99.9% into their recorded duration) — the storm reliably
functions as a terminal, non-recoverable elimination.

**Actionable:** Since Lockdown is explicitly designed as the compact map, players there have
less room to relocate as the zone shrinks. This is a testable hypothesis, not a conclusion:

- Metric affected: storm-death rate as a fraction of all deaths, per map (currently ~2–3% of
  deaths overall, but a bigger share of *how* players lose on Lockdown specifically).
- Actionable items: audit Lockdown's storm shrink-phase timing and safe-zone travel distance
  vs. time budget relative to the other two maps; check whether Lockdown's chokepoint layout
  is trapping players away from the safe zone more than intended.

**Why a level designer should care:** Storm pacing is one of the most direct level-design
levers in an extraction shooter — get it wrong on one map and players feel cheated rather than
outplayed. This tool lets you see that the imbalance is map-specific, so the fix can be a
targeted Lockdown timing pass instead of a global storm nerf that would blunt the other two
maps, which look properly tuned by comparison.

---

## 3. ~93% of the matches in this dataset only have one tracked participant — treat cross-match aggregates with care

**What caught my eye:** Most matches I opened in Match Playback showed exactly one dot moving
around an empty map, even though the README describes matches as "typically has multiple
human players and bots." Only a handful of matches showed a full crowd.

**The pattern (participants per match, `humans + bots`):**

| Participants in match | # matches |
|---|---|
| 1 | 743 (93.3%) |
| 2 | 1 |
| 5–8 | 34 |
| 12–16 | 18 |

Only **53 of 796 matches (6.7%)** have more than one participant file at all. This also
explains an odd asymmetry in the raw counts: total `kill`-category events (2,418: `Kill` +
`BotKill`) are **3.4×** total `death`-category events (703: `Killed` + `BotKilled`). 556
matches show a human logging a `BotKill` with zero bot files present for that match at all —
i.e., the victim's own record simply isn't in the sample.

**Actionable:** This isn't a game-balance finding — it's a data-completeness finding — but
it's exactly the kind of thing that silently skews every other metric if it goes unnoticed.

- Metrics affected: any aggregate computed by joining across participants in a match (true
  K/D, time-to-kill from paired events, "who killed whom") is unreliable while most matches
  are single-participant captures. Even the heatmaps in this tool are implicitly weighted
  toward the ~53 fully-populated matches for anything that needs more than one file to show up
  (e.g., you cannot see a squad wipe pattern in a 1-participant match).
- Actionable items: if this reflects a sampling choice in how telemetry was exported, tag
  matches with a "capture completeness" flag (e.g., `expected_pop` vs. `captured_pop`) so
  downstream tools — including this one — can filter to fully-captured matches before drawing
  population-level conclusions. If it reflects genuinely low live bot-fill in most sessions,
  that's a matchmaking/bot-fill setting worth revisiting on its own.

**Why a level designer should care:** Before trusting any "hot zone" or "storm is worse here"
conclusion drawn from this tool (including insights #1 and #2 above) at face value for a
balancing decision, it's worth knowing what fraction of the underlying matches actually had
enough participants to be representative of a real lobby.

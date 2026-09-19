import { ActorIcon } from "./Icons";
import { Button } from "./ui";
import { minimapUrl } from "../lib/api";
import type { HeatmapCategory, MapId, Manifest, MatchSummary, ViewMode } from "../lib/types";

interface Props {
  manifest: Manifest;
  selectedMap: MapId;
  onSelectMap: (m: MapId) => void;
  viewMode: ViewMode;
  availableDates: string[];
  selectedDates: Set<string>;
  onToggleDate: (d: string) => void;
  onSelectAllDates: () => void;
  heatmapCategory: HeatmapCategory;
  onSetHeatmapCategory: (c: HeatmapCategory) => void;
  matches: MatchSummary[];
  selectedMatchId: string | null;
  onSelectMatch: (id: string) => void;
}

const MAP_LABELS: Record<MapId, string> = {
  AmbroseValley: "Ambrose Valley",
  GrandRift: "Grand Rift",
  Lockdown: "Lockdown",
};

const HEATMAP_LAYERS: [HeatmapCategory, string][] = [
  ["traffic", "High-traffic areas"],
  ["kill", "Kill zones"],
  ["death", "Death zones"],
  ["storm", "Storm deaths"],
  ["loot", "Loot pickups"],
];

function formatClock(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m)]} ${Number(d)}`;
}

export default function Sidebar({
  manifest,
  selectedMap,
  onSelectMap,
  viewMode,
  availableDates,
  selectedDates,
  onToggleDate,
  onSelectAllDates,
  heatmapCategory,
  onSetHeatmapCategory,
  matches,
  selectedMatchId,
  onSelectMatch,
}: Props) {
  const matchCounts = manifest.matches.reduce(
    (acc, m) => ({ ...acc, [m.map]: acc[m.map] + 1 }),
    { AmbroseValley: 0, GrandRift: 0, Lockdown: 0 } as Record<MapId, number>
  );
  const allDatesSelected = availableDates.every((d) => selectedDates.has(d));

  return (
    <aside className="sidebar" aria-label="Filters">
      <section className="panel-section" data-tour="map">
        <h2 className="panel-title">Map</h2>
        <div className="map-list" role="radiogroup" aria-label="Map">
          {(Object.keys(manifest.maps) as MapId[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={m === selectedMap}
              className={"map-card" + (m === selectedMap ? " active" : "")}
              onClick={() => onSelectMap(m)}
            >
              <img className="map-thumb" src={minimapUrl(manifest.maps[m].image)} alt="" loading="lazy" />
              <span className="map-card-text">
                <span className="map-card-name">{MAP_LABELS[m]}</span>
                <span className="map-card-meta">{matchCounts[m]} matches</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section" data-tour="dates">
        <div className="panel-title-row">
          <h2 className="panel-title">Dates</h2>
          <Button variant="subtle" size="sm" onClick={onSelectAllDates} disabled={allDatesSelected}>
            Select all
          </Button>
        </div>
        <div className="chip-row">
          {availableDates.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={selectedDates.has(d)}
              className={"chip" + (selectedDates.has(d) ? " active" : "")}
              onClick={() => onToggleDate(d)}
            >
              {formatDateLabel(d)}
            </button>
          ))}
        </div>
      </section>

      {viewMode === "overview" ? (
        <section className="panel-section" data-tour="layer">
          <h2 className="panel-title">Heatmap layer</h2>
          <div className="option-list" role="radiogroup" aria-label="Heatmap layer">
            {HEATMAP_LAYERS.map(([cat, label]) => (
              <label key={cat} className="option">
                <input
                  type="radio"
                  name="heatmap-cat"
                  checked={heatmapCategory === cat}
                  onChange={() => onSetHeatmapCategory(cat)}
                />
                <span className="option-label">{label}</span>
              </label>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel-section match-list-section" data-tour="matches">
          <div className="panel-title-row">
            <h2 className="panel-title">Matches</h2>
            <span className="count-pill">{matches.length}</span>
          </div>
          <div className="match-list">
            {matches.length === 0 && (
              <div className="empty-state">No matches for these dates. Select another date to see matches.</div>
            )}
            {matches.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-current={m.id === selectedMatchId}
                className={"match-card" + (m.id === selectedMatchId ? " active" : "")}
                onClick={() => onSelectMatch(m.id)}
              >
                <span className="match-card-top">
                  <span className="match-time">{formatClock(m.startMs)}</span>
                  <span className="match-duration">{formatDuration(m.durationSec)}</span>
                </span>
                <span className="match-card-bottom">
                  <span className="actor-chip" title={`${m.humans} humans`}>
                    <ActorIcon kind="human" size={13} />
                    {m.humans}
                  </span>
                  <span className="actor-chip" title={`${m.bots} bots`}>
                    <ActorIcon kind="bot" size={13} />
                    {m.bots}
                  </span>
                  {m.kills + m.deaths > 0 && <span className="lozenge lozenge-combat">{m.kills + m.deaths} combat</span>}
                  {m.stormDeaths > 0 && <span className="lozenge lozenge-storm">{m.stormDeaths} storm</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}

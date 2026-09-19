import type { HeatmapCategory, MapId, Manifest, MatchSummary, ViewMode } from "../lib/types";

interface Props {
  manifest: Manifest;
  selectedMap: MapId;
  onSelectMap: (m: MapId) => void;
  viewMode: ViewMode;
  onSetViewMode: (v: ViewMode) => void;
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
  onSetViewMode,
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
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Map</div>
        <div className="map-tabs">
          {(Object.keys(manifest.maps) as MapId[]).map((m) => (
            <button
              key={m}
              className={"map-tab" + (m === selectedMap ? " active" : "")}
              onClick={() => onSelectMap(m)}
            >
              {MAP_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">View</div>
        <div className="segmented">
          <button
            className={"segmented-btn" + (viewMode === "overview" ? " active" : "")}
            onClick={() => onSetViewMode("overview")}
          >
            Heatmap Overview
          </button>
          <button
            className={"segmented-btn" + (viewMode === "playback" ? " active" : "")}
            onClick={() => onSetViewMode("playback")}
          >
            Match Playback
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label-row">
          <span className="sidebar-label">Dates</span>
          <button className="link-btn" onClick={onSelectAllDates}>
            all
          </button>
        </div>
        <div className="date-chips">
          {availableDates.map((d) => (
            <button
              key={d}
              className={"date-chip" + (selectedDates.has(d) ? " active" : "")}
              onClick={() => onToggleDate(d)}
            >
              {formatDateLabel(d)}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "overview" ? (
        <div className="sidebar-section">
          <div className="sidebar-label">Heatmap layer</div>
          <div className="radio-list">
            {(
              [
                ["traffic", "High-traffic areas"],
                ["kill", "Kill zones"],
                ["death", "Death zones"],
                ["storm", "Storm deaths"],
                ["loot", "Loot pickups"],
              ] as [HeatmapCategory, string][]
            ).map(([cat, label]) => (
              <label key={cat} className="radio-row">
                <input
                  type="radio"
                  name="heatmap-cat"
                  checked={heatmapCategory === cat}
                  onChange={() => onSetHeatmapCategory(cat)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="sidebar-section match-list-section">
          <div className="sidebar-label-row">
            <span className="sidebar-label">Matches</span>
            <span className="sidebar-count">{matches.length}</span>
          </div>
          <div className="match-list">
            {matches.length === 0 && <div className="empty-hint">No matches for this selection.</div>}
            {matches.map((m) => (
              <button
                key={m.id}
                className={"match-row" + (m.id === selectedMatchId ? " active" : "")}
                onClick={() => onSelectMatch(m.id)}
              >
                <div className="match-row-top">
                  <span className="match-time">{formatClock(m.startMs)}</span>
                  <span className="match-duration">{formatDuration(m.durationSec)}</span>
                </div>
                <div className="match-row-bottom">
                  <span className="badge badge-human">{m.humans}H</span>
                  <span className="badge badge-bot">{m.bots}B</span>
                  {m.kills + m.deaths > 0 && <span className="badge badge-kill">{m.kills + m.deaths} combat</span>}
                  {m.stormDeaths > 0 && <span className="badge badge-storm">{m.stormDeaths} storm</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

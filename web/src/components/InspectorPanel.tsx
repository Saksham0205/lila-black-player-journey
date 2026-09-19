import type { EventCategory, HeatmapCategory, MatchDetail, MatchSummary, ViewMode } from "../lib/types";
import { colors } from "../lib/theme";

interface Props {
  viewMode: ViewMode;
  showHumans: boolean;
  onToggleHumans: () => void;
  showBots: boolean;
  onToggleBots: () => void;
  visibleCategories: Set<EventCategory>;
  onToggleCategory: (c: EventCategory) => void;
  heatmapCategory: HeatmapCategory;
  overviewMatchCount: number;
  overviewPointCount: number;
  matchSummary: MatchSummary | null;
  matchDetail: MatchDetail | null;
  focusedPlayer: number | null;
  onFocusPlayer: (i: number | null) => void;
}

const CATS: { key: EventCategory; color: string; label: string; glyph: string }[] = [
  { key: "kill", color: colors.kill, label: "Kill", glyph: "⊕" },
  { key: "death", color: colors.death, label: "Death", glyph: "✕" },
  { key: "storm", color: colors.storm, label: "Storm Death", glyph: "◔" },
  { key: "loot", color: colors.loot, label: "Loot", glyph: "◆" },
];

const HEATMAP_LABEL: Record<HeatmapCategory, string> = {
  traffic: "movement samples",
  kill: "kills",
  death: "deaths",
  storm: "storm deaths",
  loot: "loot pickups",
};

export default function InspectorPanel({
  viewMode,
  showHumans,
  onToggleHumans,
  showBots,
  onToggleBots,
  visibleCategories,
  onToggleCategory,
  heatmapCategory,
  overviewMatchCount,
  overviewPointCount,
  matchSummary,
  matchDetail,
  focusedPlayer,
  onFocusPlayer,
}: Props) {
  return (
    <aside className="inspector">
      <div className="sidebar-section">
        <div className="sidebar-label">Actors</div>
        <label className="check-row">
          <input type="checkbox" checked={showHumans} onChange={onToggleHumans} />
          <span className="swatch" style={{ background: colors.human }} />
          Humans
        </label>
        <label className="check-row">
          <input type="checkbox" checked={showBots} onChange={onToggleBots} />
          <span className="swatch swatch-bot" style={{ background: colors.bot }} />
          Bots
        </label>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Event types</div>
        {CATS.map((c) => (
          <label className="check-row" key={c.key}>
            <input
              type="checkbox"
              checked={visibleCategories.has(c.key)}
              onChange={() => onToggleCategory(c.key)}
              disabled={viewMode !== "playback"}
            />
            <span className="glyph-key" style={{ color: c.color }}>
              {c.glyph}
            </span>
            {c.label}
          </label>
        ))}
        {viewMode !== "playback" && <div className="hint-text">Select a match to filter by event type.</div>}
      </div>

      <div className="sidebar-section stats-section">
        <div className="sidebar-label">Stats</div>
        {viewMode === "overview" ? (
          <ul className="stat-list">
            <li>
              <span>Matches in view</span>
              <b>{overviewMatchCount}</b>
            </li>
            <li>
              <span>Plotted {HEATMAP_LABEL[heatmapCategory]}</span>
              <b>{overviewPointCount.toLocaleString()}</b>
            </li>
          </ul>
        ) : matchSummary ? (
          <ul className="stat-list">
            <li>
              <span>Humans / Bots</span>
              <b>
                {matchSummary.humans} / {matchSummary.bots}
              </b>
            </li>
            <li>
              <span>Kills logged</span>
              <b>{matchSummary.kills}</b>
            </li>
            <li>
              <span>Deaths logged</span>
              <b>{matchSummary.deaths}</b>
            </li>
            <li>
              <span>Storm deaths</span>
              <b>{matchSummary.stormDeaths}</b>
            </li>
            <li>
              <span>Loot events</span>
              <b>{matchSummary.loot}</b>
            </li>
            <li>
              <span>Duration</span>
              <b>
                {Math.floor(matchSummary.durationSec / 60)}m {matchSummary.durationSec % 60}s
              </b>
            </li>
          </ul>
        ) : (
          <div className="hint-text">Pick a match from the left to see its stats.</div>
        )}
      </div>

      {matchDetail && (
        <div className="sidebar-section roster-section">
          <div className="sidebar-label-row">
            <span className="sidebar-label">Players</span>
            <span className="sidebar-count">{matchDetail.players.length}</span>
          </div>
          <div className="roster-list">
            {matchDetail.players.map((p, idx) => (
              <button
                key={p.id + idx}
                className={"roster-row" + (focusedPlayer === idx ? " active" : "")}
                onMouseEnter={() => onFocusPlayer(idx)}
                onMouseLeave={() => onFocusPlayer(null)}
                onClick={() => onFocusPlayer(focusedPlayer === idx ? null : idx)}
              >
                <span className="swatch" style={{ background: p.bot ? colors.bot : colors.human }} />
                <span className="roster-id">{p.bot ? `Bot ${p.id}` : p.id.slice(0, 8)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

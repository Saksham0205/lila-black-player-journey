import type { ReactNode } from "react";
import type { EventCategory, HeatmapCategory, MatchDetail, MatchSummary, ViewMode } from "../lib/types";
import { ActorIcon, EventIcon, IconTile } from "./Icons";

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

const CATS: { key: EventCategory; label: string }[] = [
  { key: "kill", label: "Kill" },
  { key: "death", label: "Death" },
  { key: "storm", label: "Storm death" },
  { key: "loot", label: "Loot" },
];

const HEATMAP_LABEL: Record<HeatmapCategory, string> = {
  traffic: "Movement samples",
  kill: "Kills",
  death: "Deaths",
  storm: "Storm deaths",
  loot: "Loot pickups",
};

function Stat({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">
        {icon}
        {label}
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

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
  const inPlayback = viewMode === "playback";

  return (
    <aside className="inspector" aria-label="Display options">
      <section className="panel-section" data-tour="actors">
        <h2 className="panel-title">Actors</h2>
        <div className="option-list">
          <label className="option">
            <input type="checkbox" checked={showHumans} onChange={onToggleHumans} />
            <IconTile size={24}>
              <ActorIcon kind="human" size={15} />
            </IconTile>
            <span className="option-label">Humans</span>
          </label>
          <label className="option">
            <input type="checkbox" checked={showBots} onChange={onToggleBots} />
            <IconTile size={24}>
              <ActorIcon kind="bot" size={15} />
            </IconTile>
            <span className="option-label">Bots</span>
          </label>
        </div>
      </section>

      <section className="panel-section" data-tour="events">
        <h2 className="panel-title">Events</h2>
        <div className="option-list">
          {CATS.map((c) => (
            <label className="option" key={c.key}>
              <input
                type="checkbox"
                checked={visibleCategories.has(c.key)}
                onChange={() => onToggleCategory(c.key)}
                disabled={!inPlayback}
              />
              <IconTile size={24}>
                <EventIcon cat={c.key} size={15} />
              </IconTile>
              <span className="option-label">{c.label}</span>
            </label>
          ))}
        </div>
        {!inPlayback && <p className="hint-text">Event filters apply in Match playback.</p>}
      </section>

      <section className="panel-section">
        <h2 className="panel-title">Stats</h2>
        {!inPlayback ? (
          <div className="stat-grid stat-grid-single">
            <Stat label="Matches" value={overviewMatchCount.toLocaleString()} />
            <Stat label={HEATMAP_LABEL[heatmapCategory]} value={overviewPointCount.toLocaleString()} />
          </div>
        ) : matchSummary ? (
          <div className="stat-grid">
            <Stat label="Humans" value={matchSummary.humans} icon={<ActorIcon kind="human" size={14} />} />
            <Stat label="Bots" value={matchSummary.bots} icon={<ActorIcon kind="bot" size={14} />} />
            <Stat label="Kills" value={matchSummary.kills} icon={<EventIcon cat="kill" size={14} />} />
            <Stat label="Deaths" value={matchSummary.deaths} icon={<EventIcon cat="death" size={14} />} />
            <Stat label="Storm deaths" value={matchSummary.stormDeaths} icon={<EventIcon cat="storm" size={14} />} />
            <Stat label="Loot" value={matchSummary.loot} icon={<EventIcon cat="loot" size={14} />} />
            <Stat
              label="Duration"
              value={`${Math.floor(matchSummary.durationSec / 60)}m ${matchSummary.durationSec % 60}s`}
            />
          </div>
        ) : (
          <p className="hint-text">Select a match to see its stats.</p>
        )}
      </section>

      {matchDetail && (
        <section className="panel-section roster-section">
          <div className="panel-title-row">
            <h2 className="panel-title">Players</h2>
            <span className="count-pill">{matchDetail.players.length}</span>
          </div>
          <div className="roster-list">
            {matchDetail.players.map((p, idx) => (
              <button
                key={p.id + idx}
                type="button"
                aria-pressed={focusedPlayer === idx}
                className={"roster-row" + (focusedPlayer === idx ? " active" : "")}
                onMouseEnter={() => onFocusPlayer(idx)}
                onMouseLeave={() => onFocusPlayer(null)}
                onClick={() => onFocusPlayer(focusedPlayer === idx ? null : idx)}
              >
                <IconTile size={24}>
                  <ActorIcon kind={p.bot ? "bot" : "human"} size={15} />
                </IconTile>
                <span className="roster-id">{p.bot ? `Bot ${p.id}` : p.id.slice(0, 8)}</span>
                <span className="roster-kind">{p.bot ? "Bot" : "Human"}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}

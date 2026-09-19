import type { ViewMode } from "../lib/types";
import type { Theme } from "../lib/useTheme";
import { ActorIcon, HeatmapIcon, HelpIcon, MoonIcon, PlaybackIcon, SunIcon } from "./Icons";
import { Button } from "./ui";

interface Props {
  viewMode: ViewMode;
  onSetViewMode: (v: ViewMode) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onStartTour: () => void;
}

const TABS: { id: ViewMode; label: string; icon: JSX.Element }[] = [
  { id: "overview", label: "Heatmap", icon: <HeatmapIcon /> },
  { id: "playback", label: "Match playback", icon: <PlaybackIcon /> },
];

export default function Header({ viewMode, onSetViewMode, theme, onToggleTheme, onStartTour }: Props) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <ActorIcon kind="human" size={16} color="#fff" />
        </span>
        <div className="brand-text">
          <span className="brand-name">Player Journey Explorer</span>
          <span className="brand-sub">LILA BLACK telemetry</span>
        </div>
      </div>

      <nav className="tabs" role="tablist" aria-label="View" data-tour="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={viewMode === t.id}
            className={"tab" + (viewMode === t.id ? " active" : "")}
            onClick={() => onSetViewMode(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <Button variant="subtle" icon={<HelpIcon />} onClick={onStartTour}>
          Take the tour
        </Button>
        <Button
          variant="subtle"
          iconOnly
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </Button>
      </div>
    </header>
  );
}

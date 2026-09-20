import { useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import Sidebar from "./components/Sidebar";
import MapCanvas from "./components/MapCanvas";
import Timeline from "./components/Timeline";
import InspectorPanel from "./components/InspectorPanel";
import Header from "./components/Header";
import Tour, { hasSeenTour, markTourSeen } from "./components/Tour";
import { loadAggregate, loadManifest, loadMatch } from "./lib/api";
import { usePlayback } from "./lib/usePlayback";
import { useTheme } from "./lib/useTheme";
import type {
  EventCategory,
  HeatmapCategory,
  Manifest,
  MapId,
  MatchDetail,
  ViewMode,
} from "./lib/types";

const ALL_CATEGORIES: EventCategory[] = ["kill", "death", "storm", "loot"];

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [tourOpen, setTourOpen] = useState(() => !hasSeenTour());
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedMap, setSelectedMap] = useState<MapId>("AmbroseValley");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("playback");
  const [heatmapCategory, setHeatmapCategory] = useState<HeatmapCategory>("traffic");

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchDetail, setMatchDetail] = useState<MatchDetail | null>(null);

  const [showHumans, setShowHumans] = useState(true);
  const [showBots, setShowBots] = useState(true);
  const [visibleCategories, setVisibleCategories] = useState<Set<EventCategory>>(new Set(ALL_CATEGORIES));
  const [focusedPlayer, setFocusedPlayer] = useState<number | null>(null);

  const [heatmapPoints, setHeatmapPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    loadManifest()
      .then((m) => {
        setManifest(m);
        const datesForMap = m.matches.filter((x) => x.map === "AmbroseValley").map((x) => x.date);
        setSelectedDates(new Set(datesForMap));
      })
      .catch((e) => setError(String(e)));
  }, []);

  const availableDatesForMap = useMemo(() => {
    if (!manifest) return [];
    const set = new Set(manifest.matches.filter((m) => m.map === selectedMap).map((m) => m.date));
    return manifest.dates.filter((d) => set.has(d));
  }, [manifest, selectedMap]);

  const filteredMatches = useMemo(() => {
    if (!manifest) return [];
    return manifest.matches.filter((m) => m.map === selectedMap && selectedDates.has(m.date));
  }, [manifest, selectedMap, selectedDates]);

  // Reset per-map selections when the map changes.
  function handleSelectMap(m: MapId) {
    setSelectedMap(m);
    if (!manifest) return;
    const dates = new Set(manifest.matches.filter((x) => x.map === m).map((x) => x.date));
    setSelectedDates(dates);
    setSelectedMatchId(null);
    setMatchDetail(null);
    setFocusedPlayer(null);
  }

  function toggleDate(d: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function selectAllDates() {
    setSelectedDates(new Set(availableDatesForMap));
  }

  // Auto-pick a match when entering playback mode (or filters change it away).
  useEffect(() => {
    if (viewMode !== "playback") return;
    if (selectedMatchId && filteredMatches.some((m) => m.id === selectedMatchId)) return;
    setSelectedMatchId(filteredMatches[0]?.id ?? null);
  }, [viewMode, filteredMatches, selectedMatchId]);

  // Load full match detail when selection changes.
  useEffect(() => {
    if (!selectedMatchId || !manifest) {
      setMatchDetail(null);
      return;
    }
    const summary = manifest.matches.find((m) => m.id === selectedMatchId);
    if (!summary) return;
    let cancelled = false;
    loadMatch(summary.id, summary.file).then((d) => {
      if (!cancelled) setMatchDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMatchId, manifest]);

  const selectedSummary = useMemo(
    () => manifest?.matches.find((m) => m.id === selectedMatchId) ?? null,
    [manifest, selectedMatchId]
  );

  const { currentSec, isPlaying, speed, setSpeed, seek, toggle } = usePlayback(selectedSummary?.durationSec ?? 0);

  // Build the aggregate heatmap point set for the current map/date-filter/category.
  useEffect(() => {
    if (viewMode !== "overview") return;
    let cancelled = false;
    Promise.all(Array.from(selectedDates).map((d) => loadAggregate(selectedMap, d))).then((rows) => {
      if (cancelled) return;
      const pts: [number, number][] = [];
      for (const row of rows) pts.push(...row[heatmapCategory]);
      setHeatmapPoints(pts);
    });
    return () => {
      cancelled = true;
    };
  }, [viewMode, selectedMap, selectedDates, heatmapCategory]);

  function closeTour() {
    markTourSeen();
    setTourOpen(false);
  }

  function toggleCategory(c: EventCategory) {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  if (error) {
    return <div className="app-error">Failed to load data: {error}</div>;
  }
  if (!manifest) {
    return <div className="app-loading">Loading telemetry…</div>;
  }

  const mapConfig = manifest.maps[selectedMap];

  return (
    <div className="app">
      <Header
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onStartTour={() => setTourOpen(true)}
      />
      <Tour open={tourOpen} viewMode={viewMode} onSetViewMode={setViewMode} onClose={closeTour} />
      <div className="app-body">
        <Sidebar
          manifest={manifest}
          selectedMap={selectedMap}
          onSelectMap={handleSelectMap}
          viewMode={viewMode}
          availableDates={availableDatesForMap}
          selectedDates={selectedDates}
          onToggleDate={toggleDate}
          onSelectAllDates={selectAllDates}
          heatmapCategory={heatmapCategory}
          onSetHeatmapCategory={setHeatmapCategory}
          matches={filteredMatches}
          selectedMatchId={selectedMatchId}
          onSelectMatch={setSelectedMatchId}
        />
        <main className="stage" data-tour="stage">
          <MapCanvas
            mapConfig={mapConfig}
            mode={viewMode}
            heatmapPoints={viewMode === "overview" ? heatmapPoints : undefined}
            heatmapVisible={viewMode === "overview"}
            match={matchDetail}
            currentSec={currentSec}
            showHumans={showHumans}
            showBots={showBots}
            visibleCategories={visibleCategories}
            focusedPlayer={focusedPlayer}
            onFocusPlayer={setFocusedPlayer}
          />
          {viewMode === "playback" && selectedSummary && (
            <Timeline
              currentSec={currentSec}
              durationSec={selectedSummary.durationSec}
              isPlaying={isPlaying}
              speed={speed}
              onToggle={toggle}
              onSeek={seek}
              onSetSpeed={setSpeed}
            />
          )}
        </main>
        <InspectorPanel
          viewMode={viewMode}
          showHumans={showHumans}
          onToggleHumans={() => setShowHumans((v) => !v)}
          showBots={showBots}
          onToggleBots={() => setShowBots((v) => !v)}
          visibleCategories={visibleCategories}
          onToggleCategory={toggleCategory}
          heatmapCategory={heatmapCategory}
          overviewMatchCount={filteredMatches.length}
          overviewPointCount={heatmapPoints.length}
          matchSummary={selectedSummary}
          matchDetail={matchDetail}
          focusedPlayer={focusedPlayer}
          onFocusPlayer={setFocusedPlayer}
        />
      </div>
      <Analytics />
    </div>
  );
}

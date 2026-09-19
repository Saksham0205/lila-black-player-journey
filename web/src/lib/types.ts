export type MapId = "AmbroseValley" | "GrandRift" | "Lockdown";

export interface MapConfig {
  scale: number;
  originX: number;
  originZ: number;
  image: string;
}

export interface MatchSummary {
  id: string;
  map: MapId;
  date: string; // ISO date, e.g. "2026-02-10"
  startMs: number;
  durationSec: number;
  humans: number;
  bots: number;
  kills: number;
  deaths: number;
  stormDeaths: number;
  loot: number;
  file: string;
}

export interface Manifest {
  maps: Record<MapId, MapConfig>;
  dates: string[];
  matches: MatchSummary[];
}

export interface Player {
  id: string;
  bot: boolean;
}

/** [tSec, x, z] relative to match start */
export type PathPoint = [number, number, number];

export type EventCategory = "kill" | "death" | "storm" | "loot";

/** [tSec, x, z, category, playerIndex] */
export type MatchEvent = [number, number, number, EventCategory, number];

export interface MatchDetail {
  id: string;
  map: MapId;
  date: string;
  startMs: number;
  durationSec: number;
  players: Player[];
  paths: PathPoint[][];
  events: MatchEvent[];
}

export interface AggregateData {
  map: MapId;
  date: string;
  traffic: [number, number][];
  kill: [number, number][];
  death: [number, number][];
  storm: [number, number][];
  loot: [number, number][];
}

export type ViewMode = "overview" | "playback";
export type HeatmapCategory = "traffic" | "kill" | "death" | "storm" | "loot";

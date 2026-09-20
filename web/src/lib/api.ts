import type { AggregateData, Manifest, MapId, MatchDetail } from "./types";

const base = import.meta.env.BASE_URL;

const matchCache = new Map<string, Promise<MatchDetail>>();
const aggCache = new Map<string, Promise<AggregateData>>();
let manifestPromise: Promise<Manifest> | null = null;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise = getJson<Manifest>(`${base}data/manifest.json`);
  }
  return manifestPromise;
}

export function loadMatch(matchId: string, file: string): Promise<MatchDetail> {
  let p = matchCache.get(matchId);
  if (!p) {
    p = getJson<MatchDetail>(`${base}data/${file}`);
    matchCache.set(matchId, p);
  }
  return p;
}

function emptyAggregate(map: MapId, date: string): AggregateData {
  return { map, date, traffic: [], kill: [], death: [], storm: [], loot: [] };
}

export function loadAggregate(map: MapId, date: string): Promise<AggregateData> {
  const key = `${map}/${date}`;
  let p = aggCache.get(key);
  if (!p) {
    const safeDate = date.replace(/-/g, "");
    // aggregate file as "no data that day" rather than an error.
    p = getJson<AggregateData>(`${base}data/aggregates/${map}/${safeDate}.json`).catch(() =>
      emptyAggregate(map, date)
    );
    aggCache.set(key, p);
  }
  return p;
}

export function minimapUrl(image: string): string {
  return `${base}${image}`;
}

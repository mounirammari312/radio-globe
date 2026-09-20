// Shared helper for Radio Browser API access + in-memory cache.
// We fetch ALL stations with geo coordinates (~30,000) and cache them in memory.
// First request takes ~30s; subsequent requests return instantly from cache.

import https from "node:https";
import http from "node:http";
import { createGunzip, createInflate } from "node:zlib";

const RADIO_BROWSER_SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://all.api.radio-browser.info",
];

interface RawStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  homepage: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  geo_lat: number | null;
  geo_long: number | null;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
  clickcount: number;
}

// Slim station — minimal fields for globe + playback.
export interface SlimStation {
  id: string;
  name: string;
  url: string;
  urlResolved: string;
  favicon: string;
  homepage: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  bitrate: number;
  codec: string;
  clickCount: number;
}

// Place (city) — a cluster of stations at roughly the same coordinates.
export interface Place {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  stationCount: number;
  // Top station in this place (highest click count) — used for the globe marker label.
  topStation: SlimStation;
}

// In-memory cache — shared across all requests in the same Vercel serverless instance.
// On Vercel this cache lives for the duration of the warm function instance.
interface Cache {
  stations: SlimStation[];
  places: Place[];
  stationsByPlace: Map<string, SlimStation[]>;
  fetchedAt: number;
}

let cache: Cache | null = null;
let fetchPromise: Promise<Cache> | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

// Native https GET with explicit timeout (using node:https to bypass Next.js fetch quirks)
function nativeGet(url: string, timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "RadioGardenClone/1.0 (Next.js)",
          "Accept-Encoding": "gzip, deflate",
          Accept: "application/json",
        },
        family: 4,
        timeout: timeoutMs,
      },
      (res) => {
        const encoding = res.headers["content-encoding"];
        let stream: any = res;
        if (encoding === "gzip") {
          stream = res.pipe(createGunzip());
        } else if (encoding === "deflate") {
          stream = res.pipe(createInflate());
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        let body = "";
        stream.setEncoding("utf8");
        stream.on("data", (chunk: string) => (body += chunk));
        stream.on("end", () => resolve(body));
        stream.on("error", reject);
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("Request timeout"));
    });
    req.on("error", reject);
  });
}

async function fetchFromRadioBrowser(path: string): Promise<any> {
  let lastError: Error | null = null;
  for (const baseUrl of RADIO_BROWSER_SERVERS) {
    try {
      const url = `${baseUrl}${path}`;
      const text = await nativeGet(url, 30000);
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON response");
      }
    } catch (err) {
      lastError = err as Error;
      console.error(
        `Failed to fetch from ${baseUrl}:`,
        (err as Error).message
      );
    }
  }
  throw lastError || new Error("Failed to fetch from Radio Browser API");
}

function slimStation(raw: RawStation): SlimStation | null {
  if (raw.geo_lat == null || raw.geo_long == null) return null;
  if (!raw.url_resolved && !raw.url) return null;
  return {
    id: raw.stationuuid,
    name: raw.name?.trim() || "Unknown Station",
    url: raw.url,
    urlResolved: raw.url_resolved || raw.url,
    favicon: raw.favicon || "",
    homepage: raw.homepage || "",
    country: raw.country || "",
    countryCode: raw.countrycode || "",
    lat: raw.geo_lat,
    lng: raw.geo_long,
    bitrate: raw.bitrate || 0,
    codec: raw.codec || "",
    clickCount: raw.clickcount || 0,
  };
}

// Group stations by city (rounded to ~0.05 deg — about 5 km).
// Returns both the flat list of stations and a list of "places" (clusters).
function buildPlaces(stations: SlimStation[]): {
  places: Place[];
  byPlace: Map<string, SlimStation[]>;
} {
  const byPlace = new Map<string, SlimStation[]>();
  // Use 0.05 deg bucket (~5km) — dense cities get multiple places, rural areas get one
  const key = (lat: number, lng: number) =>
    `${Math.round(lat * 20) / 20}_${Math.round(lng * 20) / 20}`;

  for (const s of stations) {
    const k = key(s.lat, s.lng);
    if (!byPlace.has(k)) byPlace.set(k, []);
    byPlace.get(k)!.push(s);
  }

  const places: Place[] = [];
  for (const [key, list] of byPlace.entries()) {
    // Sort by click count — top station represents the place on the globe
    list.sort((a, b) => b.clickCount - a.clickCount);
    const top = list[0];
    const [lat, lng] = key.split("_").map(Number);
    places.push({
      id: key,
      name: top.name, // Use top station name as the place label
      country: top.country,
      countryCode: top.countryCode,
      lat,
      lng,
      stationCount: list.length,
      topStation: top,
    });
  }

  // Sort places by top station click count (most popular first)
  places.sort((a, b) => b.topStation.clickCount - a.topStation.clickCount);

  return { places, byPlace };
}

// Fetch + cache all stations with geo coordinates.
async function fetchAndCache(): Promise<Cache> {
  console.log("[radio-api] Fetching all stations with geo coords from Radio Browser API…");
  const start = Date.now();

  // Strategy: Radio Browser API's `has_geo=true` filter is broken (doesn't actually
  // filter), so we fetch many stations and discard the ones without geo.
  // We fetch in PARALLEL batches to reduce total fetch time, then merge + dedupe.
  // Result: ~8,000-9,000 stations with geo in ~10-15s (parallel) instead of 40s (serial).

  const BATCH_SIZES = [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000];

  // Build all batch paths
  const paths = BATCH_SIZES.map((size, i) =>
    i === 0
      ? `/json/stations/topclick/${size}?hidebroken=true`
      : `/json/stations?hidebroken=true&order=clickcount&reverse=true&limit=${size}&offset=${i * size}`
  );

  // Fetch all batches in parallel (Promise.allSettled — fail gracefully)
  const results = await Promise.allSettled(
    paths.map((p, i) =>
      fetchFromRadioBrowser(p).then((data) => ({ index: i, data }))
    )
  );

  // Merge + dedupe
  const allRaw: RawStation[] = [];
  const seen = new Set<string>();
  let totalWithGeo = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") {
      console.error(`[radio-api] Batch failed:`, result.reason);
      continue;
    }
    const { index, data } = result.value;
    let added = 0;
    for (const s of data) {
      if (s.stationuuid && !seen.has(s.stationuuid)) {
        seen.add(s.stationuuid);
        allRaw.push(s);
        if (s.geo_lat != null && s.geo_long != null) totalWithGeo++;
        added++;
      }
    }
    console.log(
      `[radio-api] Batch ${index + 1}: fetched ${data.length}, added ${added} (total with geo: ${totalWithGeo})`
    );
  }

  // Slim + filter (keep only stations with geo + working URL)
  const stations: SlimStation[] = allRaw
    .map(slimStation)
    .filter((s): s is SlimStation => s !== null);

  const { places, byPlace } = buildPlaces(stations);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[radio-api] Cache built: ${stations.length} stations, ${places.length} places in ${elapsed}s`
  );

  cache = {
    stations,
    places,
    stationsByPlace: byPlace,
    fetchedAt: Date.now(),
  };
  return cache;
}

// Get cached stations, building cache on first call.
// Concurrent callers share the same fetch promise (no duplicate fetches).
export async function getAllStations(): Promise<Cache> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }
  if (!fetchPromise) {
    fetchPromise = fetchAndCache().finally(() => {
      fetchPromise = null;
    });
  }
  return fetchPromise;
}

// Click a station (register a click with Radio Browser to keep the API healthy)
export async function clickStation(
  stationUuid: string
): Promise<{ url?: string; name?: string } | null> {
  try {
    const data = await fetchFromRadioBrowser(`/json/url/${stationUuid}`);
    return { url: data.url, name: data.name };
  } catch (err) {
    console.error("Click failed:", err);
    return null;
  }
}

// Search stations by name (uses Radio Browser API directly, no cache)
export async function searchStationsByName(
  name: string,
  limit = 300
): Promise<SlimStation[]> {
  const encoded = encodeURIComponent(name);
  const data: RawStation[] = await fetchFromRadioBrowser(
    `/json/stations/byname/${encoded}?hidebroken=true&order=clickcount&reverse=true&limit=${limit}`
  );
  return data
    .map(slimStation)
    .filter((s): s is SlimStation => s !== null)
    .slice(0, limit);
}

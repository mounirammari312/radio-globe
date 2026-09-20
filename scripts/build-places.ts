/**
 * Pre-build script: fetches all stations with geo coords from Radio Browser API,
 * groups them into places (city clusters), and writes static JSON files to public/data/.
 *
 * Run during build via "bun run scripts/build-places.ts".
 *
 * Output files:
 *   public/data/places.json         — list of {id, name, country, lat, lng, stationCount, topStation}
 *   public/data/stations.json       — full flat list of stations (grouped by place via id)
 *   public/data/countries.json      — list of countries with station counts
 *
 * This makes the runtime API instant (<50ms) — no network calls to Radio Browser at request time.
 * Re-run this script weekly (cron job on Vercel) to refresh the dataset.
 */

import https from "node:https";
import { createGunzip, createInflate } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

interface SlimStation {
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
  tags: string[];
}

interface Place {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  stationCount: number;
  top: SlimStation;
}

function nativeGet(url: string, timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "RadioGardenClone/1.0 (build script)",
          "Accept-Encoding": "gzip, deflate",
          Accept: "application/json",
        },
        family: 4,
        timeout: timeoutMs,
      },
      (res) => {
        const encoding = res.headers["content-encoding"];
        let stream: any = res;
        if (encoding === "gzip") stream = res.pipe(createGunzip());
        else if (encoding === "deflate") stream = res.pipe(createInflate());

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
    req.on("timeout", () => req.destroy(new Error("Request timeout")));
    req.on("error", reject);
  });
}

async function fetchFromRadioBrowser(path: string): Promise<any> {
  let lastError: Error | null = null;
  for (const baseUrl of RADIO_BROWSER_SERVERS) {
    try {
      const text = await nativeGet(`${baseUrl}${path}`);
      return JSON.parse(text);
    } catch (err) {
      lastError = err as Error;
      console.error(`Failed to fetch from ${baseUrl}:`, (err as Error).message);
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
    tags: raw.tags
      ? raw.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [],
  };
}

function buildPlaces(stations: SlimStation[]): {
  places: Place[];
  byPlace: Map<string, SlimStation[]>;
} {
  const byPlace = new Map<string, SlimStation[]>();
  // 0.05 deg bucket (~5 km)
  const key = (lat: number, lng: number) =>
    `${Math.round(lat * 20) / 20}_${Math.round(lng * 20) / 20}`;

  for (const s of stations) {
    const k = key(s.lat, s.lng);
    if (!byPlace.has(k)) byPlace.set(k, []);
    byPlace.get(k)!.push(s);
  }

  const places: Place[] = [];
  for (const [key, list] of byPlace.entries()) {
    list.sort((a, b) => b.clickCount - a.clickCount);
    const top = list[0];
    const [lat, lng] = key.split("_").map(Number);
    places.push({
      id: key,
      name: top.name,
      country: top.country,
      countryCode: top.countryCode,
      lat,
      lng,
      stationCount: list.length,
      top,
    });
  }
  places.sort((a, b) => b.top.clickCount - a.top.clickCount);
  return { places, byPlace };
}

async function main() {
  console.log("▶ Fetching all stations with geo coords from Radio Browser API…");
  const start = Date.now();

  // 8 parallel batches × 5000 stations = up to 40,000 raw stations
  const BATCH_SIZES = [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000];
  const paths = BATCH_SIZES.map((size, i) =>
    i === 0
      ? `/json/stations/topclick/${size}?hidebroken=true`
      : `/json/stations?hidebroken=true&order=clickcount&reverse=true&limit=${size}&offset=${i * size}`
  );

  const results = await Promise.allSettled(
    paths.map((p, i) =>
      fetchFromRadioBrowser(p).then((data) => ({ index: i, data }))
    )
  );

  const allRaw: RawStation[] = [];
  const seen = new Set<string>();
  let totalWithGeo = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") {
      console.error(`Batch failed:`, (result as any).reason);
      continue;
    }
    const { index, data } = (result as any).value;
    let added = 0;
    for (const s of data) {
      if (s.stationuuid && !seen.has(s.stationuuid)) {
        seen.add(s.stationuuid);
        allRaw.push(s);
        if (s.geo_lat != null && s.geo_long != null) totalWithGeo++;
        added++;
      }
    }
    console.log(`Batch ${index + 1}: fetched ${data.length}, added ${added} (total with geo: ${totalWithGeo})`);
  }

  const stations: SlimStation[] = allRaw
    .map(slimStation)
    .filter((s): s is SlimStation => s !== null);

  const { places, byPlace } = buildPlaces(stations);

  // Also fetch countries
  let countries: Array<{ name: string; code: string; stationCount: number }> = [];
  try {
    const rawCountries = await fetchFromRadioBrowser(
      "/json/countries?hidebroken=true&order=stationcount&reverse=true"
    );
    countries = rawCountries
      .map((c: any) => ({
        name: c.name,
        code: c.iso_3166_1,
        stationCount: c.stationcount,
      }))
      .filter((c: any) => c.stationCount > 0);
  } catch (err) {
    console.error("Failed to fetch countries:", err);
  }

  // Write files
  const publicDir = join(process.cwd(), "public", "data");
  mkdirSync(publicDir, { recursive: true });

  // places.json — for the globe markers (small, no station list per place)
  writeFileSync(
    join(publicDir, "places.json"),
    JSON.stringify({
      count: places.length,
      totalStations: stations.length,
      generatedAt: new Date().toISOString(),
      places: places.map((p) => ({
        id: p.id,
        name: p.name,
        country: p.country,
        countryCode: p.countryCode,
        lat: p.lat,
        lng: p.lng,
        stationCount: p.stationCount,
        top: p.top,
      })),
    })
  );

  // stations.json — full list of stations (used for sidebar listing per place)
  writeFileSync(
    join(publicDir, "stations.json"),
    JSON.stringify({
      count: stations.length,
      stations,
    })
  );

  // countries.json — for country filtering in search
  writeFileSync(
    join(publicDir, "countries.json"),
    JSON.stringify({
      count: countries.length,
      countries,
    })
  );

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `✓ Done in ${elapsed}s: ${stations.length} stations, ${places.length} places, ${countries.length} countries`
  );
  console.log(`  Files written:`);
  console.log(`    public/data/places.json    (${(places.length * 200 / 1024).toFixed(0)}KB)`);
  console.log(`    public/data/stations.json  (${(stations.length * 250 / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`    public/data/countries.json (${(countries.length * 0.05).toFixed(0)}KB)`);
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

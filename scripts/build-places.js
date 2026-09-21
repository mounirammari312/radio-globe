/**
 * Pre-build script (Plain JavaScript version — works with Node.js without TypeScript/bun)
 * Fetches all stations with geo coords from Radio Browser API,
 * groups them into places (city clusters), and writes static JSON files to public/data/.
 *
 * Run: node scripts/build-places.js
 *
 * This is OPTIONAL — the project ships with pre-built data in public/data/.
 * Run this only if you want to refresh the dataset (e.g., weekly).
 */

const https = require("node:https");
const { createGunzip, createInflate } = require("node:zlib");
const { writeFileSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const RADIO_BROWSER_SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://all.api.radio-browser.info",
];

function nativeGet(url, timeoutMs = 30000) {
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
        let stream = res;
        if (encoding === "gzip") stream = res.pipe(createGunzip());
        else if (encoding === "deflate") stream = res.pipe(createInflate());

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        let body = "";
        stream.setEncoding("utf8");
        stream.on("data", (chunk) => (body += chunk));
        stream.on("end", () => resolve(body));
        stream.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timeout")));
    req.on("error", reject);
  });
}

async function fetchFromRadioBrowser(path) {
  let lastError = null;
  for (const baseUrl of RADIO_BROWSER_SERVERS) {
    try {
      const text = await nativeGet(`${baseUrl}${path}`);
      return JSON.parse(text);
    } catch (err) {
      lastError = err;
      console.error(`Failed to fetch from ${baseUrl}:`, err.message);
    }
  }
  throw lastError || new Error("Failed to fetch from Radio Browser API");
}

function slimStation(raw) {
  if (raw.geo_lat == null || raw.geo_long == null) return null;
  if (!raw.url_resolved && !raw.url) return null;
  return {
    id: raw.stationuuid,
    name: (raw.name || "Unknown Station").trim(),
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

function buildPlaces(stations) {
  const byPlace = new Map();
  const key = (lat, lng) =>
    `${Math.round(lat * 20) / 20}_${Math.round(lng * 20) / 20}`;

  for (const s of stations) {
    const k = key(s.lat, s.lng);
    if (!byPlace.has(k)) byPlace.set(k, []);
    byPlace.get(k).push(s);
  }

  const places = [];
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

  const allRaw = [];
  const seen = new Set();
  let totalWithGeo = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") {
      console.error("Batch failed:", result.reason);
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
    console.log(`Batch ${index + 1}: fetched ${data.length}, added ${added} (total with geo: ${totalWithGeo})`);
  }

  const stations = allRaw
    .map(slimStation)
    .filter((s) => s !== null);

  const { places } = buildPlaces(stations);

  let countries = [];
  try {
    const rawCountries = await fetchFromRadioBrowser(
      "/json/countries?hidebroken=true&order=stationcount&reverse=true"
    );
    countries = rawCountries
      .map((c) => ({
        name: c.name,
        code: c.iso_3166_1,
        stationCount: c.stationcount,
      }))
      .filter((c) => c.stationCount > 0);
  } catch (err) {
    console.error("Failed to fetch countries:", err);
  }

  const publicDir = join(process.cwd(), "public", "data");
  mkdirSync(publicDir, { recursive: true });

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

  writeFileSync(
    join(publicDir, "stations.json"),
    JSON.stringify({
      count: stations.length,
      stations,
    })
  );

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
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

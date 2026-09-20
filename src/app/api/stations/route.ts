import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Cache the parsed files in memory across requests in the same serverless instance.
let placesCache: any = null;
let stationsCache: any = null;

async function loadPlaces() {
  if (placesCache) return placesCache;
  try {
    const filePath = join(process.cwd(), "public", "data", "places.json");
    const text = await readFile(filePath, "utf8");
    placesCache = JSON.parse(text);
    return placesCache;
  } catch (err) {
    console.error("Failed to load places.json:", err);
    return { count: 0, totalStations: 0, places: [] };
  }
}

async function loadStations() {
  if (stationsCache) return stationsCache;
  try {
    const filePath = join(process.cwd(), "public", "data", "stations.json");
    const text = await readFile(filePath, "utf8");
    stationsCache = JSON.parse(text);
    return stationsCache;
  } catch (err) {
    console.error("Failed to load stations.json:", err);
    return { count: 0, stations: [] };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const slim = searchParams.get("slim") === "true";

  try {
    if (slim) {
      // Slim response: only places (for the globe markers).
      // Reads from static JSON — response in <50ms.
      const data = await loadPlaces();
      const places = country
        ? data.places.filter((p: any) => p.countryCode === country.toUpperCase())
        : data.places;
      return NextResponse.json(
        {
          count: places.length,
          totalStations: data.totalStations,
          places,
          generatedAt: data.generatedAt,
        },
        {
          headers: {
            "Cache-Control": "s-maxage=86400, stale-while-revalidate=604800",
          },
        }
      );
    }

    // Full response: all stations (for search/autocomplete).
    const data = await loadStations();
    const stations = country
      ? data.stations.filter((s: any) => s.countryCode === country.toUpperCase())
      : data.stations;
    return NextResponse.json(
      { count: stations.length, stations },
      {
        headers: {
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching stations:", error);
    return NextResponse.json(
      { error: "Failed to fetch stations", places: [], count: 0 },
      { status: 500 }
    );
  }
}

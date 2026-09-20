import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

let stationsCache: any = null;

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
  const name = searchParams.get("name")?.trim().toLowerCase();
  const placeId = searchParams.get("placeId")?.trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "300"), 500);

  try {
    const data = await loadStations();

    if (placeId) {
      // Get all stations at a specific place (used when user clicks a city)
      const stations = (data.stations as any[]).filter((s) => {
        const sLat = Math.round(s.lat * 20) / 20;
        const sLng = Math.round(s.lng * 20) / 20;
        return `${sLat}_${sLng}` === placeId;
      });
      return NextResponse.json({
        count: stations.length,
        placeId,
        stations,
      });
    }

    if (name) {
      // Search by name (case-insensitive substring match)
      const stations = (data.stations as any[])
        .filter((s) => s.name.toLowerCase().includes(name))
        .slice(0, limit);
      return NextResponse.json({
        count: stations.length,
        stations,
      });
    }

    return NextResponse.json(
      { error: "Provide 'name' or 'placeId' parameter", stations: [], count: 0 },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error searching stations:", error);
    return NextResponse.json(
      { error: "Search failed", stations: [], count: 0 },
      { status: 500 }
    );
  }
}

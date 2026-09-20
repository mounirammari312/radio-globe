import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

let countriesCache: any = null;

async function loadCountries() {
  if (countriesCache) return countriesCache;
  try {
    const filePath = join(process.cwd(), "public", "data", "countries.json");
    const text = await readFile(filePath, "utf8");
    countriesCache = JSON.parse(text);
    return countriesCache;
  } catch (err) {
    console.error("Failed to load countries.json:", err);
    return { count: 0, countries: [] };
  }
}

export async function GET() {
  try {
    const data = await loadCountries();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    return NextResponse.json(
      { error: "Failed to fetch countries", countries: [], count: 0 },
      { status: 500 }
    );
  }
}

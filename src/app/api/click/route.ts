import { NextRequest, NextResponse } from "next/server";

// Best-effort click registration with Radio Browser API.
// This is non-blocking and won't fail the user request if the click fails.
// The actual playback URL is already in our static data, so this is purely
// for popularity-ranking purposes.

const RADIO_BROWSER_SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://all.api.radio-browser.info",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uuid = searchParams.get("uuid");

  if (!uuid) {
    return NextResponse.json(
      { error: "Missing 'uuid' parameter" },
      { status: 400 }
    );
  }

  try {
    // Fire and forget — don't block the response
    for (const baseUrl of RADIO_BROWSER_SERVERS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(`${baseUrl}/json/url/${uuid}`, {
          signal: controller.signal,
          headers: { "User-Agent": "RadioGardenClone/1.0" },
        });
        clearTimeout(timeout);
        break;
      } catch {
        // try next server
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Non-fatal — return ok anyway
    return NextResponse.json({ ok: true });
  }
}

import { NextRequest } from "next/server";

/**
 * Audio stream proxy: bypasses CORS restrictions by proxying radio streams
 * through our own server with proper Access-Control-Allow-Origin headers.
 *
 * Usage: GET /api/proxy?url=https://stream.example.com/live.mp3
 *
 * The proxy:
 *  - Forwards the audio stream directly (no buffering) — low memory footprint.
 *  - Sets CORS headers so the browser allows playback.
 *  - Passes Range requests for HLS (.m3u8 / .ts segments) and audio seeking.
 *  - Has a 25-second max duration for Vercel Hobby plan.
 *
 * This is used as a fallback by the audio player when direct playback fails
 * due to CORS restrictions on the original stream.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BLOCKED_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "content-encoding",
  "accept-encoding",
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const reqHeaders = new Headers();
    const range = request.headers.get("range");
    if (range) reqHeaders.set("Range", range);
    reqHeaders.set("User-Agent", "RadioGardenClone/1.0");
    reqHeaders.set("Accept", "*/*");

    const upstream = await fetch(parsedUrl.toString(), {
      headers: reqHeaders,
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${upstream.status}` }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const resHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!BLOCKED_HEADERS.has(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
    resHeaders.set(
      "Access-Control-Expose-Headers",
      "Content-Range, Content-Length, Accept-Ranges"
    );
    resHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({ error: "Failed to proxy stream" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

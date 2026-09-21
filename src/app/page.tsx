"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Place } from "@/components/radio/radio-globe";
import NowPlayingBar from "@/components/radio/now-playing-bar";
import SearchPanel from "@/components/radio/search-panel";
import Header from "@/components/radio/header";
import AdContainer from "@/components/ads/ad-container";
import { useRadioStore, type StationMeta } from "@/store/radio-store";
import { Loader2, Radio as RadioIcon } from "lucide-react";

// CRITICAL: Load RadioGlobe client-only to avoid Turbopack/SSR issues with maplibre-gl.
// maplibre-gl uses browser-only APIs (WebGL, window) that fail during SSR.
// `ssr: false` makes the bundle skip the component entirely on the server.
const RadioGlobe = dynamic(
  () => import("@/components/radio/radio-globe").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full text-white/70">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-4" />
        <div className="text-lg font-medium mb-1">Loading 3D globe…</div>
        <div className="text-sm text-white/40">Initializing globe projection</div>
      </div>
    ),
  }
);

export default function Home() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const setAudio = useRadioStore((s) => s.setAudio);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const setIsLoading = useRadioStore((s) => s.setIsLoading);
  const setErrorState = useRadioStore((s) => s.setError);
  const playStation = useRadioStore((s) => s.playStation);
  const currentStation = useRadioStore((s) => s.currentStation);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "none";
    audioRef.current = audio;
    setAudio(audio);

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    const handleStalled = () => setIsLoading(true);
    const handleError = () => {
      setIsLoading(false);
      setErrorState("Stream unavailable. Try another station.");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("stalled", handleStalled);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("stalled", handleStalled);
      audio.removeEventListener("error", handleError);
      audio.pause();
    };
  }, [setAudio, setIsPlaying, setIsLoading, setErrorState]);

  // Fetch all places (this hits our cached API — first call takes ~30s while
  // the server warms the cache, subsequent calls return in <500ms)
  useEffect(() => {
    let cancelled = false;
    const fetchPlaces = async () => {
      setLoading(true);
      try {
        // First, try a quick status check (small cached fetch) to ensure server is alive
        // If the cache isn't ready yet, this returns quickly with empty data
        const res = await fetch("/api/stations?slim=true");
        const data = await res.json();
        if (!cancelled && data.places) {
          setPlaces(data.places);
          console.log(
            `Loaded ${data.count} places with ${data.totalStations} total stations`
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load stations. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPlaces();
    return () => {
      cancelled = true;
    };
  }, []);

  // Press / to search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !searchOpen &&
        (e.target as HTMLElement)?.tagName !== "INPUT"
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen]);

  // When a place is clicked: open the sidebar + play its top station
  const handlePlaceClick = useCallback(
    (place: Place) => {
      setActivePlace(place);
      setSearchOpen(true);
      // Play the top station immediately — like Radio Garden
      const top = place.top;
      const station: StationMeta = {
        id: top.id,
        name: top.name,
        url: top.url,
        urlResolved: top.urlResolved,
        favicon: top.favicon,
        country: place.country,
        countryCode: place.countryCode,
        tags: [],
        lat: place.lat,
        lng: place.lng,
        bitrate: top.bitrate,
        codec: top.codec,
        clickCount: 0,
      };
      playStation(station);
    },
    [playStation]
  );

  // When the current station changes (e.g., via search), update active place if matches
  useEffect(() => {
    if (!currentStation || !currentStation.lat || !currentStation.lng) return;
    // Find a place near this station
    const key = `${Math.round(currentStation.lat * 20) / 20}_${
      Math.round(currentStation.lng * 20) / 20
    }`;
    const place = places.find((p) => p.id === key);
    if (place && place.id !== activePlace?.id) {
      setActivePlace(place);
    }
  }, [currentStation, places, activePlace?.id]);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#040810]">
      {/* Deep blue starfield background — matches Radio Garden's map background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#08041e] via-[#0d0530] to-[#040810] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 40%, rgba(45, 0, 255, 0.15), transparent 50%), radial-gradient(circle at 70% 60%, rgba(0, 224, 112, 0.08), transparent 50%)",
        }}
      />

      {/* 3D Globe - full screen */}
      <div className="absolute inset-0">
        {!loading && places.length > 0 ? (
          <RadioGlobe
            places={places}
            activePlaceId={activePlace?.id || null}
            onPlaceClick={handlePlaceClick}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/70">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-4" />
            <div className="text-lg font-medium mb-1">
              Loading the world's radio stations…
            </div>
            <div className="text-sm text-white/40">
              First load fetches ~30,000 stations (may take ~30s)
            </div>
          </div>
        )}
      </div>

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center max-w-md p-6">
            <RadioIcon className="w-12 h-12 mx-auto mb-4 text-rose-400" />
            <div className="text-white text-lg font-medium mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        onSearchClick={() => setSearchOpen(true)}
        stationCount={places.length}
      />

      {/* Search panel */}
      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        activePlace={activePlace}
      />

      {/* Now playing bar */}
      <NowPlayingBar />

      {/* Ad container — below the playbar, only on desktop. Auto-refreshes every 45s while playing */}
      <div className="fixed bottom-[92px] sm:bottom-[100px] left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-5xl">
          <AdContainer
            className="mb-1"
            // To enable Google AdSense:
            //   1. Set env var NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX on Vercel
            //   2. Replace the slot IDs in src/components/ads/ad-container.tsx with your slots
            // Until configured, a placeholder is shown.
          />
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="fixed bottom-4 left-4 z-20 hidden md:block pointer-events-none">
        <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-md px-2.5 py-1.5 text-[11px] text-white/50">
          Press{" "}
          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80 font-mono text-[10px]">
            /
          </kbd>{" "}
          to search
        </div>
      </div>

      {/* Legal footer links — bottom-right, subtle */}
      <div className="fixed bottom-4 right-4 z-20 hidden sm:block pointer-events-none">
        <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-md px-3 py-1.5 text-[10px] text-white/40 flex items-center gap-3 pointer-events-auto">
          <a href="/about" className="hover:text-emerald-400">About</a>
          <a href="/privacy-policy" className="hover:text-emerald-400">Privacy</a>
          <a href="/terms" className="hover:text-emerald-400">Terms</a>
          <a href="/contact" className="hover:text-emerald-400">Contact</a>
        </div>
      </div>
    </main>
  );
}

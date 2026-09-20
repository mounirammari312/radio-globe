"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRadioStore, type StationMeta } from "@/store/radio-store";
import type { Place } from "@/components/radio/radio-globe";
import {
  Search,
  X,
  Loader2,
  Radio as RadioIcon,
  Heart,
  History,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  activePlace: Place | null;
}

const POPULAR_TAGS = [
  "pop",
  "rock",
  "jazz",
  "classical",
  "news",
  "dance",
  "electronic",
  "reggae",
  "latin",
  "country",
  "hip hop",
  "metal",
  "talk",
  "world",
];

export default function SearchPanel({
  open,
  onClose,
  activePlace,
}: SearchPanelProps) {
  const {
    playStation,
    history,
    favorites,
    showFavoritesOnly,
    setShowFavoritesOnly,
    currentStation,
  } = useRadioStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StationMeta[]>([]);
  const [placeStations, setPlaceStations] = useState<StationMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened — no setState needed
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Clear query when closed without active place
  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current && !open && !activePlace) {
      setQuery("");
    }
    prevOpen.current = open;
  }, [open, activePlace]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Fetch stations for the active place (when activePlace changes)
  const fetchPlaceStations = useCallback(async (placeId: string) => {
    try {
      const res = await fetch(
        `/api/stations/search?placeId=${encodeURIComponent(placeId)}`
      );
      const data = await res.json();
      return data.stations || [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!activePlace) {
      // Only clear if we had something — avoids cascading renders
      if (placeStations.length > 0) setPlaceStations([]);
      return;
    }
    setLoading(true);
    fetchPlaceStations(activePlace.id).then((stations) => {
      if (!cancelled) {
        setPlaceStations(stations);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activePlace?.id]);

  // Debounced search by name
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      // Only clear if we had results
      if (results.length > 0) setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/stations/search?name=${encodeURIComponent(q)}&limit=300`)
        .then((res) => res.json())
        .then((data) => setResults(data.stations || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const handleStationClick = (station: StationMeta) => {
    playStation(station);
    // On mobile, close the panel after selection
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      onClose();
    }
  };

  // Decide what to show
  const displayList: StationMeta[] = showFavoritesOnly
    ? favorites
    : query.trim().length >= 2
    ? results
    : activePlace
    ? placeStations
    : history;

  if (!open) return null;

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — 380px on desktop, full on mobile */}
      <div className="fixed top-0 left-0 z-50 h-full w-full md:w-[380px] bg-[#0c1018] border-r border-emerald-500/20 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-white font-semibold flex items-center gap-2 text-base">
              {activePlace ? (
                <>
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="truncate max-w-[260px]">
                    {activePlace.name}
                  </span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-emerald-400" />
                  Find a station
                </>
              )}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 flex-shrink-0"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Place header info */}
          {activePlace && (
            <div className="text-xs text-emerald-300/80 flex items-center gap-1.5">
              <span>{activePlace.country}</span>
              <span className="text-white/30">•</span>
              <span>{activePlace.stationCount} stations</span>
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search by station name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:border-emerald-500/50"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Favorites + tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              className={`h-8 text-xs ${
                showFavoritesOnly
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
              }`}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Heart className="w-3 h-3 mr-1.5" />
              Favorites ({favorites.length})
            </Button>
            {!showFavoritesOnly && !activePlace && (
              <>
                {POPULAR_TAGS.slice(0, 5).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 px-2">
          <div className="py-2">
            {loading && (
              <div className="flex items-center justify-center py-12 text-white/40">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}

            {!loading && displayList.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <RadioIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                {showFavoritesOnly
                  ? "No favorites yet. Tap the heart icon on any station to add it."
                  : query.trim().length >= 2
                  ? "No stations found. Try a different search."
                  : activePlace
                  ? "Loading stations for this place…"
                  : "Start typing to search radio stations worldwide."}
              </div>
            )}

            {!loading && displayList.length > 0 && (
              <>
                {/* Section header */}
                {showFavoritesOnly ? (
                  <SectionHeader
                    icon={<Heart className="w-3 h-3 fill-rose-400" />}
                    label="Your favorites"
                  />
                ) : query.trim().length >= 2 ? (
                  <SectionHeader
                    label={`${displayList.length} results for "${query.trim()}"`}
                  />
                ) : activePlace ? (
                  <SectionHeader
                    icon={<MapPin className="w-3 h-3 text-emerald-400" />}
                    label="Stations at this location"
                  />
                ) : (
                  history.length > 0 && (
                    <SectionHeader
                      icon={<History className="w-3 h-3" />}
                      label="Recently played"
                    />
                  )
                )}

                <div className="space-y-1">
                  {displayList.map((station) => (
                    <StationItem
                      key={station.id}
                      station={station}
                      isActive={currentStation?.id === station.id}
                      isFav={favorites.some((f) => f.id === station.id)}
                      imgError={!!imgErrors[station.id]}
                      onClick={() => handleStationClick(station)}
                      onImgError={() =>
                        setImgErrors((prev) => ({
                          ...prev,
                          [station.id]: true,
                        }))
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="p-3 border-t border-white/10 text-center text-[10px] text-white/30">
          Powered by the open Radio Browser API • {displayList.length} stations
        </div>
      </div>
    </>
  );
}

function SectionHeader({
  icon,
  label,
}: {
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <div className="px-3 pb-2 pt-1 text-xs uppercase tracking-wider text-white/40 flex items-center gap-1.5">
      {icon}
      {label}
    </div>
  );
}

function StationItem({
  station,
  isActive,
  isFav,
  imgError,
  onClick,
  onImgError,
}: {
  station: StationMeta;
  isActive: boolean;
  isFav: boolean;
  imgError: boolean;
  onClick: () => void;
  onImgError: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors group ${
        isActive
          ? "bg-emerald-500/20 border border-emerald-500/40"
          : "hover:bg-white/5 border border-transparent"
      }`}
    >
      <div className="relative h-10 w-10 rounded-md overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center flex-shrink-0">
        {station.favicon && !imgError ? (
          <img
            src={station.favicon}
            alt={station.name}
            className="h-full w-full object-cover"
            onError={onImgError}
          />
        ) : (
          <span className="text-white font-bold text-sm">
            {station.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`font-medium truncate text-sm ${
            isActive ? "text-emerald-300" : "text-white"
          }`}
        >
          {station.name}
        </div>
        <div className="text-xs text-white/50 truncate">
          {station.country}
          {station.bitrate > 0 && (
            <span className="ml-1.5 text-white/30">• {station.bitrate}kbps</span>
          )}
        </div>
      </div>
      {isFav && (
        <Heart className="w-4 h-4 text-rose-500 fill-rose-500 flex-shrink-0" />
      )}
      {isActive && (
        <div className="flex gap-0.5 items-end h-3 flex-shrink-0">
          <span
            className="w-0.5 bg-emerald-400 animate-pulse rounded-sm"
            style={{ height: "40%" }}
          />
          <span
            className="w-0.5 bg-emerald-400 animate-pulse rounded-sm"
            style={{ height: "80%" }}
          />
          <span
            className="w-0.5 bg-emerald-400 animate-pulse rounded-sm"
            style={{ height: "60%" }}
          />
        </div>
      )}
    </button>
  );
}

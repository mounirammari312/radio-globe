"use client";

import { useState } from "react";
import { useRadioStore } from "@/store/radio-store";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  ExternalLink,
  Heart,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export default function NowPlayingBar() {
  const {
    currentStation,
    isPlaying,
    isLoading,
    error,
    volume,
    isMuted,
    togglePlay,
    stop,
    setVolume,
    toggleMute,
    toggleFavorite,
    favorites,
  } = useRadioStore();

  // Track img errors per station ID — no useEffect needed (avoids cascading renders).
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const isFav = currentStation
    ? favorites.some((f) => f.id === currentStation.id)
    : false;
  const imgError = currentStation ? !!imgErrors[currentStation.id] : false;

  if (!currentStation) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-3xl px-4 pb-3">
          <div className="rounded-xl bg-black/40 backdrop-blur-md border border-white/10 px-4 py-3 flex items-center justify-center text-white/70 text-sm">
            <span className="mr-2 text-emerald-400">●</span>
            Tap a green dot on the globe to start listening
          </div>
        </div>
      </div>
    );
  }

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-5xl px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="rounded-2xl bg-[#0c1018]/95 backdrop-blur-xl border border-emerald-500/20 shadow-2xl shadow-black/50 overflow-hidden">
          {/* Error banner (if any) */}
          {error && (
            <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-red-300 hover:text-red-200 hover:bg-red-500/20"
                onClick={() => useRadioStore.setState({ error: null })}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 sm:p-4">
            {/* Station favicon / name */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                {currentStation.favicon && !imgError ? (
                  <img
                    src={currentStation.favicon}
                    alt={currentStation.name}
                    className="h-full w-full object-cover"
                    onError={() =>
                      setImgErrors((prev) => ({
                        ...prev,
                        [currentStation.id]: true,
                      }))
                    }
                  />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {currentStation.name.charAt(0).toUpperCase()}
                  </span>
                )}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white font-semibold truncate text-sm sm:text-base">
                  {currentStation.name}
                </div>
                <div className="text-emerald-400/80 text-xs sm:text-sm truncate">
                  {currentStation.country}
                  {currentStation.tags.length > 0 && (
                    <span className="text-white/40 mx-1">•</span>
                  )}
                  {currentStation.tags.slice(0, 2).join(", ")}
                </div>
                {isPlaying && !isLoading && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="flex gap-0.5 items-end h-3">
                      <span
                        className="w-0.5 bg-emerald-400 animate-pulse rounded-sm"
                        style={{ height: "30%", animationDelay: "0ms" }}
                      />
                      <span
                        className="w-0.5 bg-emerald-400 animate-pulse rounded-sm"
                        style={{ height: "70%", animationDelay: "150ms" }}
                      />
                      <span
                        className="w-0.5 bg-emerald-400 animate-pulse rounded-sm"
                        style={{ height: "50%", animationDelay: "300ms" }}
                      />
                      <span
                        className="w-0.5 bg-emerald-400 animate-pulse rounded-sm"
                        style={{ height: "90%", animationDelay: "450ms" }}
                      />
                    </span>
                    <span className="text-emerald-400 text-[10px] uppercase tracking-wider ml-1">
                      Live
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 text-white hover:bg-white/10 hover:text-emerald-400"
                onClick={togglePlay}
                disabled={isLoading}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 text-white hover:bg-white/10 hover:text-rose-400"
                onClick={() => toggleFavorite(currentStation)}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFav ? "fill-rose-500 text-rose-500" : "text-white"
                  }`}
                />
              </Button>

              {currentStation.homepage && (
                <a
                  href={currentStation.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center text-white hover:bg-white/10 hover:text-emerald-400 rounded-md transition-colors"
                  title="Visit station website"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {/* Volume slider - hidden on small screens */}
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/10 hover:text-emerald-400"
                  onClick={toggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  <VolumeIcon className="w-5 h-5" />
                </Button>
                <div className="w-24 lg:w-28">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={(vals) => setVolume(vals[0])}
                    className="[&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-emerald-400"
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 text-white hover:bg-white/10 hover:text-red-400"
                onClick={stop}
                title="Stop"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

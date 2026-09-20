"use client";

import { create } from "zustand";

export interface StationMeta {
  id: string;
  name: string;
  url: string;
  urlResolved: string;
  favicon: string;
  homepage?: string;
  country: string;
  countryCode: string;
  tags: string[];
  lat: number | null;
  lng: number | null;
  language?: string;
  bitrate: number;
  codec?: string;
  clickCount: number;
}

interface RadioStore {
  currentStation: StationMeta | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
  audio: HTMLAudioElement | null;
  hls: any | null;
  history: StationMeta[];
  favorites: StationMeta[];
  showFavoritesOnly: boolean;
  setAudio: (audio: HTMLAudioElement) => void;
  playStation: (station: StationMeta) => void;
  stop: () => void;
  togglePlay: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  toggleFavorite: (station: StationMeta) => void;
  setShowFavoritesOnly: (show: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
}

// Detect HLS streams (m3u8 endpoints)
function isHlsStream(url: string): boolean {
  const u = url.toLowerCase().split("?")[0];
  return u.endsWith(".m3u8") || u.includes(".m3u8/");
}

// Build a proxied URL for streams that may have CORS issues.
// We always route through our proxy for streams that don't have CORS headers.
// HLS .m3u8 streams MUST be proxied (segments won't load otherwise).
function maybeProxy(url: string): string {
  if (!url) return url;
  if (typeof window === "undefined") return url;
  if (isHlsStream(url)) {
    // HLS .m3u8 + segment loads can't be made CORS-safe without a proxy
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  // Direct audio streams: try direct first; the player falls back to proxy on CORS error
  return url;
}

// Lazy load hls.js
let HlsModule: any | null = null;
async function loadHls(): Promise<any> {
  if (HlsModule) return HlsModule;
  const mod = await import("hls.js");
  HlsModule = (mod as any).default || mod;
  return HlsModule;
}

// MediaSession API setup (lock screen + notification controls)
function setupMediaSession(
  station: StationMeta,
  handlers: {
    play: () => void;
    pause: () => void;
    stop: () => void;
    next: () => void;
    prev: () => void;
  }
) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return;
  }
  try {
    const artwork = station.favicon
      ? [{ src: station.favicon, sizes: "256x256", type: "image/png" }]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: station.country || "Radio Globe",
      album: "Radio Globe",
      artwork,
    });

    navigator.mediaSession.setActionHandler("play", handlers.play);
    navigator.mediaSession.setActionHandler("pause", handlers.pause);
    navigator.mediaSession.setActionHandler("stop", handlers.stop);
    navigator.mediaSession.setActionHandler("nexttrack", handlers.next);
    navigator.mediaSession.setActionHandler("previoustrack", handlers.prev);
  } catch (err) {
    console.error("MediaSession setup failed:", err);
  }
}

function updateMediaSessionPlaybackState(isPlaying: boolean) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return;
  }
  try {
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  } catch {}
}

function clearMediaSession() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return;
  }
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
    navigator.mediaSession.setActionHandler("play", null);
    navigator.mediaSession.setActionHandler("pause", null);
    navigator.mediaSession.setActionHandler("stop", null);
    navigator.mediaSession.setActionHandler("nexttrack", null);
    navigator.mediaSession.setActionHandler("previoustrack", null);
  } catch {}
}

export const useRadioStore = create<RadioStore>((set, get) => ({
  currentStation: null,
  isPlaying: false,
  volume: 0.85,
  isMuted: false,
  isLoading: false,
  error: null,
  audio: null,
  hls: null,
  history: [],
  favorites: [],
  showFavoritesOnly: false,

  setAudio: (audio) => {
    const state = get();
    if (state.audio && state.audio !== audio) {
      state.audio.pause();
    }
    audio.volume = state.isMuted ? 0 : state.volume;
    set({ audio });
  },

  playStation: (station) => {
    const state = get();
    const audio = state.audio;
    if (!audio) return;

    // Cleanup any previous HLS instance
    if (state.hls) {
      try {
        state.hls.destroy();
      } catch {}
      set({ hls: null });
    }

    set({
      currentStation: station,
      isLoading: true,
      error: null,
      isPlaying: false,
      history: [
        station,
        ...state.history.filter((h) => h.id !== station.id),
      ].slice(0, 30),
    });

    // Register click (popularity ranking) — best-effort, non-blocking
    fetch(`/api/click?uuid=${encodeURIComponent(station.id)}`).catch(() => {});

    const rawStreamUrl = station.urlResolved || station.url;
    audio.volume = state.isMuted ? 0 : state.volume;

    // Setup MediaSession for lock screen + notification controls
    setupMediaSession(station, {
      play: () => {
        audio
          .play()
          .then(() => set({ isPlaying: true }))
          .catch(() => {});
      },
      pause: () => {
        audio.pause();
        set({ isPlaying: false });
      },
      stop: () => get().stop(),
      next: () => get().playNext(),
      prev: () => get().playPrevious(),
    });

    const startPlayback = (streamUrl: string) => {
      audio.src = streamUrl;
      audio
        .play()
        .then(() => {
          set({ isPlaying: true, isLoading: false });
          updateMediaSessionPlaybackState(true);
        })
        .catch((err) => {
          console.error("Direct playback failed:", err);
          // Fallback: try via proxy
          if (!streamUrl.startsWith("/api/proxy")) {
            console.log("Retrying via proxy…");
            audio.src = `/api/proxy?url=${encodeURIComponent(rawStreamUrl)}`;
            audio
              .play()
              .then(() => {
                set({ isPlaying: true, isLoading: false });
                updateMediaSessionPlaybackState(true);
              })
              .catch((err2) => {
                console.error("Proxy playback also failed:", err2);
                set({
                  isLoading: false,
                  isPlaying: false,
                  error:
                    "Unable to play this station. The stream may be offline or restricted.",
                });
              });
          } else {
            set({
              isLoading: false,
              isPlaying: false,
              error: "Stream unavailable. Try another station.",
            });
          }
        });
    };

    if (isHlsStream(rawStreamUrl)) {
      // Use hls.js for HLS streams (.m3u8) — HLS needs special handling
      loadHls()
        .then((Hls) => {
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              liveDurationInfinity: true,
            });
            // Route through our proxy to bypass CORS on HLS segments
            hls.config.loaderConfig = hls.config.loaderConfig || {};
            hls.loadSource(`/api/proxy?url=${encodeURIComponent(rawStreamUrl)}`);
            hls.attachMedia(audio);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              audio
                .play()
                .then(() => {
                  set({ isPlaying: true, isLoading: false });
                  updateMediaSessionPlaybackState(true);
                })
                .catch((err) => {
                  console.error("HLS playback failed:", err);
                  set({
                    isLoading: false,
                    isPlaying: false,
                    error: "Stream unavailable. Try another station.",
                  });
                });
            });
            hls.on(Hls.Events.ERROR, (_: any, data: any) => {
              if (data.fatal) {
                console.error("HLS fatal error:", data);
                set({
                  isLoading: false,
                  isPlaying: false,
                  error: "Stream unavailable. Try another station.",
                });
                try {
                  hls.destroy();
                } catch {}
                updateMediaSessionPlaybackState(false);
              }
            });
            set({ hls });
          } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
            // Safari native HLS — also via proxy for CORS
            startPlayback(`/api/proxy?url=${encodeURIComponent(rawStreamUrl)}`);
          } else {
            // Last resort: direct
            startPlayback(rawStreamUrl);
          }
        })
        .catch((err) => {
          console.error("Failed to load HLS.js:", err);
          startPlayback(rawStreamUrl);
        });
    } else {
      // Direct audio (mp3/aac/ogg) — try direct first, fall back to proxy
      startPlayback(rawStreamUrl);
    }
  },

  stop: () => {
    const state = get();
    const audio = state.audio;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    if (state.hls) {
      try {
        state.hls.destroy();
      } catch {}
    }
    clearMediaSession();
    set({
      currentStation: null,
      isPlaying: false,
      isLoading: false,
      hls: null,
    });
  },

  togglePlay: () => {
    const state = get();
    const audio = state.audio;
    if (!audio || !state.currentStation) return;
    if (state.isPlaying) {
      audio.pause();
      set({ isPlaying: false });
      updateMediaSessionPlaybackState(false);
    } else {
      audio
        .play()
        .then(() => {
          set({ isPlaying: true });
          updateMediaSessionPlaybackState(true);
        })
        .catch((err) => {
          console.error("Failed to resume:", err);
          set({ error: "Unable to resume playback." });
        });
    }
  },

  setVolume: (vol) => {
    const audio = get().audio;
    if (audio) {
      audio.volume = vol;
    }
    set({ volume: vol, isMuted: vol === 0 });
  },

  toggleMute: () => {
    const state = get();
    const audio = state.audio;
    if (audio) {
      if (state.isMuted) {
        audio.volume = state.volume;
      } else {
        audio.volume = 0;
      }
    }
    set({ isMuted: !state.isMuted });
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing });
    updateMediaSessionPlaybackState(playing);
  },
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (err) => set({ error: err }),

  toggleFavorite: (station) => {
    const state = get();
    const exists = state.favorites.some((f) => f.id === station.id);
    if (exists) {
      set({
        favorites: state.favorites.filter((f) => f.id !== station.id),
      });
    } else {
      set({ favorites: [station, ...state.favorites] });
    }
  },

  setShowFavoritesOnly: (show) => set({ showFavoritesOnly: show }),

  playNext: () => {
    const state = get();
    if (state.history.length < 2) return;
    // Find current index in history, go to next
    const currentIdx = state.history.findIndex(
      (h) => h.id === state.currentStation?.id
    );
    const nextIdx = (currentIdx + 1) % state.history.length;
    get().playStation(state.history[nextIdx]);
  },

  playPrevious: () => {
    const state = get();
    if (state.history.length < 2) return;
    const currentIdx = state.history.findIndex(
      (h) => h.id === state.currentStation?.id
    );
    const prevIdx = (currentIdx - 1 + state.history.length) % state.history.length;
    get().playStation(state.history[prevIdx]);
  },
}));

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Place } from "@/components/radio/radio-globe";
import NowPlayingBar from "@/components/radio/now-playing-bar";
import SearchPanel from "@/components/radio/search-panel";
import Header from "@/components/radio/header";
import { useRadioStore, type StationMeta } from "@/store/radio-store";
import { Loader2, Radio as RadioIcon } from "lucide-react";

const RadioGlobe = dynamic(
  () => import("@/components/radio/radio-globe").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full text-white/70">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
        <div className="text-sm tracking-wide text-white/60">Chargement du globe 3D…</div>
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

  // تهيئة مشغل الصوت النقي
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
      setErrorState("La station ne répond pas...");
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

  // جلب المحطات المدمجة
  useEffect(() => {
    let cancelled = false;
    const fetchPlaces = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/stations?slim=true");
        const data = await res.json();
        if (!cancelled && data.places) {
          setPlaces(data.places);
          // اختيار أول مدينة افتراضياً مثل راديو جاردن
          if (data.places.length > 0 && !activePlace) {
            setActivePlace(data.places[0]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Impossible de charger les stations.");
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

  // تشغيل المحطة فوراً عند لمس النقطة دون فتح أي نوافذ تحجب الشاشة
  const handlePlaceClick = useCallback(
    (place: Place) => {
      setActivePlace(place);
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

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[rgb(25,5,195)] select-none">
      {/* خريطة الكرة الأرضية ثلاثية الأبعاد بملء الشاشة */}
      <div className="absolute inset-0">
        {!loading && places.length > 0 ? (
          <RadioGlobe
            places={places}
            activePlaceId={activePlace?.id || null}
            onPlaceClick={handlePlaceClick}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/70">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
            <div className="text-base font-medium">Chargement du monde...</div>
          </div>
        )}
      </div>

      {/* زر البحث العلوي البسيط */}
      <Header
        onSearchClick={() => setSearchOpen(true)}
        stationCount={places.length}
      />

      {/* لوحة البحث — تفتح فقط عند النقر اليدوي على زر البحث */}
      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        activePlace={activePlace}
      />

      {/* الدرج السفلي المطابق تماماً لـ Radio Garden */}
      <NowPlayingBar
        activePlace={activePlace}
        places={places}
        onSelectPlace={handlePlaceClick}
        onOpenSearch={() => setSearchOpen(true)}
      />
    </main>
  );
}


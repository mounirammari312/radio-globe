
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRadioStore, type StationMeta } from "@/store/radio-store";
import type { Place } from "@/components/radio/radio-globe";
import {
  Play,
  Square,
  SkipForward,
  Share2,
  Globe,
  ExternalLink,
  Heart,
  ChevronRight,
  ChevronDown,
  Moon,
  Volume2,
  Search,
  Compass,
  Menu,
} from "lucide-react";

interface NowPlayingBarProps {
  activePlace: Place | null;
  places: Place[];
  onSelectPlace: (place: Place) => void;
  onOpenSearch: () => void;
}

interface WeatherInfo {
  temp: number;
  condition: string;
  isDay: boolean;
  icon: string;
}

// ذاكرة تخزين مؤقتة للطقس لمنع تكرار الطلبات عند التنقل بين نفس المدن
const weatherCache = new Map<string, { data: WeatherInfo; timestamp: number }>();

export default function NowPlayingBar({
  activePlace,
  places,
  onSelectPlace,
  onOpenSearch,
}: NowPlayingBarProps) {
  const {
    currentStation,
    isPlaying,
    isLoading,
    error,
    togglePlay,
    playStation,
    favorites,
    toggleFavorite,
  } = useRadioStore();

  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"globe" | "fav" | "explore" | "search" | "settings">("globe");

  // حالات الطقس والمسافة الجغرافية
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const lat = activePlace ? activePlace.lat : currentStation ? currentStation.lat : undefined;
  const lng = activePlace ? activePlace.lng : currentStation ? currentStation.lng : undefined;

  // 1. حساب التوقيت المحلي اللحظي بناءً على خط الطول الفلكي
  const localTime = useMemo(() => {
    const targetLng = lng ?? 0;
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const offsetHours = Math.round(targetLng / 15);
    const target = new Date(utc + 3600000 * offsetHours);
    const hh = String(target.getHours()).padStart(2, "0");
    const mm = String(target.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [lng]);

  // 2. جلب بيانات الطقس الحية من Open-Meteo بخفة وسرعة فائقة
  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      setWeather(null);
      return;
    }

    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
      setWeather(cached.data);
      return;
    }

    let isCancelled = false;

    async function fetchWeather() {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled || !data.current) return;

        const code = data.current.weather_code;
        const isDay = Boolean(data.current.is_day);
        const temp = Math.round(data.current.temperature_2m);

        const parsed: WeatherInfo = {
          temp,
          isDay,
          condition: getWeatherDescFr(code),
          icon: getWeatherIcon(code, isDay),
        };

        weatherCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
        setWeather(parsed);
      } catch (e) {
        // حماية التطبيق من أي انقطاع في الشبكة
      }
    }

    fetchWeather();
    return () => {
      isCancelled = true;
    };
  }, [lat, lng]);

  // 3. حساب المسافة الرادارية بين المستمع والمحطة
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const d = calculateDistance(pos.coords.latitude, pos.coords.longitude, lat, lng);
          setDistanceKm(Math.round(d));
        },
        () => {
          // موقع مرجعي افتراضي عند تعذر تحديد الموقع
          const d = calculateDistance(36.75, 3.05, lat, lng);
          setDistanceKm(Math.round(d));
        },
        { timeout: 4000 }
      );
    }
  }, [lat, lng]);

  const isFav = currentStation ? favorites.some((f) => f.id === currentStation.id) : false;

  // الانتقال للمحطة التالية
  const handleNext = () => {
    if (places.length === 0) return;
    const nextIdx = Math.floor(Math.random() * places.length);
    onSelectPlace(places[nextIdx]);
  };

  const handleShare = () => {
    const url = new URL(window.location.origin);
    const stationId = currentStation?.id || activePlace?.id;
    if (stationId) url.searchParams.set("station", stationId);

    if (navigator.share && currentStation) {
      navigator.share({
        title: `Radio Garden - ${currentStation.name}`,
        text: `Écoutez ${currentStation.name} en direct!`,
        url: url.toString(),
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url.toString());
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col justify-end pointer-events-none">
      {/* هيكل الدرج السفلي Glassmorphism */}
      <div
        className={`pointer-events-auto w-full max-w-lg mx-auto bg-[#10141d]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.85)] text-white transition-all duration-300 ease-out flex flex-col ${
          expanded ? "max-h-[85vh] h-[85vh]" : "max-h-[200px]"
        }`}
      >
        {/* مقبض السحب العلوي */}
        <div
          className="w-full pt-2.5 pb-1 flex justify-center cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-10 h-1 bg-white/30 rounded-full hover:bg-white/50 transition-colors" />
        </div>

        {/* 1. صف المدينة، شارة الطقس المصغرة، والتوقيت المحلي */}
        <div className="px-5 py-2 flex items-center justify-between border-b border-white/5">
          <div
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
            onClick={() => setExpanded(!expanded)}
          >
            {/* فقاعة العدد البيضاء الأصلية */}
            <div className="w-9 h-9 rounded-full bg-white text-black font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-md">
              {activePlace?.stationCount || 1}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="font-bold text-lg leading-tight truncate text-white">
                {activePlace?.name || currentStation?.name || "Sélectionnez un lieu"}
              </div>
              <div className="text-xs text-[#8c96a5] flex items-center gap-1 hover:text-white transition-colors">
                <span>{expanded ? "Réduire" : "Voir toutes les stations"}</span>
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

          {/* شارات الطقس والتوقيت الأنيقة في الزاوية المقابلة */}
          <div className="flex items-center gap-2 pl-3 flex-shrink-0">
            {weather && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-mono font-bold text-white/90 shadow-inner"
                title={weather.condition}
              >
                <span>{weather.icon}</span>
                <span>{weather.temp}°C</span>
              </div>
            )}
            <div className="text-sm font-semibold text-white/90 font-mono tracking-tight flex items-center gap-1">
              <span className="text-xs opacity-60">{weather?.isDay ? "☀️" : "🌙"}</span>
              <span>{localTime}</span>
            </div>
          </div>
        </div>

        {/* 2. شريط تشغيل الإذاعة النشطة ومحلل الصوت النبضي */}
        <div className="px-5 py-2.5 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-bold text-[15px] truncate text-[#00e070] tracking-tight">
                {currentStation?.name || "Prêt à écouter"}
              </div>
              {/* محلل الطيف الصوتي المصغر */}
              {isPlaying && (
                <div className="flex items-end gap-[2px] h-3 shrink-0">
                  <span className="w-[2.5px] bg-[#00e070] rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-full" />
                  <span className="w-[2.5px] bg-[#00e070] rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2/3" />
                  <span className="w-[2.5px] bg-[#00e070] rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4/5" />
                </div>
              )}
            </div>
            <div className="text-xs text-white/50 truncate mt-0.5">
              {error ? (
                <span className="text-rose-400 font-medium">{error}</span>
              ) : (
                `${activePlace?.name || ""}, ${activePlace?.country || currentStation?.country || "Monde"}`
              )}
            </div>
          </div>

          {/* أزرار التحكم بالصوت */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* زر التشغيل والإيقاف المحاط بحلقة متقطعة خضراء */}
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-10 h-10 rounded-full border-2 border-dashed border-[#00e070] flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
              title={isPlaying ? "Arrêter" : "Écouter"}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Square className="w-3.5 h-3.5 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>

            {/* زر الإذاعة التالية */}
            <button
              onClick={handleNext}
              className="p-1.5 text-white hover:text-[#00e070] transition-colors"
              title="Station suivante"
            >
              <SkipForward className="w-5 h-5 fill-white" />
            </button>
          </div>
        </div>

        {/* 3. الجزء القابل للتوسيع (عند سحب الدرج للأعلى) */}
        {expanded && (
          <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-white/10 space-y-3">
            
            {/* بطاقة القياسات الفضائية الحية للمدينة (Telemetry HUD Dossier) */}
            <div className="pt-1 pb-2">
              <div className="flex items-center gap-2 mb-2 text-[11px] font-mono text-[#00e070] tracking-wider uppercase font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e070] animate-ping" />
                <span>Données orbitales • En direct</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/[0.04] border border-white/5 p-2.5 rounded-xl">
                  <div className="text-[10px] text-white/40 uppercase font-mono">Météo actuelle</div>
                  <div className="text-xs font-bold text-white/90 flex items-center justify-center gap-1 mt-0.5">
                    <span>{weather ? `${weather.icon} ${weather.temp}°C` : "--"}</span>
                    <span className="text-[10px] font-normal text-white/50 truncate max-w-[80px]">
                      {weather?.condition}
                    </span>
                  </div>
                </div>

                <div className="bg-white/[0.04] border border-white/5 p-2.5 rounded-xl">
                  <div className="text-[10px] text-white/40 uppercase font-mono">Distance de vous</div>
                  <div className="text-xs font-mono font-bold text-[#00e070] mt-0.5">
                    {distanceKm ? `${distanceKm.toLocaleString()} km` : "Calcul..."}
                  </div>
                </div>

                <div className="bg-white/[0.04] border border-white/5 p-2.5 rounded-xl">
                  <div className="text-[10px] text-white/40 uppercase font-mono">Coordonnées</div>
                  <div className="text-xs font-mono text-white/80 mt-0.5">
                    {lat !== undefined && lng !== undefined ? `${lat.toFixed(1)}°, ${lng.toFixed(1)}°` : "--"}
                  </div>
                </div>

                <div className="bg-white/[0.04] border border-white/5 p-2.5 rounded-xl">
                  <div className="text-[10px] text-white/40 uppercase font-mono">Cycle solaire</div>
                  <div className="text-xs font-mono font-bold text-white/90 mt-0.5">
                    {weather?.isDay ? "Journée ☀️" : "Nuit étoilée 🌙"}
                  </div>
                </div>
              </div>
            </div>

            {activeTab === "settings" ? (
              /* شاشة الإعدادات الأصلية بالكامل */
              <div className="space-y-4 pt-2">
                <div className="font-bold text-lg text-white">Réglages</div>
                <div className="space-y-2 text-sm text-white/80">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span>Mode sombre</span>
                    <span className="text-white/40">Activé</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span>Qualité du globe</span>
                    <span className="text-white/40">Haute</span>
                  </div>
                  <div className="pt-2 font-bold text-white">Informations</div>
                  <a href="/about" className="flex justify-between py-2 border-b border-white/5 hover:text-[#00e070]">
                    <span>À propos de Radio Garden</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                  <a href="/privacy-policy" className="flex justify-between py-2 border-b border-white/5 hover:text-[#00e070]">
                    <span>Politique de confidentialité</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                  <a href="/contact" className="flex justify-between py-2 border-b border-white/5 hover:text-[#00e070]">
                    <span>Contact</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : (
              /* قائمة الإجراءات والمحطات الأصلية بالكامل */
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleShare}
                  className="w-full flex items-center gap-3 py-2.5 text-sm font-medium hover:text-[#00e070] transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Partager la station</span>
                </button>

                {currentStation?.homepage && (
                  <a
                    href={currentStation.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between py-2.5 text-sm font-medium hover:text-[#00e070] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ExternalLink className="w-4 h-4" />
                      <span>Visiter le site web</span>
                    </div>
                  </a>
                )}

                <button
                  onClick={() => currentStation && toggleFavorite(currentStation)}
                  className="w-full flex items-center gap-3 py-2.5 text-sm font-medium hover:text-rose-400 transition-colors"
                >
                  <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                  <span>{isFav ? "Retirer des favoris" : "Ajouter aux favoris"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. شريط التبويبات الخمسة الأصلي لـ Radio Garden */}
        <div className="flex items-center justify-around py-3 border-t border-white/10 bg-[#0a0d14]">
          <button
            onClick={() => {
              setActiveTab("globe");
              setExpanded(false);
            }}
            className={`p-2 transition-colors ${activeTab === "globe" ? "text-[#00e070]" : "text-white/40 hover:text-white"}`}
            title="Globe"
          >
            <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab("fav");
              setExpanded(true);
            }}
            className={`p-2 transition-colors ${activeTab === "fav" ? "text-[#00e070]" : "text-white/40 hover:text-white"}`}
            title="Favoris"
          >
            <Heart className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setActiveTab("explore");
              setExpanded(!expanded);
            }}
            className={`p-2 transition-colors ${activeTab === "explore" ? "text-[#00e070]" : "text-white/40 hover:text-white"}`}
            title="Explorer"
          >
            <Compass className="w-5 h-5" />
          </button>

          <button
            onClick={() => onOpenSearch()}
            className="p-2 text-white/40 hover:text-white transition-colors"
            title="Rechercher"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setActiveTab("settings");
              setExpanded(true);
            }}
            className={`p-2 transition-colors ${activeTab === "settings" ? "text-[#00e070]" : "text-white/40 hover:text-white"}`}
            title="Réglages"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// دالة حساب المسافة الفلكية الدقيقة بالـ Haversine
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ترجمة الرموز المناخية بالفرنسية المطابقة لتطبيقك
function getWeatherDescFr(code: number): string {
  if (code === 0) return "Ciel dégagé";
  if (code === 1 || code === 2) return "Partiellement nuageux";
  if (code === 3) return "Couvert";
  if ([45, 48].includes(code)) return "Brouillard";
  if ([51, 53, 55, 61, 63, 65].includes(code)) return "Pluie";
  if ([71, 73, 75, 77].includes(code)) return "Chute de neige";
  if ([80, 81, 82].includes(code)) return "Averses";
  if ([95, 96, 99].includes(code)) return "Orages";
  return "Tempéré";
}

function getWeatherIcon(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? "☀️" : "✨";
  if (code === 1 || code === 2) return isDay ? "🌤️" : "☁️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return isDay ? "☀️" : "🌙";
}

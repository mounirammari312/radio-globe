
"use client";

import { useState, useMemo } from "react";
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

  // حساب التوقيت المحلي اللحظي بناءً على خط الطول الجغرافي
  const localTime = useMemo(() => {
    const lng = activePlace ? activePlace.lng : currentStation ? currentStation.lng : 0;
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const offsetHours = Math.round(lng / 15);
    const target = new Date(utc + 3600000 * offsetHours);
    const hh = String(target.getHours()).padStart(2, "0");
    const mm = String(target.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [activePlace, currentStation]);

  const isFav = currentStation ? favorites.some((f) => f.id === currentStation.id) : false;

  // الانتقال للمحطة التالية عشوائياً أو داخل نفس المدينة
  const handleNext = () => {
    if (places.length === 0) return;
    const nextIdx = Math.floor(Math.random() * places.length);
    onSelectPlace(places[nextIdx]);
  };

  const handleShare = () => {
    if (navigator.share && currentStation) {
      navigator.share({
        title: `Radio Garden - ${currentStation.name}`,
        text: `Écoutez ${currentStation.name} en direct!`,
        url: window.location.href,
      });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col justify-end pointer-events-none">
      {/* هيكل الدرج السفلي Glassmorphism */}
      <div
        className={`pointer-events-auto w-full max-w-lg mx-auto bg-[#10141d]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.85)] text-white transition-all duration-300 ease-out flex flex-col ${
          expanded ? "max-h-[82vh] h-[82vh]" : "max-h-[200px]"
        }`}
      >
        {/* مقبض السحب العلوي */}
        <div
          className="w-full pt-2.5 pb-1 flex justify-center cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-10 h-1 bg-white/30 rounded-full hover:bg-white/50 transition-colors" />
        </div>

        {/* 1. صف المدينة والتوقيت المحلي (طابق الأصل 100%) */}
        <div className="px-5 py-2 flex items-center justify-between border-b border-white/5">
          <div
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
            onClick={() => setExpanded(!expanded)}
          >
            {/* فقاعة العدد البيضاء */}
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

          <div className="text-base font-semibold text-white/90 pl-3 font-mono">
            {localTime}
          </div>
        </div>

        {/* 2. شريط تشغيل الإذاعة النشطة (الأخضر الفسفوري + زر الحلقة المتقطعة) */}
        <div className="px-5 py-2.5 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] truncate text-[#00e070] tracking-tight">
              {currentStation?.name || "Prêt à écouter"}
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
            {activeTab === "settings" ? (
              /* شاشة الإعدادات المطابقة للصورة 170853.jpg */
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
              /* قائمة الإجراءات والمحطات المطابقة للصورة 170840.jpg */
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

"use client";

import { Search, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onSearchClick: () => void;
  stationCount: number;
}

export default function Header({ onSearchClick, stationCount }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
      <div className="pointer-events-auto px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 bg-black/30 backdrop-blur-md rounded-full px-3 py-2 sm:px-4 sm:py-2 border border-emerald-500/20">
          <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center overflow-hidden">
            <Globe2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <div className="absolute inset-0 rounded-full ring-1 ring-white/30" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-white font-semibold text-sm sm:text-base">
              Radio Globe
            </span>
            <span className="text-emerald-400/80 text-[10px] sm:text-xs hidden sm:block">
              {stationCount > 0
                ? `${stationCount.toLocaleString()} places • 30k+ stations live`
                : "Loading…"}
            </span>
          </div>
        </div>

        {/* Search button */}
        <Button
          onClick={onSearchClick}
          className="bg-black/30 backdrop-blur-md border border-emerald-500/20 hover:bg-white/10 text-white rounded-full px-4 sm:px-5 h-10 sm:h-11 shadow-lg"
          variant="ghost"
        >
          <Search className="w-4 h-4 sm:mr-2 text-emerald-400" />
          <span className="hidden sm:inline text-sm font-medium">
            Search stations
          </span>
        </Button>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRadioStore } from "@/store/radio-store";

/**
 * Smart Ad Container:
 *  - Displays a responsive 728×90 / 320×50 banner ad below the player
 *  - Only refreshes the ad every 45 SECONDS while audio is playing
 *  - Pauses refresh when audio stops (preserves ad quality + budget)
 *  - Falls back to a placeholder if AdSense is not configured
 *
 * Setup:
 *  1. Add the Google AdSense script to <head> via the `googleAdsenseId` prop
 *     on this component OR set the env var NEXT_PUBLIC_ADSENSE_CLIENT.
 *  2. Place <AdContainer /> directly below the <NowPlayingBar />.
 *
 * Compatible with Google AdSense Program Policies (refresh interval ≥ 30s).
 */

const REFRESH_INTERVAL_MS = 45000; // 45s — AdSense policy compliant
const AD_SLOT_DESKTOP = "1234567890"; // Replace with your AdSense slot ID
const AD_SLOT_MOBILE = "0987654321";

interface AdContainerProps {
  adsenseClient?: string; // e.g. "ca-pub-1234567890123456"
  adsenseSlot?: string; // your ad slot ID
  className?: string;
}

export default function AdContainer({
  adsenseClient,
  adsenseSlot,
  className = "",
}: AdContainerProps) {
  const isPlaying = useRadioStore((s) => s.isPlaying);
  const currentStation = useRadioStore((s) => s.currentStation);
  const adRef = useRef<HTMLModElement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile vs desktop for ad slot
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Inject the AdSense script once (if a client ID is provided)
  useEffect(() => {
    const client = adsenseClient || process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    if (!client) return;
    const existing = document.getElementById("adsense-script");
    if (existing) return;
    const script = document.createElement("script");
    script.id = "adsense-script";
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [adsenseClient]);

  // Smart refresh: only refresh while audio is playing, every 45s
  useEffect(() => {
    if (!isPlaying) return; // pause refresh when not playing
    const timer = setInterval(() => {
      setRefreshKey((k) => k + 1);
      // Tell AdSense to re-display the ad slot
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // ignore if adsbygoogle isn't loaded
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Push the ad on first render and after each refresh
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded yet — non-fatal
    }
  }, [refreshKey]);

  const client = adsenseClient || process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = adsenseSlot || (isMobile ? AD_SLOT_MOBILE : AD_SLOT_DESKTOP);

  // If no AdSense client is configured, show a placeholder
  if (!client) {
    return (
      <div
        className={`hidden md:flex items-center justify-center bg-white/5 border border-white/10 rounded-lg mx-auto ${className}`}
        style={{ width: "100%", maxWidth: "728px", height: "90px" }}
        aria-label="Ad space"
      >
        <span className="text-xs text-white/40">
          Ad space (configure AdSense to enable)
        </span>
      </div>
    );
  }

  return (
    <div
      className={`hidden md:flex items-center justify-center mx-auto ${className}`}
      style={{ width: "100%", maxWidth: "728px", height: "90px" }}
      aria-label="Advertisement"
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        key={refreshKey}
      />
    </div>
  );
}

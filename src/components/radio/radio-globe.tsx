"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";

// Radio Garden's exact color palette (from their CSS variables):
//   --color-map-background-rgb: 45,0,255  (deep blue/purple)
//   --color-primary-rgb-bright: 0,224,112  (bright green)
//   --color-primary-intense: rgb(0,255,130)

export interface Place {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  stationCount: number;
  top: {
    id: string;
    name: string;
    url: string;
    urlResolved: string;
    favicon: string;
    country: string;
    countryCode: string;
    bitrate: number;
    codec: string;
  };
}

interface RadioGlobeProps {
  places: Place[];
  activePlaceId?: string | null;
  onPlaceClick: (place: Place) => void;
  onCenterChange?: (lat: number, lng: number) => void;
}

// Build a minimal globe style — deep blue background + atmosphere + green dots
const GLOBE_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "rgb(20, 8, 60)",
      },
    },
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.5,
        "raster-saturation": -0.6,
        "raster-contrast": 0.1,
        "raster-brightness-min": 0.05,
        "raster-brightness-max": 0.5,
      },
    },
  ],
};

export default function RadioGlobe({
  places,
  activePlaceId,
  onPlaceClick,
  onCenterChange,
}: RadioGlobeProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const rotateRef = useRef<number | null>(null);

  // Initialize the map once (lazy-load maplibre-gl on the client to bypass Turbopack)
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;
    let map: any = null;

    // Lazy-load maplibre-gl + its CSS dynamically (client-only, no SSR)
    Promise.all([
      import("maplibre-gl"),
      import("maplibre-gl/dist/maplibre-gl.css"),
    ]).then(([mod]) => {
      if (cancelled || !mapContainer.current) return;
      const maplibregl = (mod as any).default || mod;

      map = new maplibregl.Map({
        container: mapContainer.current,
        style: GLOBE_STYLE as any,
        center: [10, 25],
        zoom: 1.5,
        minZoom: 1,
        maxZoom: 12,
        maxPitch: 60,
        pitch: 0,
        attributionControl: false,
        dragRotate: true,
        dragPan: true,
        scrollZoom: true,
        touchZoomRotate: true,
        projection: { type: "globe" } as any,
        antialias: true,
      });

      mapRef.current = map;

      map.on("load", () => {
        // Add atmosphere + sky to give the radio.garden cosmic feel
        try {
          map.setSky({
            "sky-color": "rgb(8, 4, 30)",
            "horizon-color": "rgb(45, 0, 100)",
            "sky-horizon-blend": 0.5,
            "horizon-fog-blend": 0.3,
            "fog-color": "rgb(45, 0, 100)",
            "fog-ground-blend": 0.5,
          });
        } catch {
          // setSky may not exist on all maplibre versions — non-fatal
        }
        setReady(true);
      });

      // Stop autorotate after the user interacts
      let stopTimer: any = null;
      const stopRotate = () => {
        if (autoRotate) {
          setAutoRotate(false);
          if (stopTimer) clearTimeout(stopTimer);
          stopTimer = setTimeout(() => setAutoRotate(true), 12000);
        }
      };
      map.on("dragstart", stopRotate);
      map.on("zoomstart", stopRotate);
      map.on("rotatestart", stopRotate);
      map.on("pitchstart", stopRotate);

      // Notify on center change for finding nearby places
      map.on("moveend", () => {
        const center = map.getCenter();
        onCenterChange?.(center.lat, center.lng);
      });
    });

    return () => {
      cancelled = true;
      if (stopTimer) clearTimeout(stopTimer);
      if (rotateRef.current) cancelAnimationFrame(rotateRef.current);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Auto-rotate using a continuous animation loop
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (!autoRotate) {
      if (rotateRef.current) {
        cancelAnimationFrame(rotateRef.current);
        rotateRef.current = null;
      }
      return;
    }

    let last = performance.now();
    const rotateLoop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const map = mapRef.current;
      if (map) {
        const center = map.getCenter();
        // Slow eastward rotation: 6 deg/sec
        let newLng = center.lng + dt * 6;
        if (newLng > 180) newLng -= 360;
        map.setCenter({ lng: newLng, lat: center.lat }, { animate: false });
      }
      rotateRef.current = requestAnimationFrame(rotateLoop);
    };
    rotateRef.current = requestAnimationFrame(rotateLoop);

    return () => {
      if (rotateRef.current) cancelAnimationFrame(rotateRef.current);
      rotateRef.current = null;
    };
  }, [ready, autoRotate]);

  // Update markers when places change
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    // Need to re-import maplibre-gl for the Marker + Popup classes
    let cancelled = false;
    import("maplibre-gl").then((mod) => {
      if (cancelled || !mapRef.current) return;
      const maplibregl = (mod as any).default || mod;
      const map = mapRef.current;

      // Clear existing markers
      markersRef.current.forEach((m: any) => m.remove());
      markersRef.current = [];

      // Create a green dot DOM element for each place
      // We cap markers at 3000 to keep DOM performance reasonable
      const maxMarkers = 3000;
      const placesToShow = places.slice(0, maxMarkers);

      for (const place of placesToShow) {
        const dot = document.createElement("div");
        dot.style.cssText = `
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgb(0, 224, 112);
          box-shadow: 0 0 8px rgba(0, 224, 112, 0.8), 0 0 2px rgba(0, 0, 0, 0.5);
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
          border: 1px solid rgba(255, 255, 255, 0.5);
        `;
        dot.title = `${place.name} (${place.stationCount} stations)`;
        dot.onmouseenter = () => {
          dot.style.transform = "scale(1.5)";
          dot.style.background = "rgb(0, 255, 130)";
        };
        dot.onmouseleave = () => {
          dot.style.transform = "scale(1)";
          dot.style.background = "rgb(0, 224, 112)";
        };
        dot.onclick = (e: any) => {
          e.stopPropagation();
          onPlaceClick(place);
        };

        const marker = new maplibregl.Marker({ element: dot })
          .setLngLat([place.lng, place.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
              `<div style="background:rgba(10,20,40,0.92);color:#fff;padding:6px 10px;border-radius:6px;font-family:system-ui;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:1px solid rgba(0,224,112,0.3);">
                <div style="font-weight:600;font-size:13px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(place.name)}</div>
                <div style="font-size:10px;color:rgb(126,224,163);margin-top:2px;">${escapeHtml(place.country)} • ${place.stationCount} stations</div>
              </div>`
            )
          )
          .addTo(map);

        markersRef.current.push(marker);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ready, places, onPlaceClick]);

  // Fly to active place
  useEffect(() => {
    if (!ready || !mapRef.current || !activePlaceId) return;
    const place = places.find((p) => p.id === activePlaceId);
    if (!place) return;
    mapRef.current.flyTo({
      center: [place.lng, place.lat],
      zoom: 4,
      duration: 1200,
      essential: true,
    });
    // Use a small delay to defer the setState (avoid cascading renders)
    const t = setTimeout(() => setAutoRotate(false), 0);
    return () => clearTimeout(t);
  }, [activePlaceId, places, ready]);

  return (
    <div className="relative w-full h-full">
      {/* Crosshair in the center — gives the "tuning" feel like Radio Garden */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 opacity-50">
        <div className="relative w-10 h-10">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-400 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-400 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-emerald-400 rounded-full" />
        </div>
      </div>

      <div ref={mapContainer} className="absolute inset-0 maplibre-globe-bg" />

      {/* Atmosphere glow overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 50%, rgba(8, 4, 30, 0.4) 100%)",
        }}
      />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

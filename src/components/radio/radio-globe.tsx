"use client";

import { useRef, useEffect, useState } from "react";

// Radio Garden's exact color palette:
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

// Esri World Imagery (satellite) — gives the realistic 3D earth look like Radio Garden
// Free for non-commercial use, no API key required.
const GLOBE_STYLE = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© Esri, Maxar, Earthstar Geographics",
    },
    esri_labels: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© Esri",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "rgb(8, 4, 30)",
      },
    },
    {
      id: "satellite",
      type: "raster",
      source: "esri",
      paint: {
        // Slight darkening + saturation reduction for the radio.garden aesthetic
        "raster-opacity": 0.85,
        "raster-saturation": -0.3,
        "raster-contrast": 0.05,
        "raster-brightness-min": 0.1,
        "raster-brightness-max": 0.85,
      },
    },
    {
      id: "labels",
      type: "raster",
      source: "esri_labels",
      paint: {
        "raster-opacity": 0.6,
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

  // Initialize the map once — lazy-load maplibre-gl on the client (bypasses SSR/bundler issues)
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;
    let map: any = null;
    let stopTimer: any = null;
    let resizeObserver: any = null;

    // Lazy-load maplibre-gl + its CSS dynamically (client-only, no SSR)
    Promise.all([
      import("maplibre-gl"),
      import("maplibre-gl/dist/maplibre-gl.css"),
    ]).then(([mod]) => {
      if (cancelled || !mapContainer.current) return;
      const maplibregl = (mod as any).default || mod;

      try {
        map = new maplibregl.Map({
          container: mapContainer.current,
          style: GLOBE_STYLE as any,
          center: [10, 25],
          zoom: 1.8,
          minZoom: 1,
          maxZoom: 12,
          maxPitch: 60,
          pitch: 0,
          attributionControl: false,
          dragRotate: true,
          dragPan: true,
          scrollZoom: true,
          touchZoomRotate: true,
          // 3D GLOBE PROJECTION — the key feature that makes us Radio Garden
          // Supported in maplibre-gl v5.0.0+
          projection: { type: "globe" } as any,
          antialias: true,
        });
      } catch (err) {
        console.error("MapLibre init failed:", err);
        return;
      }

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
          // setSky may not exist — non-fatal
        }

        // Set globe projection explicitly (some versions need this after load)
        try {
          map.setProjection({ type: "globe" } as any);
        } catch {
          // ignore — already set in constructor
        }

        // Force the map to fill the container
        try {
          map.resize();
        } catch {}

        setReady(true);
      });

      // Re-resize on window resize
      const handleResize = () => {
        if (map && !cancelled) {
          try {
            map.resize();
          } catch {}
        }
      };
      window.addEventListener("resize", handleResize);
      const initialResize = setTimeout(handleResize, 100);

      // Use ResizeObserver for layout changes (e.g. sidebar opening)
      if (typeof ResizeObserver !== "undefined" && mapContainer.current) {
        resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(mapContainer.current);
      }

      // Stop autorotate after the user interacts
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

      map.on("moveend", () => {
        const center = map.getCenter();
        onCenterChange?.(center.lat, center.lng);
      });
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize as any);
      clearTimeout(initialResize as any);
      if (stopTimer) clearTimeout(stopTimer);
      if (resizeObserver) resizeObserver.disconnect();
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
        // Slow eastward rotation: 5 deg/sec
        let newLng = center.lng + dt * 5;
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

    let cancelled = false;
    import("maplibre-gl").then((mod) => {
      if (cancelled || !mapRef.current) return;
      const maplibregl = (mod as any).default || mod;
      const map = mapRef.current;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Cap markers at 3000 for performance
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
    const t = setTimeout(() => setAutoRotate(false), 0);
    return () => clearTimeout(t);
  }, [activePlaceId, places, ready]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
      }}
    >
      {/* Crosshair in the center — gives the "tuning" feel like Radio Garden */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          pointerEvents: "none",
          opacity: 0.5,
        }}
      >
        <div style={{ position: "relative", width: 40, height: 40 }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: 1,
              background: "rgb(52, 211, 153)",
              transform: "translateY(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgb(52, 211, 153)",
              transform: "translateX(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 8,
              height: 8,
              border: "1px solid rgb(52, 211, 153)",
              borderRadius: "50%",
            }}
          />
        </div>
      </div>

      <div
        ref={mapContainer}
        className="maplibre-globe-bg"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* Atmosphere glow overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at center, transparent 55%, rgba(8, 4, 30, 0.5) 100%)",
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

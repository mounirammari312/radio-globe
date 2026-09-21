
"use client";

import { useRef, useEffect, useState, useMemo } from "react";

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
      attribution: "© Esri, Maxar",
    },
    esri_labels: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "rgb(25, 5, 195)", // خلفية الفضاء الأصلية لـ Radio Garden
      },
    },
    {
      id: "satellite",
      type: "raster",
      source: "esri",
      paint: {
        "raster-opacity": 0.9,
        "raster-contrast": 0.08,
      },
    },
    {
      id: "labels",
      type: "raster",
      source: "esri_labels",
      paint: {
        "raster-opacity": 0.5,
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
  const hoverPopupRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const rotateRef = useRef<number | null>(null);

  // تحويل مصفوفة الأماكن إلى كائن GeoJSON عالي السرعة لكرت الشاشة
  const geojsonData = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: places.map((p) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [p.lng, p.lat],
        },
        properties: {
          id: p.id,
          name: p.name,
          country: p.country,
          stationCount: p.stationCount,
          raw: JSON.stringify(p),
        },
      })),
    };
  }, [places]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let cancelled = false;
    let map: any = null;
    let stopTimer: any = null;
    let resizeObserver: any = null;

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
          maxZoom: 14,
          maxPitch: 60,
          pitch: 0,
          attributionControl: false,
          dragRotate: true,
          dragPan: true,
          scrollZoom: true,
          touchZoomRotate: true,
          projection: { type: "globe" } as any,
          canvasContextAttributes: { antialias: true, powerPreference: "high-performance" },
        });
      } catch (err) {
        console.error("MapLibre initialization failed:", err);
        return;
      }

      mapRef.current = map;

      // إنشاء نافذة منبثقة عائمة واحدة يُعاد استخدامها برمجياً دون إثقال الـ DOM
      const hoverPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
      });
      hoverPopupRef.current = hoverPopup;

      map.on("load", () => {
        // تفعيل الغلاف الجوي والضباب الفضائي
        try {
          map.setSky({
            "sky-color": "rgb(8, 4, 30)",
            "horizon-color": "rgb(25, 5, 195)",
            "sky-horizon-blend": 0.5,
            "horizon-fog-blend": 0.3,
            "fog-color": "rgb(25, 5, 195)",
            "fog-ground-blend": 0.5,
          });
        } catch {}

        try {
          map.setProjection({ type: "globe" } as any);
        } catch {}

        // تغذية معالج الرسوميات GPU ببيانات المحطات دفعة واحدة
        map.addSource("radio-places", {
          type: "geojson",
          data: geojsonData,
        });

        // طبقة النقاط الخضراء الفسفورية الأصلية
        map.addLayer({
          id: "radio-dots",
          type: "circle",
          source: "radio-places",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1.5,
              2.0, // نقطة ناعمة عند البعد الكامل
              4,
              3.8,
              8,
              7.5,
            ],
            "circle-color": "rgb(0, 224, 112)",
            "circle-opacity": 0.95,
            "circle-stroke-width": 0.8,
            "circle-stroke-color": "#ffffff",
          },
        });

        // إظهار النافذة المنبثقة الأنيقة عند التمرير بالماوس فوق أي نقطة
        map.on("mouseenter", "radio-dots", (e: any) => {
          map.getCanvas().style.cursor = "pointer";
          if (!e.features || !e.features[0]) return;
          const feat = e.features[0];
          const coords = feat.geometry.coordinates.slice();
          const { name, country, stationCount } = feat.properties;

          hoverPopup
            .setLngLat(coords)
            .setHTML(
              `<div style="background:rgba(10,20,40,0.92);color:#fff;padding:6px 10px;border-radius:6px;font-family:system-ui;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:1px solid rgba(0,224,112,0.3);">
                <div style="font-weight:600;font-size:13px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(name)}</div>
                <div style="font-size:10px;color:rgb(126,224,163);margin-top:2px;">${escapeHtml(country)} • ${stationCount} stations</div>
              </div>`
            )
            .addTo(map);
        });

        map.on("mouseleave", "radio-dots", () => {
          map.getCanvas().style.cursor = "";
          hoverPopup.remove();
        });

        // النقر واختيار المحطة
        map.on("click", "radio-dots", (e: any) => {
          if (!e.features || !e.features[0]) return;
          const raw = e.features[0].properties.raw;
          if (raw) {
            const placeObj = JSON.parse(raw);
            onPlaceClick(placeObj);
          }
        });

        try {
          map.resize();
        } catch {}

        setReady(true);
      });

      // الحفاظ على مراقبة أبعاد الشاشة لضمان عدم تشوه الكرة عند فتح الشريط الجانبي
      const handleResize = () => {
        if (map && !cancelled) {
          try {
            map.resize();
          } catch {}
        }
      };

      window.addEventListener("resize", handleResize);
      const initialResize = setTimeout(handleResize, 100);

      if (typeof ResizeObserver !== "undefined" && mapContainer.current) {
        resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(mapContainer.current);
      }

      // إيقاف الدوران التلقائي مؤقتاً عند تفاعل المستخدم
      const stopRotate = () => {
        setAutoRotate(false);
        if (stopTimer) clearTimeout(stopTimer);
        stopTimer = setTimeout(() => setAutoRotate(true), 12000);
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
      window.removeEventListener("resize", () => {});
      if (stopTimer) clearTimeout(stopTimer);
      if (resizeObserver) resizeObserver.disconnect();
      if (rotateRef.current) cancelAnimationFrame(rotateRef.current);
      if (hoverPopupRef.current) hoverPopupRef.current.remove();
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // تحديث مصدر بيانات الـ GPU فوراً عند تغير قائمة الأماكن
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const source = mapRef.current.getSource("radio-places");
    if (source) {
      source.setData(geojsonData);
    }
  }, [geojsonData, ready]);

  // الدوران التلقائي السلس
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
      if (map && !map.isMoving()) {
        const center = map.getCenter();
        let newLng = center.lng + dt * 4;
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

  // الطيران إلى المحطة المختارة
  useEffect(() => {
    if (!ready || !mapRef.current || !activePlaceId) return;
    const place = places.find((p) => p.id === activePlaceId);
    if (!place) return;
    mapRef.current.flyTo({
      center: [place.lng, place.lat],
      zoom: 4.5,
      duration: 1200,
      essential: true,
    });
    setAutoRotate(false);
  }, [activePlaceId, places, ready]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[rgb(8,4,30)]">
      {/* مؤشر التنشين الأصلي الخاص بـ Radio Garden */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-80">
        <div className="relative w-10 h-10">
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-emerald-400 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-emerald-400 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 border border-emerald-400 rounded-full" />
        </div>
      </div>

      {/* حاوية الخريطة ثلاثية الأبعاد */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* تدرج الغلاف الجوي الكوني المحيط */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 55%, rgba(8, 4, 30, 0.55) 100%)",
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

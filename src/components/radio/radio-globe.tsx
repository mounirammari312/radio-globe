
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
        "background-color": "rgb(25, 5, 195)",
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

  // مرجع متزامن وفوري للتحكم في توقف الدوران بمجرد ملامسة الشاشة
  const isInteractingRef = useRef<boolean>(false);
  const stopTimerRef = useRef<any>(null);
  const rotateRef = useRef<number | null>(null);

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
          // تفعيل كافة متحكمات اللمس والسحب بإحكام
          dragRotate: true,
          dragPan: true,
          scrollZoom: true,
          touchZoomRotate: true,
          touchPitch: false,
          projection: { type: "globe" } as any,
          canvasContextAttributes: { antialias: true, powerPreference: "high-performance" },
        });
      } catch (err) {
        console.error("MapLibre initialization failed:", err);
        return;
      }

      mapRef.current = map;

      const hoverPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
      });
      hoverPopupRef.current = hoverPopup;

      map.on("load", () => {
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

        // طبقة النقاط على كرت الشاشة
        map.addSource("radio-places", {
          type: "geojson",
          data: geojsonData,
        });

        map.addLayer({
          id: "radio-dots",
          type: "circle",
          source: "radio-places",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1.5, 2.0,
              4, 3.8,
              8, 7.5,
            ],
            "circle-color": "rgb(0, 224, 112)",
            "circle-opacity": 0.95,
            "circle-stroke-width": 0.8,
            "circle-stroke-color": "#ffffff",
          },
        });

        // النوافذ المنبثقة عند التمرير
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

      // إيقاف الدوران فوراً لحظة ملامسة الشاشة
      const onUserTouchStart = () => {
        isInteractingRef.current = true;
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      };

      // استئناف الدوران بعد 10 ثوانٍ من ترك الشاشة
      const onUserTouchEnd = () => {
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        stopTimerRef.current = setTimeout(() => {
          isInteractingRef.current = false;
        }, 10000);
      };

      const canvas = map.getCanvas();
      canvas.addEventListener("touchstart", onUserTouchStart, { passive: true });
      canvas.addEventListener("touchend", onUserTouchEnd, { passive: true });
      canvas.addEventListener("mousedown", onUserTouchStart);
      canvas.addEventListener("mouseup", onUserTouchEnd);

      map.on("dragstart", onUserTouchStart);
      map.on("dragend", onUserTouchEnd);
      map.on("zoomstart", onUserTouchStart);
      map.on("zoomend", onUserTouchEnd);

      map.on("moveend", () => {
        const center = map.getCenter();
        onCenterChange?.(center.lat, center.lng);
      });

      const handleResize = () => {
        if (map && !cancelled) {
          try {
            map.resize();
          } catch {}
        }
      };

      window.addEventListener("resize", handleResize);
      if (typeof ResizeObserver !== "undefined" && mapContainer.current) {
        resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(mapContainer.current);
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", () => {});
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (resizeObserver) resizeObserver.disconnect();
      if (rotateRef.current) cancelAnimationFrame(rotateRef.current);
      if (hoverPopupRef.current) hoverPopupRef.current.remove();
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // تحديث نقاط الـ GPU
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const source = mapRef.current.getSource("radio-places");
    if (source) {
      source.setData(geojsonData);
    }
  }, [geojsonData, ready]);

  // حلقة الدوران التلقائي: تفحص المرجع الفوري (isInteractingRef) قبل كل إطار
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    let last = performance.now();
    const rotateLoop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      // إذا كان المستخدم يلمس الشاشة، لا نحرك الخريطة برمجياً إطلاقاً
      if (!isInteractingRef.current && mapRef.current) {
        const map = mapRef.current;
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
  }, [ready]);

  // الطيران إلى المحطة عند الاختيار
  useEffect(() => {
    if (!ready || !mapRef.current || !activePlaceId) return;
    const place = places.find((p) => p.id === activePlaceId);
    if (!place) return;
    
    isInteractingRef.current = true;
    mapRef.current.flyTo({
      center: [place.lng, place.lat],
      zoom: 4.5,
      duration: 1200,
      essential: true,
    });
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
        overflow: "hidden",
        backgroundColor: "rgb(8, 4, 30)",
        touchAction: "none", // منع متصفح الهاتف من اعتراض إيماءات اللمس
      }}
    >
      {/* مؤشر التنشين مع تعطيل التفاعل بالماوس بشكل صريح */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          pointerEvents: "none",
          opacity: 0.8,
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
              backgroundColor: "rgb(52, 211, 153)",
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
              backgroundColor: "rgb(52, 211, 153)",
              transform: "translateX(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 10,
              height: 10,
              border: "1px solid rgb(52, 211, 153)",
              borderRadius: "50%",
            }}
          />
        </div>
      </div>

      {/* حاوية الخريطة ثلاثية الأبعاد - تسمح بمرور اللمس بالكامل */}
      <div
        ref={mapContainer}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          touchAction: "none",
        }}
      />

      {/* الغلاف الجوي الكوني مع تعطيل تفاعل اللمس حتى لا يحجب الخريطة */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
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

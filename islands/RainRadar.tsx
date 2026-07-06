import { useEffect, useRef, useState } from "preact/hooks";
import {
  formatFrameTime,
  loadRainFrames,
  omFrameUrl,
  radarFrameUrl,
  type RainFrame,
} from "../lib/rain-radar.ts";

const FRAME_DELAY_MS = 450;
const MAPLIBRE_CSS =
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const OM_LAYER_JS =
  "https://unpkg.com/@openmeteo/weather-map-layer@0.0.19/dist/index.js";

function loadStyle(href: string): Promise<void> {
  if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject();
    document.head.appendChild(link);
  });
}

function loadScript(src: string): Promise<void> {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

type MapInstance = {
  Map: new (options: Record<string, unknown>) => MapInstance;
  addProtocol: (name: string, handler: (...args: unknown[]) => unknown) => void;
  on: (event: string, handler: () => void) => void;
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>) => void;
  getSource: (id: string) => unknown;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
  isStyleLoaded: () => boolean;
  remove: () => void;
};

export function RainRadar({ lat, lon }: { lat: number; lon: number }) {
  const [host, setHost] = useState("");
  const [frames, setFrames] = useState<RainFrame[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const timerRef = useRef<number>();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MapInstance | null>(null);
  const lastForecastStep = useRef<string | null>(null);
  const radarCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    loadRainFrames()
      .then((data) => {
        if (cancelled) return;
        radarCountRef.current = data.frames.findIndex((f) => f.kind === "forecast");
        if (radarCountRef.current === -1) {
          radarCountRef.current = data.frames.length;
        }
        setHost(data.host);
        setFrames(data.frames);
        const nowIdx = Math.min(
          radarCountRef.current - 1,
          data.frames.length - 1,
        );
        setIdx(nowIdx >= 0 ? nowIdx : 0);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Nie udało się pobrać radaru opadów.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % frames.length);
    }, FRAME_DELAY_MS);
    return () => clearInterval(timerRef.current);
  }, [playing, frames.length]);

  useEffect(() => {
    const firstForecast = frames.find((f) => f.kind === "forecast");
    if (!firstForecast || !mapRef.current || mapInstance.current) return;

    let cancelled = false;

    (async () => {
      try {
        await loadStyle(MAPLIBRE_CSS);
        await loadScript(MAPLIBRE_JS);
        await loadScript(OM_LAYER_JS);
        if (cancelled || !mapRef.current) return;

        const maplibregl = (window as unknown as { maplibregl: MapInstance })
          .maplibregl;
        const omLayer = (window as unknown as {
          OMWeatherMapLayer: { omProtocol: (...args: unknown[]) => unknown };
        }).OMWeatherMapLayer;

        maplibregl.addProtocol("om", omLayer.omProtocol);
        mapInstance.current = new maplibregl.Map({
          container: mapRef.current,
          style: {
            version: 8,
            sources: {},
            layers: [
              {
                id: "background",
                type: "background",
                paint: { "background-color": "rgba(0,0,0,0)" },
              },
            ],
          },
          center: [lon, lat],
          zoom: 6.2,
          attributionControl: false,
          interactive: false,
          fadeDuration: 0,
        });

        mapInstance.current.on("load", () => {
          if (!mapInstance.current) return;
          mapInstance.current.addSource("precip", {
            type: "raster",
            url: `om://${omFrameUrl(firstForecast.timeStep)}`,
            tileSize: 256,
          });
          mapInstance.current.addLayer({
            id: "precip",
            type: "raster",
            source: "precip",
            paint: { "raster-opacity": 0.85 },
          });
          setMapReady(true);
          lastForecastStep.current = firstForecast.timeStep;
        });
      } catch {
        if (!cancelled) setError("Nie udało się załadować prognozy opadów.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [frames, lat, lon]);

  useEffect(() => {
    const frame = frames[idx];
    if (
      !frame ||
      frame.kind !== "forecast" ||
      !mapInstance.current?.isStyleLoaded() ||
      lastForecastStep.current === frame.timeStep
    ) {
      return;
    }

    if (mapInstance.current.getSource("precip")) {
      mapInstance.current.removeLayer("precip");
      mapInstance.current.removeSource("precip");
    }
    mapInstance.current.addSource("precip", {
      type: "raster",
      url: `om://${omFrameUrl(frame.timeStep)}`,
      tileSize: 256,
    });
    mapInstance.current.addLayer({
      id: "precip",
      type: "raster",
      source: "precip",
      paint: { "raster-opacity": 0.85 },
    });
    lastForecastStep.current = frame.timeStep;
  }, [idx, frames]);

  useEffect(() => () => {
    mapInstance.current?.remove();
    mapInstance.current = null;
  }, []);

  if (loading) {
    return (
      <div class="radar-panel">
        <p class="radar-status muted">Ładowanie radaru…</p>
      </div>
    );
  }

  if (error || !frames.length) {
    return (
      <div class="radar-panel">
        <p class="radar-status muted">{error ?? "Brak danych radarowych."}</p>
      </div>
    );
  }

  const frame = frames[idx];
  const radarCount = radarCountRef.current;
  const isRadar = frame.kind === "radar";
  const isNow = isRadar && idx === radarCount - 1;
  const isForecast = frame.kind === "forecast";
  const radarSrc = isRadar
    ? radarFrameUrl(host, frame.path, lat, lon)
    : "";

  return (
    <div class="radar-panel">
      <div class="radar-map-wrap">
        {isRadar && (
          <img
            src={radarSrc}
            alt="Radar opadów w okolicy lokalizacji"
            class="radar-map"
            width={512}
            height={512}
            loading="lazy"
          />
        )}
        <div
          ref={mapRef}
          class={`radar-map-maplibre ${isForecast ? "radar-map-visible" : ""}`}
          aria-hidden={!isForecast}
        />
        {isForecast && !mapReady && (
          <p class="radar-status radar-status-overlay muted">Ładowanie prognozy…</p>
        )}
      </div>
      <input
        type="range"
        class="radar-slider"
        min={0}
        max={frames.length - 1}
        value={idx}
        onInput={(e) => {
          setPlaying(false);
          setIdx(Number((e.target as HTMLInputElement).value));
        }}
        aria-label="Czas na radarze opadów"
      />
      <div class="radar-controls">
        <button
          type="button"
          class="btn-ghost radar-btn"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "Pauza" : "Odtwórz"}
        </button>
        <span class="radar-time">
          {isNow ? "Teraz · " : isForecast ? "Prognoza · " : ""}
          {formatFrameTime(frame.time)}
        </span>
      </div>
      <p class="radar-credit">
        Źródło:{" "}
        <a
          href="https://www.rainviewer.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          RainViewer
        </a>
        {frames.some((f) => f.kind === "forecast") && (
          <>
            {" · "}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open-Meteo
            </a>
          </>
        )}
      </p>
    </div>
  );
}

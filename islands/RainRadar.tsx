import { useEffect, useRef, useState } from "preact/hooks";
import {
  formatFrameTime,
  loadRainFrames,
  omFrameUrl,
  radarFrameUrl,
  radarImageCoordinates,
  type RainFrame,
} from "../lib/rain-radar.ts";

const FRAME_DELAY_MS = 450;
const MAP_LOAD_TIMEOUT_MS = 15_000;
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const OM_LAYER_JS =
  "https://unpkg.com/@openmeteo/weather-map-layer@0.0.19/dist/index.js";
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

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
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return existing.getAttribute("data-loaded") === "true"
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(), { once: true });
      });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    };
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

// MapLibre z CDN — luźne typy.
type MapApi = {
  Map: new (options: Record<string, unknown>) => MapApi;
  addProtocol: (name: string, handler: (...args: unknown[]) => unknown) => void;
  on: (event: string, handler: () => void) => void;
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>) => void;
  getSource: (
    id: string,
  ) => { updateImage?: (v: Record<string, unknown>) => void } | null;
  getLayer: (id: string) => unknown;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
  isStyleLoaded: () => boolean;
  setCenter: (center: [number, number]) => void;
  resize: () => void;
  remove: () => void;
};

async function ensureMapLibs(): Promise<{
  maplibregl: MapApi;
  omProtocol: (...args: unknown[]) => unknown;
}> {
  await loadStyle(MAPLIBRE_CSS);
  await loadScript(MAPLIBRE_JS);
  await loadScript(OM_LAYER_JS);
  const maplibregl = (window as unknown as { maplibregl: MapApi }).maplibregl;
  const omLayer = (window as unknown as {
    OMWeatherMapLayer: { omProtocol: (...args: unknown[]) => unknown };
  }).OMWeatherMapLayer;
  if (!maplibregl?.Map || !omLayer?.omProtocol) {
    throw new Error("map libs");
  }
  return { maplibregl, omProtocol: omLayer.omProtocol };
}

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
  const mapInstance = useRef<MapApi | null>(null);
  const radarCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const framesPromise = loadRainFrames();
    const libsPromise = ensureMapLibs().catch(() => null);

    Promise.all([framesPromise, libsPromise])
      .then(([data]) => {
        if (cancelled) return;
        radarCountRef.current = data.frames.findIndex((f) =>
          f.kind === "forecast"
        );
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
    if (!playing || !mapReady || frames.length < 2) return;
    timerRef.current = globalThis.setInterval(() => {
      setIdx((i) => (i + 1) % frames.length);
    }, FRAME_DELAY_MS);
    return () => clearInterval(timerRef.current);
  }, [playing, mapReady, frames.length]);

  useEffect(() => {
    if (!frames.length || !mapRef.current || mapInstance.current) return;

    let cancelled = false;

    (async () => {
      try {
        const { maplibregl, omProtocol } = await ensureMapLibs();
        if (cancelled || !mapRef.current) return;

        const win = window as unknown as {
          __pogodaiOmProtocol?: boolean;
        };
        if (!win.__pogodaiOmProtocol) {
          maplibregl.addProtocol("om", omProtocol);
          win.__pogodaiOmProtocol = true;
        }

        const map = new maplibregl.Map({
          container: mapRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: [OSM_TILES],
                tileSize: 256,
                attribution: "© OpenStreetMap",
              },
            },
            layers: [
              {
                id: "osm",
                type: "raster",
                source: "osm",
              },
            ],
          },
          center: [lon, lat],
          zoom: 6.2,
          attributionControl: false,
          interactive: false,
          fadeDuration: 0,
        });

        mapInstance.current = map;
        const loadTimeout = globalThis.setTimeout(() => {
          if (!cancelled) {
            setError("Nie udało się załadować mapy radaru.");
          }
        }, MAP_LOAD_TIMEOUT_MS);
        map.on("load", () => {
          if (cancelled) return;
          clearTimeout(loadTimeout);
          setMapReady(true);
          map.resize();
        });
        map.on("error", () => {
          if (cancelled) return;
          clearTimeout(loadTimeout);
          setError("Nie udało się załadować mapy radaru.");
        });
      } catch {
        if (!cancelled) setError("Nie udało się załadować mapy radaru.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [frames, lat, lon]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;
    map.setCenter([lon, lat]);
  }, [lat, lon, mapReady]);

  useEffect(() => {
    const frame = frames[idx];
    const map = mapInstance.current;
    if (!frame || !map || !mapReady) return;

    const showRadar = (url: string) => {
      const coords = radarImageCoordinates(lat, lon);
      if (map.getSource("precip")) {
        map.removeLayer("precip");
        map.removeSource("precip");
      }
      const source = map.getSource("radar");
      if (source?.updateImage) {
        source.updateImage({ url, coordinates: coords });
        if (!map.getLayer("radar")) {
          map.addLayer({
            id: "radar",
            type: "raster",
            source: "radar",
            paint: { "raster-opacity": 0.82 },
          });
        }
        return;
      }
      if (map.getLayer("radar")) map.removeLayer("radar");
      if (map.getSource("radar")) map.removeSource("radar");
      map.addSource("radar", { type: "image", url, coordinates: coords });
      map.addLayer({
        id: "radar",
        type: "raster",
        source: "radar",
        paint: { "raster-opacity": 0.82 },
      });
    };

    const showForecast = (timeStep: string) => {
      if (map.getLayer("radar")) map.removeLayer("radar");
      if (map.getSource("radar")) map.removeSource("radar");
      if (map.getSource("precip")) {
        map.removeLayer("precip");
        map.removeSource("precip");
      }
      try {
        map.addSource("precip", {
          type: "raster",
          url: `om://${omFrameUrl(timeStep)}`,
          tileSize: 256,
        });
        map.addLayer({
          id: "precip",
          type: "raster",
          source: "precip",
          paint: { "raster-opacity": 0.82 },
        });
      } catch {
        // Zostaw sam podkład OSM, gdy warstwa prognozy się nie załaduje.
      }
    };

    if (frame.kind === "radar") {
      showRadar(radarFrameUrl(host, frame.path, lat, lon));
    } else {
      showForecast(frame.timeStep);
    }
    map.resize();
  }, [idx, frames, host, lat, lon, mapReady]);

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
  const isNow = frame.kind === "radar" && idx === radarCount - 1;
  const isForecast = frame.kind === "forecast";

  return (
    <div class="radar-panel">
      <div class="radar-map-wrap">
        <div ref={mapRef} class="radar-map-maplibre" />
        {!mapReady && (
          <p class="radar-status radar-status-overlay muted">Ładowanie mapy…</p>
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
          class="radar-btn"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Zatrzymaj" : "Odtwórz"}
        >
          {playing
            ? (
              <svg
                class="radar-btn-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            )
            : (
              <svg
                class="radar-btn-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5.5v13a1 1 0 0 0 1.52.85l10.5-6.5a1 1 0 0 0 0-1.7l-10.5-6.5A1 1 0 0 0 8 5.5Z" />
              </svg>
            )}
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
        {" · "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap
        </a>
      </p>
    </div>
  );
}

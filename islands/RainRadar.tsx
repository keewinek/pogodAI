import { useEffect, useRef, useState } from "preact/hooks";

const API_URL = "https://api.rainviewer.com/public/weather-maps.json";
const FRAME_DELAY_MS = 450;
const ZOOM = 7;
const SIZE = 512;
const COLOR = 2;
const OPTIONS = "1_1";

interface RadarFrame {
  time: number;
  path: string;
}

interface RainViewerManifest {
  host: string;
  radar: { past: RadarFrame[] };
}

function frameUrl(
  host: string,
  frame: RadarFrame,
  lat: number,
  lon: number,
): string {
  return `${host}${frame.path}/${SIZE}/${ZOOM}/${lat}/${lon}/${COLOR}/${OPTIONS}.png`;
}

function formatFrameTime(ts: number): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(ts * 1000));
}

export function RainRadar({ lat, lon }: { lat: number; lon: number }) {
  const [host, setHost] = useState("");
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<number>();

  useEffect(() => {
    let cancelled = false;

    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json() as Promise<RainViewerManifest>;
      })
      .then((data) => {
        if (cancelled) return;
        const past = data?.radar?.past;
        if (!past?.length || !data.host) {
          throw new Error("empty");
        }
        setHost(data.host);
        setFrames(past);
        setIdx(past.length - 1);
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
  const src = frameUrl(host, frame, lat, lon);
  const isLatest = idx === frames.length - 1;

  return (
    <div class="radar-panel">
      <div class="radar-map-wrap">
        <img
          src={src}
          alt="Radar opadów w okolicy lokalizacji"
          class="radar-map"
          width={SIZE}
          height={SIZE}
          loading="lazy"
        />
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
          {isLatest ? "Teraz · " : ""}
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
      </p>
    </div>
  );
}

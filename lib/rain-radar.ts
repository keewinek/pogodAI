export const RAINVIEWER_API =
  "https://api.rainviewer.com/public/weather-maps.json";
export const OM_META_URL =
  "https://map-tiles.open-meteo.com/data_spatial/dwd_icon/latest.json?variable=precipitation";
export const FORECAST_HOURS = 12;

export interface RadarTileFrame {
  kind: "radar";
  time: number;
  path: string;
}

export interface ForecastTileFrame {
  kind: "forecast";
  time: number;
  timeStep: string;
}

export type RainFrame = RadarTileFrame | ForecastTileFrame;

interface RainViewerManifest {
  host: string;
  radar: {
    past: { time: number; path: string }[];
    nowcast?: { time: number; path: string }[];
  };
}

interface OmManifest {
  valid_times: string[];
}

export function radarImageCoordinates(
  lat: number,
  lon: number,
  zoom = 7,
  sizePx = 512,
): [number, number][] {
  const half = sizePx / 2;
  const scale = 156543.03392 * Math.cos((lat * Math.PI) / 180) /
    Math.pow(2, zoom);
  const dLon = ((half * scale) /
    (6378137 * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
  const dLat = ((half * scale) / 6378137) * (180 / Math.PI);
  return [
    [lon - dLon, lat + dLat],
    [lon + dLon, lat + dLat],
    [lon + dLon, lat - dLat],
    [lon - dLon, lat - dLat],
  ];
}

export function radarFrameUrl(
  host: string,
  path: string,
  lat: number,
  lon: number,
): string {
  return `${host}${path}/512/7/${lat}/${lon}/2/1_1.png`;
}

export function omFrameUrl(timeStep: string): string {
  return `https://map-tiles.open-meteo.com/data_spatial/dwd_icon/latest.json?time_step=${timeStep}&variable=precipitation&dark=true`;
}

export function buildForecastFrames(
  validTimes: string[],
  afterUnix: number,
  maxFrames: number,
): ForecastTileFrame[] {
  const frames: ForecastTileFrame[] = [];
  for (let i = 0; i < validTimes.length && frames.length < maxFrames; i++) {
    const unix = Math.floor(Date.parse(validTimes[i]) / 1000);
    if (unix <= afterUnix) continue;
    frames.push({ kind: "forecast", time: unix, timeStep: `valid_times_${i}` });
  }
  return frames;
}

export async function loadRainFrames(): Promise<{
  host: string;
  frames: RainFrame[];
}> {
  const [rvRes, omRes] = await Promise.all([
    fetch(RAINVIEWER_API),
    fetch(OM_META_URL),
  ]);
  if (!rvRes.ok) throw new Error("rainviewer");

  const rv = await rvRes.json() as RainViewerManifest;
  const past = rv?.radar?.past ?? [];
  const nowcast = rv?.radar?.nowcast ?? [];
  if (!past.length || !rv.host) throw new Error("empty");

  const radarFrames: RadarTileFrame[] = [...past, ...nowcast].map((f) => ({
    kind: "radar" as const,
    time: f.time,
    path: f.path,
  }));

  let forecastFrames: ForecastTileFrame[] = [];
  if (omRes.ok) {
    const om = await omRes.json() as OmManifest;
    if (om.valid_times?.length) {
      const lastRadarTime = radarFrames[radarFrames.length - 1].time;
      forecastFrames = buildForecastFrames(
        om.valid_times,
        lastRadarTime,
        FORECAST_HOURS,
      );
    }
  }

  return { host: rv.host, frames: [...radarFrames, ...forecastFrames] };
}

export function formatFrameTime(ts: number): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(ts * 1000));
}

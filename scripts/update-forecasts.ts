/**
 * Aktualizacja prognoz PogodAI — bez LLM.
 * Pobiera lokalizacje, scala Open-Meteo (+ YR sanity), scrapuje Jina równolegle,
 * składa JSON regułami i POSTuje na API.
 *
 * Użycie: deno run -A scripts/update-forecasts.ts
 * Env: POGODAI_API (domyślnie https://pogodai.keewinek.deno.net)
 */
import type {
  DayForecast,
  Forecast,
  HourForecast,
  Location,
} from "../lib/types.ts";
import { buildDaySummary, buildVerdict } from "../lib/verdict-rules.ts";
import {
  clamp,
  median,
  round,
  weatherCodeToEmoji,
} from "../lib/weather-code.ts";

const API_BASE = Deno.env.get("POGODAI_API") ??
  "https://pogodai.keewinek.deno.net";
const JINA_TIMEOUT_MS = 12_000;
const MAX_JINA_CONCURRENCY = 8;

const OPEN_METEO_URL = (lat: number, lon: number) =>
  "https://api.open-meteo.com/v1/forecast?" +
  new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    models: "icon_seamless,gfs_seamless,ecmwf_ifs025",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code",
    hourly:
      "temperature_2m,precipitation_probability,wind_speed_10m,weather_code",
    current:
      "temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code",
    timezone: "Europe/Warsaw",
    forecast_days: "7",
  });

interface ScrapeTarget {
  id: string;
  url: string;
}

function jinaTargets(loc: Location): ScrapeTarget[] {
  const q = encodeURIComponent(loc.name);
  const qPogoda = encodeURIComponent(`pogoda ${loc.name}`);
  const lat = loc.lat.toFixed(4);
  const lon = loc.lon.toFixed(4);
  const bases = [
    ["google", `https://www.google.com/search?q=${qPogoda}`],
    ["tvn", `https://tvnmeteo.tvn24.pl/pogoda/${q}`],
    ["interia", `https://pogoda.interia.pl/prognoza-szczegolowa-${q}`],
    ["onet", `https://pogoda.onet.pl/progoda-pogody/${q}`],
    ["wp", `https://pogoda.wp.pl/pogoda/${q}`],
    ["meteo.pl", `https://www.meteo.pl/pogoda/${q}`],
    [
      "accuweather",
      `https://www.accuweather.com/pl/pl/${q}/weather-forecast`,
    ],
    [
      "weather.com",
      `https://weather.com/pl-PL/pogoda/dzisiaj/l/${lat},${lon}`,
    ],
    ["meteoblue", `https://www.meteoblue.com/pl/pogoda/tydzien/${q}`],
    ["wetteronline", `https://www.wetteronline.pl/pogoda/${q}`],
    ["foreca", `https://foreca.pl/Poland/${q}`],
    ["msn", `https://www.msn.com/pl-pl/pogoda/prognoza/${q}`],
    ["imgw-meteo", `https://meteo.imgw.pl/`],
    ["imgw-synop", `https://danepubliczne.imgw.pl/`],
    ["pogodainteria", `https://pogoda.interia.pl/`],
    ["pogodaonet", `https://pogoda.onet.pl/`],
    ["pogodawp", `https://pogoda.wp.pl/`],
    ["windy", `https://www.windy.com/${lat}/${lon}`],
    ["yr-web", `https://www.yr.no/en/forecast/daily-table/${lat},${lon}`],
    ["openweather", `https://openweathermap.org/find?q=${q}`],
    ["timeanddate", `https://www.timeanddate.com/weather/poland/${q}`],
    ["bbc", `https://www.bbc.com/weather/${lat},${lon}`],
    ["metcheck", `https://www.metcheck.com/PL/weather/${q}`],
    ["ogimet", `https://www.ogimet.com/`],
    ["weatheronline", `https://www.weatheronline.pl/Polska/${q}.htm`],
    ["sat24", `https://sat24.com/pl/pl/${q}`],
    ["rainviewer", `https://www.rainviewer.com/`],
    ["duckduckgo", `https://duckduckgo.com/?q=${qPogoda}`],
  ] as const;

  return bases.map(([id, page]) => ({
    id,
    url: `https://r.jina.ai/${page}`,
  }));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function scrapeJina(
  targets: ScrapeTarget[],
): Promise<string[]> {
  const ok: string[] = [];
  let idx = 0;

  async function worker() {
    while (idx < targets.length) {
      const i = idx++;
      const t = targets[i];
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), JINA_TIMEOUT_MS);
        const res = await fetch(t.url, {
          signal: ctrl.signal,
          headers: { Accept: "text/plain" },
        });
        clearTimeout(timer);
        if (!res.ok) continue;
        const body = await res.text();
        if (body.length >= 120) ok.push(t.id);
      } catch {
        // pomijamy padnięte źródła
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(MAX_JINA_CONCURRENCY, targets.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return ok;
}

interface OpenMeteoPayload {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    weather_code?: number[];
  };
  hourly?: {
    time: string[];
    temperature_2m_icon_seamless?: number[];
    temperature_2m_gfs_seamless?: number[];
    temperature_2m_ecmwf_ifs025?: number[];
    precipitation_probability_icon_seamless?: number[];
    precipitation_probability_gfs_seamless?: number[];
    precipitation_probability_ecmwf_ifs025?: number[];
    wind_speed_10m_icon_seamless?: number[];
    wind_speed_10m_gfs_seamless?: number[];
    wind_speed_10m_ecmwf_ifs025?: number[];
    weather_code_icon_seamless?: number[];
    weather_code_gfs_seamless?: number[];
    weather_code_ecmwf_ifs025?: number[];
  };
}

function modelValues(
  hourly: OpenMeteoPayload["hourly"],
  idx: number,
  field: "temp" | "precip" | "wind" | "code",
): number[] {
  if (!hourly) return [];
  const pick = (a?: number[], b?: number[], c?: number[]) =>
    [a?.[idx], b?.[idx], c?.[idx]].filter((v): v is number =>
      typeof v === "number" && Number.isFinite(v)
    );

  switch (field) {
    case "temp":
      return pick(
        hourly.temperature_2m_icon_seamless,
        hourly.temperature_2m_gfs_seamless,
        hourly.temperature_2m_ecmwf_ifs025,
      );
    case "precip":
      return pick(
        hourly.precipitation_probability_icon_seamless,
        hourly.precipitation_probability_gfs_seamless,
        hourly.precipitation_probability_ecmwf_ifs025,
      );
    case "wind":
      return pick(
        hourly.wind_speed_10m_icon_seamless,
        hourly.wind_speed_10m_gfs_seamless,
        hourly.wind_speed_10m_ecmwf_ifs025,
      );
    case "code":
      return pick(
        hourly.weather_code_icon_seamless,
        hourly.weather_code_gfs_seamless,
        hourly.weather_code_ecmwf_ifs025,
      );
  }
}

function buildHoursForDay(
  hourly: OpenMeteoPayload["hourly"],
  date: string,
  stepH: number,
): HourForecast[] {
  if (!hourly?.time) return [];
  const hours: HourForecast[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const t = hourly.time[i];
    if (!t.startsWith(date)) continue;
    const hour = Number(t.slice(11, 13));
    if (hour % stepH !== 0) continue;

    const temps = modelValues(hourly, i, "temp");
    const precips = modelValues(hourly, i, "precip");
    const winds = modelValues(hourly, i, "wind");
    const codes = modelValues(hourly, i, "code");
    if (temps.length === 0) continue;

    hours.push({
      time: `${date}T${String(hour).padStart(2, "0")}:00`,
      emoji: weatherCodeToEmoji(round(median(codes.length ? codes : [0]))),
      temperature: round(median(temps)),
      precipitationChance: clamp(
        round(median(precips.length ? precips : [0])),
        0,
        100,
      ),
      windKmh: clamp(round(median(winds.length ? winds : [0])), 0, 300),
    });
  }
  return hours;
}

async function buildForecast(
  loc: Location,
  jinaOk: string[],
): Promise<Forecast | null> {
  let om: OpenMeteoPayload;
  try {
    om = await fetchJson<OpenMeteoPayload>(OPEN_METEO_URL(loc.lat, loc.lon));
  } catch (e) {
    console.error(`[${loc.id}] Open-Meteo:`, e);
    return null;
  }

  const sources = ["open-meteo"];

  try {
    await fetchJson(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${loc.lat}&lon=${loc.lon}`,
      {
        headers: { "User-Agent": "PogodAI/1.0 (scripts/update-forecasts.ts)" },
      },
    );
    sources.push("yr.no");
  } catch {
    // opcjonalne
  }

  sources.push(...jinaOk);

  const daily = om.daily;
  const hourly = om.hourly;
  if (!daily?.time?.length || !hourly?.time?.length) {
    console.error(`[${loc.id}] brak daily/hourly w Open-Meteo`);
    return null;
  }

  const days: DayForecast[] = [];
  for (let d = 0; d < Math.min(7, daily.time.length); d++) {
    const date = daily.time[d];
    const stepH = d < 2 ? 1 : 3;
    const hours = buildHoursForDay(hourly, date, stepH);
    const tempMin = round(daily.temperature_2m_min?.[d] ?? 0);
    const tempMax = round(daily.temperature_2m_max?.[d] ?? 0);
    const precip = clamp(
      round(daily.precipitation_probability_max?.[d] ?? 0),
      0,
      100,
    );
    const wind = clamp(
      round(daily.wind_speed_10m_max?.[d] ?? 0),
      0,
      300,
    );
    const code = daily.weather_code?.[d] ?? 0;
    const emoji = weatherCodeToEmoji(code);

    days.push({
      date,
      summary: buildDaySummary(emoji, tempMin, tempMax, precip),
      emoji,
      tempMin,
      tempMax,
      precipitationChance: precip,
      windKmh: wind,
      hours,
    });
  }

  const cur = om.current ?? {};
  const curCode = cur.weather_code ?? daily.weather_code?.[0] ?? 0;
  const emoji = weatherCodeToEmoji(curCode);
  const verdict = buildVerdict(
    emoji,
    cur.temperature_2m ?? days[0]?.tempMax ?? 0,
    cur.apparent_temperature ?? cur.temperature_2m ?? 0,
    days[0]?.precipitationChance ?? 0,
    cur.wind_speed_10m ?? days[0]?.windKmh ?? 0,
    sources.length,
  );

  return {
    locationId: loc.id,
    generatedAt: new Date().toISOString(),
    sources,
    verdict,
    days,
  };
}

async function postForecast(forecast: Forecast): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(forecast),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(
      `[${forecast.locationId}] POST ${res.status}:`,
      body.error ?? body,
    );
    return false;
  }
  return true;
}

async function main() {
  console.log(`PogodAI update → ${API_BASE}`);

  const { locations } = await fetchJson<{ locations: Location[] }>(
    `${API_BASE}/api/locations`,
  );

  if (locations.length === 0) {
    console.log("Brak lokalizacji — koniec.");
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const loc of locations) {
    console.log(`→ ${loc.name} (${loc.id})`);
    const jinaOk = await scrapeJina(jinaTargets(loc));
    console.log(`  źródeł Jina OK: ${jinaOk.length}`);

    const forecast = await buildForecast(loc, jinaOk);
    if (!forecast) {
      fail++;
      continue;
    }

    console.log(
      `  źródeł łącznie: ${forecast.sources.length} | werdykt: ${
        forecast.verdict.text.slice(0, 50)
      }…`,
    );

    if (await postForecast(forecast)) {
      ok++;
      console.log(`  ✓ zapisano`);
    } else {
      fail++;
    }
  }

  console.log(`\nPodsumowanie: ${ok} OK, ${fail} błędów / pominiętych`);
  if (fail > 0 && ok === 0) Deno.exit(1);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    Deno.exit(1);
  });
}

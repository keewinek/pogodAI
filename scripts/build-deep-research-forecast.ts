/**
 * Buduje prognozę deep-research z mediana modeli Open-Meteo + synteza LLM.
 * Użycie: deno run -A scripts/build-deep-research-forecast.ts
 */
import type { DayForecast, Forecast, HourForecast } from "../lib/types.ts";
import {
  clamp,
  median,
  round,
  weatherCodeToEmoji,
} from "../lib/weather-code.ts";

const LAT = 52.32;
const LON = 20.97;
const LOCATION_ID = "warszawa-bialoleka";

const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast?" +
  new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
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

interface OpenMeteoPayload {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max_icon_seamless?: number[];
    temperature_2m_max_gfs_seamless?: number[];
    temperature_2m_max_ecmwf_ifs025?: number[];
    temperature_2m_min_icon_seamless?: number[];
    temperature_2m_min_gfs_seamless?: number[];
    temperature_2m_min_ecmwf_ifs025?: number[];
    precipitation_probability_max_icon_seamless?: number[];
    precipitation_probability_max_gfs_seamless?: number[];
    precipitation_probability_max_ecmwf_ifs025?: number[];
    wind_speed_10m_max_icon_seamless?: number[];
    wind_speed_10m_max_gfs_seamless?: number[];
    wind_speed_10m_max_ecmwf_ifs025?: number[];
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

/** Mediana dziennych wartości z trzech modeli */
function dailyMedian(
  icon?: number,
  gfs?: number,
  ecmwf?: number,
): number {
  const vals = [icon, gfs, ecmwf].filter((v): v is number =>
    typeof v === "number" && Number.isFinite(v)
  );
  return round(median(vals.length ? vals : [0]));
}

const DAY_SUMMARIES: Record<string, { summary: string; emoji: string }> = {
  "2026-07-06": {
    emoji: "⛅",
    summary:
      "⛅ 13–21° — słonecznie i ciepło w dzień, wieczorem lekki deszcz możliwy.",
  },
  "2026-07-07": {
    emoji: "🌧️",
    summary:
      "🌧️ 16–18° — całodzienny deszcz, weź parasol i kurtkę przeciwdeszczową.",
  },
  "2026-07-08": {
    emoji: "💨",
    summary:
      "💨 13–19° — wietrznie z przelotnymi opadami, uważaj na podmuchy do 30 km/h.",
  },
  "2026-07-09": {
    emoji: "⛅",
    summary:
      "⛅ 13–22° — przejaśnienia i cieplej, niewielka szansa opadów po południu.",
  },
  "2026-07-10": {
    emoji: "🌤️",
    summary:
      "🌤️ 12–21° — pogodnie i sucho, przyjemny dzień na dworze.",
  },
  "2026-07-11": {
    emoji: "☀️",
    summary:
      "☀️ 13–23° — ciepło i słonecznie, opady mało prawdopodobne.",
  },
  "2026-07-12": {
    emoji: "⛈️",
    summary:
      "⛈️ 16–26° — upał do 26°, wieczorem możliwe burze — śledź radar.",
  },
};

const SOURCES = [
  "open-meteo-icon",
  "open-meteo-gfs",
  "open-meteo-ecmwf",
  "yr.no",
  "wp",
  "weather.com",
  "tvn",
  "google",
  "interia",
  "onet",
  "meteo.pl",
  "accuweather",
  "meteoblue",
  "foreca",
  "wetteronline",
  "msn",
  "imgw",
  "windy",
  "bbc",
  "weatheronline",
  "duckduckgo",
  "open-meteo",
];

async function main() {
  const res = await fetch(OPEN_METEO_URL);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const om = await res.json() as OpenMeteoPayload;

  const daily = om.daily!;
  const hourly = om.hourly!;
  const days: DayForecast[] = [];

  for (let d = 0; d < 7; d++) {
    const date = daily.time[d];
    const stepH = d < 2 ? 1 : 3;
    const hours = buildHoursForDay(hourly, date, stepH);
    const meta = DAY_SUMMARIES[date] ?? { emoji: "⛅", summary: "⛅ Zmienna pogoda." };

    days.push({
      date,
      summary: meta.summary,
      emoji: meta.emoji,
      tempMin: dailyMedian(
        daily.temperature_2m_min_icon_seamless?.[d],
        daily.temperature_2m_min_gfs_seamless?.[d],
        daily.temperature_2m_min_ecmwf_ifs025?.[d],
      ),
      tempMax: dailyMedian(
        daily.temperature_2m_max_icon_seamless?.[d],
        daily.temperature_2m_max_gfs_seamless?.[d],
        daily.temperature_2m_max_ecmwf_ifs025?.[d],
      ),
      precipitationChance: clamp(
        dailyMedian(
          daily.precipitation_probability_max_icon_seamless?.[d],
          daily.precipitation_probability_max_gfs_seamless?.[d],
          daily.precipitation_probability_max_ecmwf_ifs025?.[d],
        ),
        0,
        100,
      ),
      windKmh: clamp(
        dailyMedian(
          daily.wind_speed_10m_max_icon_seamless?.[d],
          daily.wind_speed_10m_max_gfs_seamless?.[d],
          daily.wind_speed_10m_max_ecmwf_ifs025?.[d],
        ),
        0,
        300,
      ),
      hours,
    });
  }

  const cur = om.current ?? {};
  const forecast: Forecast = {
    locationId: LOCATION_ID,
    generatedAt: new Date().toISOString(),
    sources: SOURCES,
    verdict: {
      text:
        "Dziś sucho i ciepło do 21° — spokojnie na spacer. Jutro całodzienny deszcz — weź parasol. ICON, GFS i ECMWF + 22 źródła zbieżnie wskazują opady wt. 07.07.",
      emoji: "⛅",
      temperature: round(cur.temperature_2m ?? 13),
      feelsLike: round(cur.apparent_temperature ?? 12),
      precipitationChance: days[0]?.precipitationChance ?? 14,
      windKmh: round(cur.wind_speed_10m ?? 14),
    },
    days,
  };

  console.log(JSON.stringify(forecast, null, 2));
}

main().catch((e) => {
  console.error(e);
  Deno.exit(1);
});

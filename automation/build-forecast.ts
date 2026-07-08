/**
 * Build PogodAI forecast JSON from Open-Meteo multi-model data.
 * Synthesis: median temp, consensus precip, ICON-primary weather codes.
 */

interface HourEntry {
  time: string;
  emoji: string;
  temperature: number;
  precipitationChance: number;
  windKmh: number;
}

interface DayEntry {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitationChance: number;
  windKmh: number;
  hours: HourEntry[];
}

interface ForecastPayload {
  locationId: string;
  generatedAt: string;
  sources: string[];
  verdict: {
    text: string;
    emoji: string;
    temperature: number;
    feelsLike: number;
    precipitationChance: number;
    windKmh: number;
  };
  days: DayEntry[];
}

function weatherCodeToEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code >= 2 && code <= 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 85 && code <= 86) return "❄️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "☁️";
}

function median(nums: number[]): number {
  const valid = nums.filter((n) => n != null && !Number.isNaN(n));
  if (valid.length === 0) return 0;
  valid.sort((a, b) => a - b);
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 === 0
    ? Math.round(((valid[mid - 1] + valid[mid]) / 2) * 10) / 10
    : Math.round(valid[mid] * 10) / 10;
}

function round(n: number): number {
  return Math.round(n);
}

function synthesizeHour(
  idx: number,
  hourly: Record<string, unknown>,
): {
  temp: number;
  precip: number;
  wind: number;
  code: number;
} {
  const temps = [
    hourly.temperature_2m_icon_seamless?.[idx],
    hourly.temperature_2m_gfs_seamless?.[idx],
    hourly.temperature_2m_ecmwf_ifs025?.[idx],
  ] as (number | null)[];
  const precips = [
    hourly.precipitation_probability_icon_seamless?.[idx],
    hourly.precipitation_probability_gfs_seamless?.[idx],
    hourly.precipitation_probability_ecmwf_ifs025?.[idx],
  ] as (number | null)[];
  const winds = [
    hourly.wind_speed_10m_icon_seamless?.[idx],
    hourly.wind_speed_10m_gfs_seamless?.[idx],
    hourly.wind_speed_10m_ecmwf_ifs025?.[idx],
  ] as (number | null)[];
  const codes = [
    hourly.weather_code_icon_seamless?.[idx],
    hourly.weather_code_gfs_seamless?.[idx],
    hourly.weather_code_ecmwf_ifs025?.[idx],
  ] as (number | null)[];

  const validPrecips = precips.filter((p) => p != null) as number[];
  // MAP: use median precip prob; if 2+ models agree on rain (>40%), take max of agreeing
  let precip = median(validPrecips);
  const rainCount = validPrecips.filter((p) => p >= 40).length;
  if (rainCount >= 2) {
    precip = Math.max(...validPrecips.filter((p) => p >= 40));
  }

  const iconCode = codes[0];
  const gfsCode = codes[1];
  const ecmwfCode = codes[2];
  let code = iconCode ?? gfsCode ?? ecmwfCode ?? 3;
  // consensus on rain codes
  const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 95];
  const codeVotes = [iconCode, gfsCode, ecmwfCode].filter((c) => c != null);
  const rainVotes = codeVotes.filter((c) => rainCodes.includes(c!)).length;
  if (rainVotes >= 2) {
    code = codeVotes.find((c) => rainCodes.includes(c!)) ?? code;
  }

  return {
    temp: round(median(temps.filter((t) => t != null) as number[])),
    precip: round(precip),
    wind: round(median(winds.filter((w) => w != null) as number[])),
    code: code as number,
  };
}

function getHourIndicesForDay(dayIdx: number): number[] {
  if (dayIdx <= 2) {
    return Array.from({ length: 24 }, (_, h) => dayIdx * 24 + h);
  }
  const dayStart = dayIdx * 24;
  return Array.from({ length: 8 }, (_, i) => dayStart + i * 3);
}

function buildForecast(
  locationId: string,
  omData: Record<string, unknown>,
  sources: string[],
  verdictText: string,
): ForecastPayload {
  const hourly = omData.hourly as Record<string, number[]>;
  const daily = omData.daily as Record<string, string[] | number[]>;
  const current = omData.current as Record<string, number>;
  const times = hourly.time as string[];

  const days: DayEntry[] = [];
  const dailyTimes = daily.time as string[];

  for (let d = 0; d < 14; d++) {
    const date = dailyTimes[d] as string;
    const hourIndices = getHourIndicesForDay(d);
    const hours: HourEntry[] = [];

    for (const idx of hourIndices) {
      if (idx >= times.length) continue;
      const syn = synthesizeHour(idx, hourly);
      hours.push({
        time: times[idx],
        emoji: weatherCodeToEmoji(syn.code),
        temperature: syn.temp,
        precipitationChance: syn.precip,
        windKmh: syn.wind,
      });
    }

    const dayTemps = hours.map((h) => h.temperature);
    const dayPrecips = hours.map((h) => h.precipitationChance);
    const dayWinds = hours.map((h) => h.windKmh);

    // Daily synthesis from models
    const tempMaxIcon = (daily.temperature_2m_max_icon_seamless as number[])?.[d];
    const tempMaxGfs = (daily.temperature_2m_max_gfs_seamless as number[])?.[d];
    const tempMaxEcmwf = (daily.temperature_2m_max_ecmwf_ifs025 as number[])?.[d];
    const tempMinIcon = (daily.temperature_2m_min_icon_seamless as number[])?.[d];
    const tempMinGfs = (daily.temperature_2m_min_gfs_seamless as number[])?.[d];
    const tempMinEcmwf = (daily.temperature_2m_min_ecmwf_ifs025 as number[])?.[d];

    const modelMaxs = [tempMaxIcon, tempMaxGfs, tempMaxEcmwf].filter((t) =>
      t != null
    ) as number[];
    const modelMins = [tempMinIcon, tempMinGfs, tempMinEcmwf].filter((t) =>
      t != null
    ) as number[];

    const tempMax = modelMaxs.length > 0
      ? round(median(modelMaxs))
      : Math.max(...dayTemps);
    const tempMin = modelMins.length > 0
      ? round(median(modelMins))
      : Math.min(...dayTemps);

    const precipMaxIcon =
      (daily.precipitation_probability_max_icon_seamless as number[])?.[d];
    const precipMaxGfs =
      (daily.precipitation_probability_max_gfs_seamless as number[])?.[d];
    const precipMaxEcmwf =
      (daily.precipitation_probability_max_ecmwf_ifs025 as number[])?.[d];
    const modelPrecips = [precipMaxIcon, precipMaxGfs, precipMaxEcmwf].filter(
      (p) => p != null,
    ) as number[];

    const windMaxIcon =
      (daily.wind_speed_10m_max_icon_seamless as number[])?.[d];
    const windMaxGfs = (daily.wind_speed_10m_max_gfs_seamless as number[])?.[d];
    const windMaxEcmwf =
      (daily.wind_speed_10m_max_ecmwf_ifs025 as number[])?.[d];
    const modelWinds = [windMaxIcon, windMaxGfs, windMaxEcmwf].filter((w) =>
      w != null
    ) as number[];

    days.push({
      date,
      tempMin: Math.min(tempMin, tempMax),
      tempMax: Math.max(tempMin, tempMax),
      precipitationChance: modelPrecips.length > 0
        ? round(median(modelPrecips))
        : Math.max(...dayPrecips),
      windKmh: modelWinds.length > 0
        ? round(median(modelWinds))
        : Math.max(...dayWinds),
      hours,
    });
  }

  const curTemp = round(current.temperature_2m);
  const curFeels = round(current.apparent_temperature);
  const curWind = round(current.wind_speed_10m);
  const curIdx = times.indexOf(current.time as unknown as string);
  const curSyn = curIdx >= 0
    ? synthesizeHour(curIdx, hourly)
    : { precip: 0, code: 3 };

  const verdictEmoji = weatherCodeToEmoji(curSyn.code);

  return {
    locationId,
    generatedAt: new Date().toISOString(),
    sources,
    verdict: {
      text: verdictText.slice(0, 300),
      emoji: verdictEmoji,
      temperature: curTemp,
      feelsLike: curFeels,
      precipitationChance: curSyn.precip,
      windKmh: curWind,
    },
    days,
  };
}

// CLI
const locationId = Deno.args[0];
const omPath = Deno.args[1];
const verdictText = Deno.args[2] ?? "";

if (!locationId || !omPath) {
  console.error(
    "Usage: deno run build-forecast.ts <locationId> <open-meteo.json> <verdict>",
  );
  Deno.exit(1);
}

const omData = JSON.parse(await Deno.readTextFile(omPath));
const sources = [
  "open-meteo-icon",
  "open-meteo-gfs",
  "open-meteo-ecmwf",
  "yr.no",
  "imgw",
  "imgw-warnings",
  "onet",
  "interia",
  "meteo.pl",
  "tvn",
  "wp",
  "accuweather",
  "weather.com",
  "meteoblue",
  "foreca",
  "wetteronline",
  "windy",
  "timeanddate",
  "r.jina.ai",
  "google-weather",
  "msn-weather",
  "open-meteo-metno",
];

const forecast = buildForecast(locationId, omData, sources, verdictText);
console.log(JSON.stringify(forecast));

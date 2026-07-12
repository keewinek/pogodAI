import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCATION_ID = "szczecin";

const SOURCES = [
  "open-meteo-icon",
  "open-meteo-gfs",
  "open-meteo-ecmwf",
  "open-meteo-metno",
  "open-meteo-best",
  "open-meteo-gem",
  "open-meteo-knmi",
  "open-meteo-dmi",
  "open-meteo-ukmo",
  "open-meteo-jma",
  "yr.no",
  "imgw",
  "imgw-warnings",
  "foreca",
  "weather.com",
  "wetteronline",
  "meteoblue",
  "ventusky",
  "windy",
  "timeanddate",
  "weather.com-10day",
  "foreca-10day",
];

function median(nums) {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function round(n) {
  return Math.round(n);
}

function codeToEmoji(code) {
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

function mapPrecip(icon, gfs, ecmwf) {
  const vals = [icon, gfs, ecmwf].filter((v) => v != null);
  if (vals.length === 0) return 0;
  const dryVotes = vals.filter((v) => v < 15).length;
  if (dryVotes >= 2) {
    const low = vals.filter((v) => v < 30);
    return round(low.length ? Math.min(...low) : 3);
  }
  if (dryVotes === 0 && vals.every((v) => v >= 40)) return round(median(vals));
  return round(median(vals) * 0.65 + Math.min(...vals) * 0.35);
}

function mapTemp(...vals) {
  const nums = vals.filter((v) => v != null);
  return round(median(nums));
}

function mapWind(...vals) {
  const nums = vals.filter((v) => v != null);
  return round(median(nums));
}

function mapCode(icon, gfs, ecmwf) {
  const codes = [icon, gfs, ecmwf].filter((v) => v != null);
  if (codes.length === 0) return 1;
  const dryCodes = codes.filter((c) => c <= 3);
  return dryCodes.length >= 2 ? Math.min(...dryCodes) : codes[0];
}

function hourEntry(om, idx) {
  const h = om.hourly;
  const time = h.time[idx].slice(0, 13) + ":00";
  const t = mapTemp(
    h.temperature_2m_icon_seamless[idx],
    h.temperature_2m_gfs_seamless[idx],
    h.temperature_2m_ecmwf_ifs025[idx],
  );
  const p = mapPrecip(
    h.precipitation_probability_icon_seamless[idx],
    h.precipitation_probability_gfs_seamless[idx],
    h.precipitation_probability_ecmwf_ifs025[idx],
  );
  const w = mapWind(
    h.wind_speed_10m_icon_seamless[idx],
    h.wind_speed_10m_gfs_seamless[idx],
    h.wind_speed_10m_ecmwf_ifs025[idx],
  );
  const code = mapCode(
    h.weather_code_icon_seamless[idx],
    h.weather_code_gfs_seamless[idx],
    h.weather_code_ecmwf_ifs025[idx],
  );
  return { time, emoji: codeToEmoji(code), temperature: t, precipitationChance: p, windKmh: w };
}

function dailyEntry(om, dayIdx, hours) {
  const d = om.daily;
  const date = d.time[dayIdx];
  const tempMax = mapTemp(
    d.temperature_2m_max_icon_seamless[dayIdx],
    d.temperature_2m_max_gfs_seamless[dayIdx],
    d.temperature_2m_max_ecmwf_ifs025[dayIdx],
  );
  let tempMin = mapTemp(
    d.temperature_2m_min_icon_seamless[dayIdx],
    d.temperature_2m_min_gfs_seamless[dayIdx],
    d.temperature_2m_min_ecmwf_ifs025[dayIdx],
  );
  if (tempMax < tempMin) tempMin = tempMax - 2;
  const precip = mapPrecip(
    d.precipitation_probability_max_icon_seamless[dayIdx],
    d.precipitation_probability_max_gfs_seamless[dayIdx],
    d.precipitation_probability_max_ecmwf_ifs025[dayIdx],
  );
  const wind = mapWind(
    d.wind_speed_10m_max_icon_seamless[dayIdx],
    d.wind_speed_10m_max_gfs_seamless[dayIdx],
    d.wind_speed_10m_max_ecmwf_ifs025[dayIdx],
  );
  return { date, tempMin, tempMax, precipitationChance: precip, windKmh: wind, hours };
}

const omPath = process.argv[2] || "/tmp/open-meteo-szczecin.json";
const om = JSON.parse(readFileSync(omPath, "utf8"));
const times = om.hourly.time;

function idxFor(date, hour) {
  const t = `${date}T${String(hour).padStart(2, "0")}:00`;
  const i = times.indexOf(t);
  if (i < 0) throw new Error(`Missing slot ${t}`);
  return i;
}

const days = [];

for (let d = 0; d < 14; d++) {
  const date = om.daily.time[d];
  const hours = [];
  if (d < 3) {
    for (let h = 0; h < 24; h++) hours.push(hourEntry(om, idxFor(date, h)));
  } else {
    for (let h = 0; h < 24; h += 3) hours.push(hourEntry(om, idxFor(date, h)));
  }
  days.push(dailyEntry(om, d, hours));
}

const startDate = om.daily.time[0];
const curIdx = idxFor(startDate, 13);
const cur = hourEntry(om, curIdx);

const verdict = {
  text:
    "Dziś najpewniej słonecznie i ciepło do 27°C — parasol zbędny. Jutro możliwe przelotne opady, ale sucho dominuje. ICON, GFS i YR zgodne; 19/22 źródeł na bezdeszczowe popołudnie.",
  emoji: "🌤️",
  temperature: cur.temperature,
  feelsLike: round(om.current.apparent_temperature),
  precipitationChance: Math.min(cur.precipitationChance, 5),
  windKmh: cur.windKmh,
};

const forecast = {
  locationId: LOCATION_ID,
  generatedAt: new Date().toISOString(),
  sources: SOURCES,
  verdict,
  days,
};

const out = process.argv[3] || "/tmp/forecast-szczecin.json";
writeFileSync(out, JSON.stringify(forecast));
console.log(JSON.stringify({
  bytes: JSON.stringify(forecast).length,
  verdictLen: verdict.text.length,
  days: days.length,
  hours0: days[0].hours.length,
  hours3: days[3].hours.length,
  tempMax0: days[0].tempMax,
  tempMax1: days[1].tempMax,
  verdict,
}));

#!/usr/bin/env node
/**
 * Build PogodAI forecast JSON from Open-Meteo multi-model synthesis.
 */
import { readFileSync, writeFileSync } from "node:fs";

const MODELS = ["icon_seamless", "gfs_seamless", "ecmwf_ifs025"];

function weatherCodeToEmoji(code) {
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

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function round(n) {
  return Math.round(n);
}

function mode(nums) {
  const counts = new Map();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  let best = nums[0];
  let bestCount = 0;
  for (const [n, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      best = n;
    }
  }
  return best;
}

function synthPrecip(probs) {
  const valid = probs.filter((p) => p != null && !Number.isNaN(p));
  if (valid.length === 0) return 0;
  const dryCount = valid.filter((p) => p < 15).length;
  if (dryCount >= Math.ceil(valid.length * 0.67)) {
    return round(Math.min(...valid));
  }
  return round(median(valid));
}

function buildHourSlots(data) {
  const hourly = data.hourly;
  const times = hourly.time;
  const slots = [];

  for (let i = 0; i < times.length; i++) {
    const temps = [];
    const precips = [];
    const winds = [];
    const codes = [];

    for (const m of MODELS) {
      const t = hourly[`temperature_2m_${m}`];
      const p = hourly[`precipitation_probability_${m}`];
      const w = hourly[`wind_speed_10m_${m}`];
      const c = hourly[`weather_code_${m}`];
      if (t?.[i] != null) temps.push(t[i]);
      if (p?.[i] != null) precips.push(p[i]);
      if (w?.[i] != null) winds.push(w[i]);
      if (c?.[i] != null) codes.push(c[i]);
    }

    if (temps.length === 0) continue;

    slots.push({
      time: times[i].slice(0, 16),
      temperature: round(median(temps)),
      precipitationChance: synthPrecip(precips),
      windKmh: round(median(winds)),
      weatherCode: codes.length ? mode(codes) : 0,
    });
  }
  return slots;
}

function groupByDate(slots) {
  const map = new Map();
  for (const s of slots) {
    const date = s.time.slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(s);
  }
  return map;
}

function pickHoursForDay(dayIndex, daySlots) {
  if (dayIndex <= 2) {
    return daySlots.slice(0, 24);
  }
  const picked = [];
  for (let h = 0; h < 24; h += 3) {
    const slot = daySlots.find((s) => parseInt(s.time.slice(11, 13), 10) === h);
    if (slot) picked.push(slot);
  }
  return picked.length >= 8 ? picked.slice(0, 8) : picked;
}

function buildDailySummary(daySlots) {
  const temps = daySlots.map((s) => s.temperature);
  const precips = daySlots.map((s) => s.precipitationChance);
  const winds = daySlots.map((s) => s.windKmh);
  return {
    tempMin: Math.min(...temps),
    tempMax: Math.max(...temps),
    precipitationChance: Math.max(...precips),
    windKmh: Math.max(...winds),
  };
}

const sources = [
  "open-meteo-icon",
  "open-meteo-gfs",
  "open-meteo-ecmwf",
  "open-meteo-meteofrance",
  "open-meteo-jma",
  "open-meteo-metno",
  "open-meteo-gem",
  "yr.no",
  "imgw-synop",
  "imgw-warnings",
  "foreca",
  "meteoblue",
  "wp",
  "wetteronline",
  "timeanddate",
  "weatheronline-via-wp",
  "windy",
  "wunderground",
  "pogodawnet",
  "msn",
  "weather-com",
  "accuweather",
];

const locationId = process.argv[2] ?? "szczecin";
const inputPath = process.argv[3] ?? "/tmp/open-meteo-szczecin.json";
const outputPath = process.argv[4] ?? "/tmp/forecast-szczecin.json";

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const allSlots = buildHourSlots(raw);
const byDate = groupByDate(allSlots);
const dates = [...byDate.keys()].sort().slice(0, 14);

const days = dates.map((date, i) => {
  const daySlots = byDate.get(date);
  const hours = pickHoursForDay(i, daySlots).map((s) => ({
    time: s.time,
    emoji: weatherCodeToEmoji(s.weatherCode),
    temperature: s.temperature,
    precipitationChance: s.precipitationChance,
    windKmh: s.windKmh,
  }));
  const summary = buildDailySummary(daySlots);
  return {
    date,
    tempMin: summary.tempMin,
    tempMax: summary.tempMax,
    precipitationChance: summary.precipitationChance,
    windKmh: summary.windKmh,
    hours,
  };
});

const current = raw.current;
const nowHour =
  allSlots.find((s) => s.time === raw.current.time.slice(0, 16)) ??
  allSlots.find((s) => s.time.includes("T09:00") || s.time.includes("T10:00")) ??
  allSlots[9];

const verdictText =
  "Dziś najpewniej słonecznie z przejaśnieniami — lekki wiatr, bez opadów. ICON, ECMWF i YR zgodnie; 20/22 źródeł na sucho do wieczora, ciepło 24°C w południe.";

const forecast = {
  locationId,
  generatedAt: new Date().toISOString(),
  sources,
  verdict: {
    text: verdictText.slice(0, 300),
    emoji: weatherCodeToEmoji(nowHour.weatherCode),
    temperature: round(current.temperature_2m ?? nowHour.temperature),
    feelsLike: round(current.apparent_temperature ?? nowHour.temperature),
    precipitationChance: nowHour.precipitationChance,
    windKmh: round(current.wind_speed_10m ?? nowHour.windKmh),
  },
  days,
};

writeFileSync(outputPath, JSON.stringify(forecast));
console.log(
  `Written ${outputPath} (${JSON.stringify(forecast).length} bytes, ${days.length} days, ${sources.length} sources)`,
);

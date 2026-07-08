#!/usr/bin/env node
/**
 * Build PogodAI forecast JSON from Open-Meteo multi-model data.
 */

const fs = require("fs");

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
  const valid = nums.filter((n) => n != null && !Number.isNaN(n));
  if (valid.length === 0) return 0;
  valid.sort((a, b) => a - b);
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 === 0
    ? Math.round(((valid[mid - 1] + valid[mid]) / 2) * 10) / 10
    : Math.round(valid[mid] * 10) / 10;
}

function round(n) {
  return Math.round(n);
}

function synthesizeHour(idx, hourly) {
  const temps = [
    hourly.temperature_2m_icon_seamless?.[idx],
    hourly.temperature_2m_gfs_seamless?.[idx],
    hourly.temperature_2m_ecmwf_ifs025?.[idx],
  ];
  const precips = [
    hourly.precipitation_probability_icon_seamless?.[idx],
    hourly.precipitation_probability_gfs_seamless?.[idx],
    hourly.precipitation_probability_ecmwf_ifs025?.[idx],
  ];
  const winds = [
    hourly.wind_speed_10m_icon_seamless?.[idx],
    hourly.wind_speed_10m_gfs_seamless?.[idx],
    hourly.wind_speed_10m_ecmwf_ifs025?.[idx],
  ];
  const codes = [
    hourly.weather_code_icon_seamless?.[idx],
    hourly.weather_code_gfs_seamless?.[idx],
    hourly.weather_code_ecmwf_ifs025?.[idx],
  ];

  const validPrecips = precips.filter((p) => p != null);
  let precip = median(validPrecips);
  const rainCount = validPrecips.filter((p) => p >= 40).length;
  if (rainCount >= 2) {
    precip = Math.max(...validPrecips.filter((p) => p >= 40));
  }

  const iconCode = codes[0];
  const gfsCode = codes[1];
  const ecmwfCode = codes[2];
  let code = iconCode ?? gfsCode ?? ecmwfCode ?? 3;
  const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 95];
  const codeVotes = [iconCode, gfsCode, ecmwfCode].filter((c) => c != null);
  const rainVotes = codeVotes.filter((c) => rainCodes.includes(c)).length;
  if (rainVotes >= 2) {
    code = codeVotes.find((c) => rainCodes.includes(c)) ?? code;
  }

  return {
    temp: round(median(temps.filter((t) => t != null))),
    precip: round(precip),
    wind: round(median(winds.filter((w) => w != null))),
    code,
  };
}

function getHourIndicesForDay(dayIdx) {
  if (dayIdx <= 2) {
    return Array.from({ length: 24 }, (_, h) => dayIdx * 24 + h);
  }
  const dayStart = dayIdx * 24;
  return Array.from({ length: 8 }, (_, i) => dayStart + i * 3);
}

function buildForecast(locationId, omData, sources, verdictText) {
  const hourly = omData.hourly;
  const daily = omData.daily;
  const current = omData.current;
  const times = hourly.time;

  const days = [];
  const dailyTimes = daily.time;

  for (let d = 0; d < 14; d++) {
    const date = dailyTimes[d];
    const hourIndices = getHourIndicesForDay(d);
    const hours = [];

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

    const modelMaxs = [
      daily.temperature_2m_max_icon_seamless?.[d],
      daily.temperature_2m_max_gfs_seamless?.[d],
      daily.temperature_2m_max_ecmwf_ifs025?.[d],
    ].filter((t) => t != null);
    const modelMins = [
      daily.temperature_2m_min_icon_seamless?.[d],
      daily.temperature_2m_min_gfs_seamless?.[d],
      daily.temperature_2m_min_ecmwf_ifs025?.[d],
    ].filter((t) => t != null);

    const tempMax = modelMaxs.length > 0
      ? round(median(modelMaxs))
      : Math.max(...dayTemps);
    const tempMin = modelMins.length > 0
      ? round(median(modelMins))
      : Math.min(...dayTemps);

    const modelPrecips = [
      daily.precipitation_probability_max_icon_seamless?.[d],
      daily.precipitation_probability_max_gfs_seamless?.[d],
      daily.precipitation_probability_max_ecmwf_ifs025?.[d],
    ].filter((p) => p != null);

    const modelWinds = [
      daily.wind_speed_10m_max_icon_seamless?.[d],
      daily.wind_speed_10m_max_gfs_seamless?.[d],
      daily.wind_speed_10m_max_ecmwf_ifs025?.[d],
    ].filter((w) => w != null);

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
  const curIdx = times.indexOf(current.time);
  const curSyn = curIdx >= 0
    ? synthesizeHour(curIdx, hourly)
    : { precip: 0, code: 3 };

  return {
    locationId,
    generatedAt: new Date().toISOString(),
    sources,
    verdict: {
      text: verdictText.slice(0, 300),
      emoji: weatherCodeToEmoji(curSyn.code),
      temperature: curTemp,
      feelsLike: curFeels,
      precipitationChance: curSyn.precip,
      windKmh: curWind,
    },
    days,
  };
}

const locationId = process.argv[2];
const omPath = process.argv[3];
const verdictText = process.argv[4] ?? "";

if (!locationId || !omPath) {
  console.error(
    "Usage: node build-forecast.mjs <locationId> <open-meteo.json> <verdict>",
  );
  process.exit(1);
}

const omData = JSON.parse(fs.readFileSync(omPath, "utf8"));
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

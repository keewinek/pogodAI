/**
 * Generuje przykładowy obiekt Forecast (na dziś + 6 kolejnych dni)
 * do testowania POST /api/forecast.
 *
 * Użycie: deno run -A scripts/generate-sample-forecast.ts [locationId]
 */
import type { DayForecast, Forecast, HourForecast } from "../lib/types.ts";

const locationId = Deno.args[0] ?? "warszawa-bialoleka";

const EMOJIS = ["☀️", "🌤️", "⛅", "☁️", "🌧️"];

function warsawDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function makeHours(date: string, stepH: number): HourForecast[] {
  const hours: HourForecast[] = [];
  for (let h = 0; h < 24; h += stepH) {
    hours.push({
      time: `${date}T${String(h).padStart(2, "0")}:00`,
      emoji: EMOJIS[(h / stepH) % EMOJIS.length],
      temperature: Math.round(12 + 8 * Math.sin(((h - 4) / 24) * Math.PI * 2)),
      precipitationChance: (h * 7) % 100,
      windKmh: 5 + (h % 20),
    });
  }
  return hours;
}

const days: DayForecast[] = [];
for (let i = 0; i < 7; i++) {
  const date = warsawDate(i);
  days.push({
    date,
    summary: i === 0
      ? "Przelotne opady po południu, wieczorem przejaśnienia."
      : `Dzień ${i + 1}: zmienna pogoda, miejscami słońce.`,
    emoji: EMOJIS[i % EMOJIS.length],
    tempMin: 9 + i,
    tempMax: 17 + i,
    precipitationChance: (i * 13) % 100,
    windKmh: 10 + i * 2,
    hours: makeHours(date, i < 2 ? 1 : 3),
  });
}

const forecast: Forecast = {
  locationId,
  generatedAt: new Date().toISOString(),
  sources: [
    "open-meteo-icon",
    "open-meteo-gfs",
    "open-meteo-ecmwf",
    "yr.no",
    "imgw",
    "tvn",
    "interia",
    "onet",
    "meteo.pl",
    "accuweather",
    "weather.com",
    "meteoblue",
    "foreca",
    "google",
    "msn",
  ],
  verdict: {
    text:
      "Po południu przelotny deszcz — weź parasol. ICON, GFS i ECMWF zbieżnie pokazują front; 12/15 źródeł potwierdza opady po 14:00.",
    emoji: "🌧️",
    temperature: 14,
    feelsLike: 12,
    precipitationChance: 70,
    windKmh: 18,
  },
  days,
};

console.log(JSON.stringify(forecast, null, 2));

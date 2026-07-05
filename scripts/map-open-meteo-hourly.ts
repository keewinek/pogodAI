/**
 * Pobiera godzinówkę z Open-Meteo i mapuje weather_code → emoji.
 * Użycie: deno run -A scripts/map-open-meteo-hourly.ts <lat> <lon> [forecast_days=7]
 *
 * Wyjście: JSON z tablicą hours (gotowe do wklejenia w days[].hours).
 */
import { weatherCodeToEmoji } from "../lib/weather-code.ts";

const lat = parseFloat(Deno.args[0] ?? "");
const lon = parseFloat(Deno.args[1] ?? "");
const days = parseInt(Deno.args[2] ?? "7", 10);

if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
  console.error(
    "Użycie: deno run -A scripts/map-open-meteo-hourly.ts <lat> <lon>",
  );
  Deno.exit(1);
}

const url =
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  `&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code` +
  `&timezone=Europe%2FWarsaw&forecast_days=${days}`;

const res = await fetch(url);
if (!res.ok) {
  console.error(`Open-Meteo HTTP ${res.status}`);
  Deno.exit(1);
}

const data = await res.json();
const hourly = data.hourly;
if (!hourly?.time) {
  console.error("Brak hourly w odpowiedzi Open-Meteo");
  Deno.exit(1);
}

const hours = hourly.time.map((time: string, i: number) => ({
  time,
  emoji: weatherCodeToEmoji(hourly.weather_code[i] ?? 0),
  temperature: Math.round(hourly.temperature_2m[i] ?? 0),
  precipitationChance: Math.round(hourly.precipitation_probability[i] ?? 0),
  windKmh: Math.round(hourly.wind_speed_10m[i] ?? 0),
}));

console.log(JSON.stringify({ hours }, null, 2));

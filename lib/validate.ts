import type { DayForecast, Forecast, HourForecast, Location } from "./types.ts";

const ALLOWED_EMOJI = new Set([
  "☀️",
  "🌤️",
  "⛅",
  "☁️",
  "🌧️",
  "⛈️",
  "🌨️",
  "❄️",
  "🌫️",
  "💨",
]);

const HOUR_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function validateHour(hour: unknown): hour is HourForecast {
  if (!isRecord(hour)) return false;
  return (
    isString(hour.time) &&
    HOUR_TIME_RE.test(hour.time) &&
    isString(hour.emoji) &&
    ALLOWED_EMOJI.has(hour.emoji) &&
    isNumber(hour.temperature) &&
    inRange(hour.temperature, -60, 60) &&
    isNumber(hour.precipitationChance) &&
    inRange(hour.precipitationChance, 0, 100) &&
    isNumber(hour.windKmh) &&
    inRange(hour.windKmh, 0, 300)
  );
}

function validateDay(day: unknown): day is DayForecast {
  if (!isRecord(day)) return false;
  if (
    !isString(day.date) ||
    !DATE_RE.test(day.date) ||
    !isString(day.summary) ||
    day.summary.length === 0 ||
    day.summary.length > 300 ||
    !isString(day.emoji) ||
    !ALLOWED_EMOJI.has(day.emoji) ||
    !isNumber(day.tempMin) ||
    !inRange(day.tempMin, -60, 60) ||
    !isNumber(day.tempMax) ||
    !inRange(day.tempMax, -60, 60) ||
    !isNumber(day.precipitationChance) ||
    !inRange(day.precipitationChance, 0, 100) ||
    !isNumber(day.windKmh) ||
    !inRange(day.windKmh, 0, 300) ||
    !Array.isArray(day.hours) ||
    day.hours.length < 1 ||
    day.hours.length > 24
  ) {
    return false;
  }
  return day.hours.every(validateHour);
}

export function validateForecastBody(body: unknown): body is Forecast {
  if (!isRecord(body)) return false;
  if (
    !isString(body.locationId) ||
    body.locationId.length === 0 ||
    !isString(body.generatedAt) ||
    !isStringArray(body.sources) ||
    body.sources.length === 0 ||
    !isRecord(body.verdict)
  ) {
    return false;
  }

  const { verdict } = body;
  if (
    !isString(verdict.text) ||
    verdict.text.length === 0 ||
    verdict.text.length > 300 ||
    !isString(verdict.emoji) ||
    !ALLOWED_EMOJI.has(verdict.emoji) ||
    !isNumber(verdict.temperature) ||
    !inRange(verdict.temperature, -60, 60) ||
    !isNumber(verdict.feelsLike) ||
    !inRange(verdict.feelsLike, -60, 60) ||
    !isNumber(verdict.precipitationChance) ||
    !inRange(verdict.precipitationChance, 0, 100) ||
    !isNumber(verdict.windKmh) ||
    !inRange(verdict.windKmh, 0, 300) ||
    !Array.isArray(body.days) ||
    body.days.length < 1 ||
    body.days.length > 8
  ) {
    return false;
  }

  return body.days.every(validateDay);
}

export function validateLocationInput(
  body: unknown,
): { ok: true; name: string; lat: number; lon: number } | {
  ok: false;
  error: string;
} {
  if (!isRecord(body)) {
    return { ok: false, error: "Nieprawidłowe dane wejściowe" };
  }

  if (!isString(body.name) || body.name.trim().length === 0) {
    return { ok: false, error: "Nazwa lokalizacji jest wymagana" };
  }

  const name = body.name.trim();
  if (name.length > 60) {
    return {
      ok: false,
      error: "Nazwa lokalizacji może mieć maksymalnie 60 znaków",
    };
  }

  if (!isNumber(body.lat) || !inRange(body.lat, -90, 90)) {
    return {
      ok: false,
      error: "Szerokość geograficzna musi być w zakresie -90 do 90",
    };
  }

  if (!isNumber(body.lon) || !inRange(body.lon, -180, 180)) {
    return {
      ok: false,
      error: "Długość geograficzna musi być w zakresie -180 do 180",
    };
  }

  return { ok: true, name, lat: body.lat, lon: body.lon };
}

export function validateForecastSize(
  body: Forecast,
  maxBytes = 60 * 1024,
): boolean {
  return new TextEncoder().encode(JSON.stringify(body)).length <= maxBytes;
}

export function isLocation(value: unknown): value is Location {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name) &&
    isNumber(value.lat) &&
    isNumber(value.lon) &&
    isString(value.createdAt)
  );
}

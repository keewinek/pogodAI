import type { DayForecast, Forecast, HourForecast, Verdict } from "./types.ts";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function numberIn(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

const TEMP = [-60, 60] as const;
const PRECIP = [0, 100] as const;
const WIND = [0, 300] as const;

function validateHour(v: unknown, path: string): Result<HourForecast> {
  if (!isRecord(v)) return { ok: false, error: `${path}: oczekiwano obiektu` };
  if (
    typeof v.time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(v.time)
  ) {
    return {
      ok: false,
      error: `${path}.time: wymagany format YYYY-MM-DDTHH:00`,
    };
  }
  if (
    typeof v.emoji !== "string" || v.emoji.length === 0 || v.emoji.length > 8
  ) {
    return { ok: false, error: `${path}.emoji: wymagane emoji` };
  }
  if (!numberIn(v.temperature, ...TEMP)) {
    return {
      ok: false,
      error: `${path}.temperature: liczba w zakresie -60..60`,
    };
  }
  if (!numberIn(v.precipitationChance, ...PRECIP)) {
    return {
      ok: false,
      error: `${path}.precipitationChance: liczba w zakresie 0..100`,
    };
  }
  if (!numberIn(v.windKmh, ...WIND)) {
    return { ok: false, error: `${path}.windKmh: liczba w zakresie 0..300` };
  }
  return {
    ok: true,
    value: {
      time: v.time,
      emoji: v.emoji,
      temperature: v.temperature,
      precipitationChance: v.precipitationChance,
      windKmh: v.windKmh,
    },
  };
}

function validateDay(v: unknown, path: string): Result<DayForecast> {
  if (!isRecord(v)) return { ok: false, error: `${path}: oczekiwano obiektu` };
  if (typeof v.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) {
    return { ok: false, error: `${path}.date: wymagany format YYYY-MM-DD` };
  }
  if (
    typeof v.summary !== "string" || v.summary.length === 0 ||
    v.summary.length > 300
  ) {
    return {
      ok: false,
      error: `${path}.summary: niepusty tekst do 300 znaków`,
    };
  }
  if (
    typeof v.emoji !== "string" || v.emoji.length === 0 || v.emoji.length > 8
  ) {
    return { ok: false, error: `${path}.emoji: wymagane emoji` };
  }
  if (!numberIn(v.tempMin, ...TEMP)) {
    return { ok: false, error: `${path}.tempMin: liczba w zakresie -60..60` };
  }
  if (!numberIn(v.tempMax, ...TEMP)) {
    return { ok: false, error: `${path}.tempMax: liczba w zakresie -60..60` };
  }
  if (!numberIn(v.precipitationChance, ...PRECIP)) {
    return {
      ok: false,
      error: `${path}.precipitationChance: liczba w zakresie 0..100`,
    };
  }
  if (!numberIn(v.windKmh, ...WIND)) {
    return { ok: false, error: `${path}.windKmh: liczba w zakresie 0..300` };
  }
  if (!Array.isArray(v.hours) || v.hours.length < 1 || v.hours.length > 24) {
    return { ok: false, error: `${path}.hours: tablica 1–24 wpisów` };
  }
  const hours: HourForecast[] = [];
  for (let i = 0; i < v.hours.length; i++) {
    const h = validateHour(v.hours[i], `${path}.hours[${i}]`);
    if (!h.ok) return h;
    hours.push(h.value);
  }
  return {
    ok: true,
    value: {
      date: v.date,
      summary: v.summary,
      emoji: v.emoji,
      tempMin: v.tempMin,
      tempMax: v.tempMax,
      precipitationChance: v.precipitationChance,
      windKmh: v.windKmh,
      hours,
    },
  };
}

function validateVerdict(v: unknown): Result<Verdict> {
  if (!isRecord(v)) return { ok: false, error: "verdict: oczekiwano obiektu" };
  if (
    typeof v.text !== "string" || v.text.length === 0 || v.text.length > 300
  ) {
    return { ok: false, error: "verdict.text: niepusty tekst do 300 znaków" };
  }
  if (
    typeof v.emoji !== "string" || v.emoji.length === 0 || v.emoji.length > 8
  ) {
    return { ok: false, error: "verdict.emoji: wymagane emoji" };
  }
  if (!numberIn(v.temperature, ...TEMP)) {
    return {
      ok: false,
      error: "verdict.temperature: liczba w zakresie -60..60",
    };
  }
  if (!numberIn(v.feelsLike, ...TEMP)) {
    return { ok: false, error: "verdict.feelsLike: liczba w zakresie -60..60" };
  }
  if (!numberIn(v.precipitationChance, ...PRECIP)) {
    return {
      ok: false,
      error: "verdict.precipitationChance: liczba w zakresie 0..100",
    };
  }
  if (!numberIn(v.windKmh, ...WIND)) {
    return { ok: false, error: "verdict.windKmh: liczba w zakresie 0..300" };
  }
  return {
    ok: true,
    value: {
      text: v.text,
      emoji: v.emoji,
      temperature: v.temperature,
      feelsLike: v.feelsLike,
      precipitationChance: v.precipitationChance,
      windKmh: v.windKmh,
    },
  };
}

export function validateForecast(v: unknown): Result<Forecast> {
  if (!isRecord(v)) return { ok: false, error: "Oczekiwano obiektu JSON." };
  if (typeof v.locationId !== "string" || v.locationId.length === 0) {
    return { ok: false, error: "locationId: wymagany niepusty string" };
  }
  if (
    typeof v.generatedAt !== "string" || Number.isNaN(Date.parse(v.generatedAt))
  ) {
    return { ok: false, error: "generatedAt: wymagana data ISO 8601" };
  }
  if (
    !Array.isArray(v.sources) || v.sources.length === 0 ||
    !v.sources.every((s) =>
      typeof s === "string" && s.length > 0 && s.length <= 100
    )
  ) {
    return { ok: false, error: "sources: niepusta tablica stringów" };
  }
  const verdict = validateVerdict(v.verdict);
  if (!verdict.ok) return verdict;
  if (!Array.isArray(v.days) || v.days.length < 1 || v.days.length > 8) {
    return { ok: false, error: "days: tablica 1–8 dni" };
  }
  const days: DayForecast[] = [];
  for (let i = 0; i < v.days.length; i++) {
    const d = validateDay(v.days[i], `days[${i}]`);
    if (!d.ok) return d;
    days.push(d.value);
  }
  return {
    ok: true,
    value: {
      locationId: v.locationId,
      generatedAt: v.generatedAt,
      sources: v.sources as string[],
      verdict: verdict.value,
      days,
    },
  };
}

export function validateNewLocation(
  v: unknown,
): Result<{ name: string; lat: number; lon: number }> {
  if (!isRecord(v)) return { ok: false, error: "Oczekiwano obiektu JSON." };
  if (
    typeof v.name !== "string" || v.name.trim().length === 0 ||
    v.name.trim().length > 60
  ) {
    return {
      ok: false,
      error: "Nazwa musi być niepusta i mieć maks. 60 znaków.",
    };
  }
  if (!numberIn(v.lat, -90, 90)) {
    return {
      ok: false,
      error: "Szerokość geograficzna (lat) musi być liczbą w zakresie -90..90.",
    };
  }
  if (!numberIn(v.lon, -180, 180)) {
    return {
      ok: false,
      error: "Długość geograficzna (lon) musi być liczbą w zakresie -180..180.",
    };
  }
  return { ok: true, value: { name: v.name.trim(), lat: v.lat, lon: v.lon } };
}

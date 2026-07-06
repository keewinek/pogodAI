import { warsawLocalToDate } from "./verification.ts";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 15_000;

export interface HourlyObservation {
  time: string;
  temperature: number;
  precipitation: number;
}

interface OpenMeteoResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    precipitation?: (number | null)[];
  };
}

/** Mapuje ISO z Open-Meteo (Warsaw) na klucz YYYY-MM-DDTHH:00. */
export function openMeteoTimeToKey(isoTime: string): string {
  return isoTime.slice(0, 13) + ":00";
}

export async function fetchHourlyObservations(
  lat: number,
  lon: number,
  hoursBack = 72,
): Promise<Map<string, HourlyObservation> | null> {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("hourly", "temperature_2m,precipitation");
  url.searchParams.set("timezone", "Europe/Warsaw");
  url.searchParams.set("past_hours", String(hoursBack));
  url.searchParams.set("forecast_hours", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = (await res.json()) as OpenMeteoResponse;
    const times = data.hourly?.time ?? [];
    const temps = data.hourly?.temperature_2m ?? [];
    const precips = data.hourly?.precipitation ?? [];

    const map = new Map<string, HourlyObservation>();
    for (let i = 0; i < times.length; i++) {
      const temp = temps[i];
      const precip = precips[i];
      if (temp == null || precip == null) continue;
      const key = openMeteoTimeToKey(times[i]);
      map.set(key, { time: key, temperature: temp, precipitation: precip });
    }
    return map;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Czy obserwacja dla validTime jest już dostępna (godzina minęła). */
export function observationShouldExist(
  validTime: string,
  now = new Date(),
): boolean {
  const validMs = warsawLocalToDate(validTime).getTime();
  return now.getTime() >= validMs + 3_600_000;
}

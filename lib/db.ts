export interface Location {
  id: string;
  name: string;
  lat: number;
  lon: number;
  createdAt: string;
}

export interface HourForecast {
  time: string;
  emoji: string;
  temperature: number;
  precipitationChance: number;
  windKmh: number;
}

export interface DayForecast {
  date: string;
  summary: string;
  emoji: string;
  tempMin: number;
  tempMax: number;
  precipitationChance: number;
  windKmh: number;
  hours: HourForecast[];
}

export interface Verdict {
  text: string;
  emoji: string;
  temperature: number;
  feelsLike: number;
  precipitationChance: number;
  windKmh: number;
}

export interface Forecast {
  locationId: string;
  generatedAt: string;
  sources: string[];
  verdict: Verdict;
  days: DayForecast[];
}

const LOCATIONS_KEY = ["locations"];
const FORECAST_KEY = "forecast";

export const DEFAULT_LOCATION: Location = {
  id: "warszawa-bialoleka",
  name: "Białołęka, Warszawa",
  lat: 52.32,
  lon: 20.97,
  createdAt: "2026-07-05T00:00:00.000Z",
};

let kvPromise: Promise<Deno.Kv> | null = null;

export function getKv(): Promise<Deno.Kv> {
  if (!kvPromise) {
    kvPromise = Deno.openKv().then(async (kv) => {
      const existing = await kv.get<Location[]>(LOCATIONS_KEY);
      if (existing.value === null) {
        await kv.atomic()
          .check({ key: LOCATIONS_KEY, versionstamp: null })
          .set(LOCATIONS_KEY, [DEFAULT_LOCATION])
          .commit();
      }
      return kv;
    });
  }
  return kvPromise;
}

export async function listLocations(): Promise<Location[]> {
  const kv = await getKv();
  const res = await kv.get<Location[]>(LOCATIONS_KEY);
  return res.value ?? [];
}

export async function getLocation(id: string): Promise<Location | null> {
  const locations = await listLocations();
  return locations.find((l) => l.id === id) ?? null;
}

export type AddLocationResult =
  | { ok: true; location: Location }
  | { ok: false; status: 409; error: string };

export async function addLocation(
  location: Location,
): Promise<AddLocationResult> {
  const kv = await getKv();
  // Pętla optimistic-concurrency na wypadek równoległych zapisów.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await kv.get<Location[]>(LOCATIONS_KEY);
    const locations = res.value ?? [];
    if (locations.some((l) => l.id === location.id)) {
      return {
        ok: false,
        status: 409,
        error: "Lokalizacja o tym id już istnieje.",
      };
    }
    const commit = await kv.atomic()
      .check(res)
      .set(LOCATIONS_KEY, [...locations, location])
      .commit();
    if (commit.ok) return { ok: true, location };
  }
  throw new Error("Nie udało się zapisać lokalizacji (konflikt zapisu).");
}

export async function deleteLocation(id: string): Promise<boolean> {
  const kv = await getKv();
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await kv.get<Location[]>(LOCATIONS_KEY);
    const locations = res.value ?? [];
    if (!locations.some((l) => l.id === id)) return false;
    const commit = await kv.atomic()
      .check(res)
      .set(LOCATIONS_KEY, locations.filter((l) => l.id !== id))
      .delete([FORECAST_KEY, id])
      .commit();
    if (commit.ok) return true;
  }
  throw new Error("Nie udało się usunąć lokalizacji (konflikt zapisu).");
}

export async function getForecast(
  locationId: string,
): Promise<Forecast | null> {
  const kv = await getKv();
  const res = await kv.get<Forecast>([FORECAST_KEY, locationId]);
  return res.value;
}

export async function setForecast(forecast: Forecast): Promise<void> {
  const kv = await getKv();
  await kv.set([FORECAST_KEY, forecast.locationId], forecast);
}

export async function countForecasts(locationIds: string[]): Promise<{
  forecasts: number;
  newestForecastAt: string | null;
}> {
  const kv = await getKv();
  let forecasts = 0;
  let newest: string | null = null;
  for (const id of locationIds) {
    const res = await kv.get<Forecast>([FORECAST_KEY, id]);
    if (res.value) {
      forecasts++;
      if (!newest || res.value.generatedAt > newest) {
        newest = res.value.generatedAt;
      }
    }
  }
  return { forecasts, newestForecastAt: newest };
}

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export function errorJson(message: string, status: number): Response {
  return json({ error: message }, status);
}

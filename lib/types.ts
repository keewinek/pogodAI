export interface Location {
  id: string; // slug, np. "warszawa-bialoleka"
  name: string; // "Białołęka, Warszawa"
  lat: number;
  lon: number;
  createdAt: string; // ISO 8601
}

export interface HourForecast {
  time: string; // "2026-07-05T15:00" — czas lokalny Europe/Warsaw
  emoji: string;
  temperature: number; // °C
  precipitationChance: number; // 0–100 %
  windKmh: number;
}

export interface DayForecast {
  date: string; // "2026-07-05"
  summary: string; // 1 zdanie
  emoji: string;
  tempMin: number;
  tempMax: number;
  precipitationChance: number; // 0–100 %
  windKmh: number;
  hours: HourForecast[]; // dziś+jutro co 1 h, dni 3+ co 3 h
}

export interface Verdict {
  text: string; // krótki werdykt, np. "Chłodno i deszczowo po południu — weź parasol."
  emoji: string;
  temperature: number; // °C
  feelsLike: number;
  precipitationChance: number; // 0–100 %
  windKmh: number;
}

export interface Forecast {
  locationId: string;
  generatedAt: string; // ISO 8601 — kiedy agent wygenerował
  sources: string[]; // np. ["open-meteo", "yr.no", "tvn"]
  verdict: Verdict;
  days: DayForecast[]; // 5–7 dni, [0] = dziś
}

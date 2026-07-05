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

export interface Forecast {
  locationId: string;
  generatedAt: string;
  sources: string[];
  verdict: {
    text: string;
    emoji: string;
    temperature: number;
    feelsLike: number;
    precipitationChance: number;
    windKmh: number;
  };
  days: DayForecast[];
}

export interface HealthStatus {
  ok: true;
  locations: number;
  forecasts: number;
  newestForecastAt: string | null;
}

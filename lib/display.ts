import type { DayForecast, HourForecast } from "./db.ts";

// --- theme ---

export interface Theme {
  name: string;
  gradient: string;
  accent: string;
  themeColor: string;
}

const THEMES: Record<string, Theme> = {
  sunny: {
    name: "sunny",
    gradient: "bg-gradient-to-b from-[#4a8fd4] via-[#2e5f8f] to-[#152238]",
    accent: "text-amber-200/90",
    themeColor: "#2e5f8f",
  },
  cloudy: {
    name: "cloudy",
    gradient: "bg-gradient-to-b from-[#6b7d8f] via-[#455563] to-[#283038]",
    accent: "text-white/85",
    themeColor: "#455563",
  },
  rainy: {
    name: "rainy",
    gradient: "bg-gradient-to-b from-[#4a5d72] via-[#2f3d4d] to-[#161c24]",
    accent: "text-sky-200/80",
    themeColor: "#2f3d4d",
  },
  snowy: {
    name: "snowy",
    gradient: "bg-gradient-to-b from-[#7a8fa3] via-[#556275] to-[#323a48]",
    accent: "text-white/90",
    themeColor: "#556275",
  },
  storm: {
    name: "storm",
    gradient: "bg-gradient-to-b from-[#3a4452] via-[#222830] to-[#0e1014]",
    accent: "text-violet-200/75",
    themeColor: "#222830",
  },
  night: {
    name: "night",
    gradient: "bg-gradient-to-b from-[#141820] via-[#0a0d12] to-[#030405]",
    accent: "text-indigo-200/70",
    themeColor: "#0a0d12",
  },
};

export const DEFAULT_THEME = THEMES.night;

export function isNightHour(hour: number): boolean {
  return hour >= 22 || hour < 6;
}

export const HIGH_WIND_KMH = 60;
const RAIN_PRECIP_MIN = 30;

const TIER = {
  STORM: 5,
  RAIN: 4,
  WIND: 3,
  CLOUDY: 2,
  CLEAR: 1,
} as const;

function isStormEmoji(emoji: string): boolean {
  return emoji.includes("⛈") || emoji.includes("🌩");
}

function isRainEmoji(emoji: string): boolean {
  return emoji.includes("🌧") || emoji.includes("☔") ||
    emoji.includes("🌦") || emoji.includes("🌨") || emoji.includes("❄");
}

function isSunEmoji(emoji: string): boolean {
  return emoji.includes("☀") || emoji.includes("🌤");
}

function isCloudyEmoji(emoji: string): boolean {
  return emoji.includes("⛅") || emoji.includes("☁") || emoji.includes("🌫");
}

/** Hierarchia: burza → deszcz → wiatr → pochmurno → słońce. */
export function conditionTier(
  emoji: string,
  windKmh: number,
  precipChance: number,
): number {
  if (isStormEmoji(emoji)) return TIER.STORM;
  if (isRainEmoji(emoji) || precipChance >= RAIN_PRECIP_MIN) return TIER.RAIN;
  if (windKmh >= HIGH_WIND_KMH) return TIER.WIND;
  if (isCloudyEmoji(emoji)) return TIER.CLOUDY;
  if (isSunEmoji(emoji)) return TIER.CLEAR;
  return TIER.CLOUDY;
}

function emojiForTier(
  tier: number,
  sourceEmoji: string,
  hour: number,
): string {
  switch (tier) {
    case TIER.STORM:
      return "⛈️";
    case TIER.RAIN:
      if (sourceEmoji.includes("🌨") || sourceEmoji.includes("❄")) {
        return "🌨️";
      }
      return "🌧️";
    case TIER.WIND:
      return "🌪️";
    case TIER.CLOUDY:
      if (isNightHour(hour)) return "🌙";
      if (sourceEmoji.includes("🌫")) return "🌫️";
      if (sourceEmoji.includes("☁")) return "☁️";
      return "⛅";
    default:
      if (isNightHour(hour)) return "🌙";
      if (sourceEmoji.includes("🌤")) return "🌤️";
      return "☀️";
  }
}

/** Ikona pogody wg hierarchii warunków. */
export function displayEmoji(
  emoji: string,
  hour: number,
  windKmh = 0,
  precipChance = 0,
): string {
  const tier = conditionTier(emoji, windKmh, precipChance);
  return emojiForTier(tier, emoji, hour);
}

export function themeFor(emoji: string | undefined, hour: number): Theme {
  const isNight = isNightHour(hour);
  if (isNight) return THEMES.night;
  if (!emoji) return THEMES.cloudy;
  if (emoji.includes("⛈") || emoji.includes("🌩")) return THEMES.storm;
  if (emoji.includes("🌪")) return THEMES.storm;
  if (emoji.includes("❄") || emoji.includes("🌨")) return THEMES.snowy;
  if (emoji.includes("🌧") || emoji.includes("☔") || emoji.includes("🌦")) {
    return THEMES.rainy;
  }
  if (emoji.includes("☀") || emoji.includes("🌤")) return THEMES.sunny;
  return THEMES.cloudy;
}

export function warsawHour(date = new Date()): number {
  return parseInt(
    new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      hour: "2-digit",
      hour12: false,
    }).format(date),
    10,
  );
}

export function conditionLabel(emoji: string): string {
  if (emoji.includes("⛈") || emoji.includes("🌩")) return "Burza";
  if (emoji.includes("🌧") || emoji.includes("☔")) return "Deszcz";
  if (emoji.includes("🌦")) return "Przelotne opady";
  if (emoji.includes("🌨") || emoji.includes("❄")) return "Śnieg";
  if (emoji.includes("🌫")) return "Mgła";
  if (emoji.includes("🌪")) return "Silny wiatr";
  if (emoji.includes("💨")) return "Wietrznie";
  if (emoji.includes("🌙")) return "Pogodna noc";
  if (emoji.includes("☀")) return "Słonecznie";
  if (emoji.includes("🌤")) return "Lekko zachmurzone";
  if (emoji.includes("⛅")) return "Pochmurno";
  if (emoji.includes("☁")) return "Zachmurzenie";
  return "Pogoda";
}

// --- time ---

const MONTHS_SHORT = [
  "sty",
  "lut",
  "mar",
  "kwi",
  "maj",
  "cze",
  "lip",
  "sie",
  "wrz",
  "paź",
  "lis",
  "gru",
];

const DAY_NAMES = ["Niedz.", "Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."];

/** Etykieta dnia w UI: „Pon. 6 lip”. */
export function dayDateLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  const m = match[2];
  const day = match[3];
  const monthLabel = MONTHS_SHORT[Number(m) - 1];
  if (!monthLabel) return date;
  return `${DAY_NAMES[d.getUTCDay()]} ${Number(day)} ${monthLabel}`;
}

export function warsawToday(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "nieznany czas";
  const diffMin = Math.round((now.getTime() - then) / 60_000);
  if (!Number.isFinite(diffMin)) return "nieznany czas";
  if (diffMin < 1) return "przed chwilą";
  if (diffMin < 60) return `${diffMin} min temu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    const restMin = diffMin % 60;
    return restMin > 0 ? `${diffH} h ${restMin} min temu` : `${diffH} h temu`;
  }
  const diffD = Math.floor(diffH / 24);
  return diffD === 1 ? "wczoraj" : `${diffD} dni temu`;
}

export function ageMinutes(iso: string, now = new Date()): number {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return Infinity;
  return Math.round((now.getTime() - then) / 60_000);
}

// --- forecast ---

export function upcomingHours(
  days: DayForecast[],
  todayDate: string,
  currentHour: number,
): HourForecast[] {
  const todayIdx = days.findIndex((d) => d.date === todayDate);
  if (todayIdx === -1) return [];

  const result = days[todayIdx].hours.filter((h) =>
    parseInt(h.time.slice(11, 13), 10) >= currentHour
  );

  if (result.length < 6) {
    const tomorrow = days[todayIdx + 1];
    if (tomorrow) result.push(...tomorrow.hours.slice(0, 8));
  }
  return result.slice(0, 24);
}

export function dayTemps(day: DayForecast): { min: number; max: number } {
  if (day.hours.length > 0) {
    const temps = day.hours.map((h) => h.temperature);
    return { min: Math.min(...temps), max: Math.max(...temps) };
  }
  if (day.tempMax >= day.tempMin) {
    return { min: day.tempMin, max: day.tempMax };
  }
  return { min: day.tempMin, max: day.tempMax };
}

export function dayWind(day: DayForecast): number {
  const fromHours = day.hours.length
    ? Math.max(...day.hours.map((h) => h.windKmh))
    : 0;
  return day.windKmh > 0 ? day.windKmh : fromHours;
}

export function dayPrecip(day: DayForecast): number {
  const fromHours = day.hours.length
    ? Math.max(...day.hours.map((h) => h.precipitationChance))
    : 0;
  return day.precipitationChance > 0 ? day.precipitationChance : fromHours;
}

export function hourFromTime(time: string): number {
  return parseInt(time.slice(11, 13), 10);
}

/** Ikona dnia — najwyższy poziom hierarchii z całej doby. */
export function dayEmoji(day: DayForecast): string {
  if (day.hours.length === 0) return "⛅";

  let pick = day.hours[0];
  let bestTier = -1;
  for (const h of day.hours) {
    const tier = conditionTier(
      h.emoji,
      h.windKmh,
      h.precipitationChance,
    );
    if (tier > bestTier) {
      bestTier = tier;
      pick = h;
    }
  }

  return displayEmoji(
    pick.emoji,
    12,
    pick.windKmh,
    pick.precipitationChance,
  );
}

export function hourLabel(time: string): string {
  return time.slice(11, 16);
}

import type { DayForecast, HourForecast } from "./types.ts";

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

export function themeFor(emoji: string | undefined, hour: number): Theme {
  const isNight = hour >= 22 || hour < 6;
  if (isNight) return THEMES.night;
  if (!emoji) return THEMES.cloudy;
  if (emoji.includes("⛈") || emoji.includes("🌩")) return THEMES.storm;
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
  if (emoji.includes("💨")) return "Wietrznie";
  if (emoji.includes("☀")) return "Słonecznie";
  if (emoji.includes("🌤")) return "Lekko zachmurzone";
  if (emoji.includes("⛅")) return "Pochmurno";
  if (emoji.includes("☁")) return "Zachmurzenie";
  return "Pogoda";
}

// --- time ---

const DAY_NAMES = ["Niedz.", "Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."];

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function dayLabel(date: string, todayDate: string): string {
  if (date === todayDate) return "Dziś";
  const d = parseDate(date);
  const today = parseDate(todayDate);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return "Jutro";
  return DAY_NAMES[d.getUTCDay()];
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
  const diffMin = Math.round(
    (now.getTime() - new Date(iso).getTime()) / 60_000,
  );
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
  return Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
}

// --- forecast ---

export function upcomingHours(
  days: DayForecast[],
  todayDate: string,
  currentHour: number,
): HourForecast[] {
  const todayIdx = days.findIndex((d) => d.date === todayDate);
  if (todayIdx === -1) return days[0]?.hours ?? [];

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
  const hasDayRange = day.tempMax > day.tempMin ||
    (day.tempMin !== 0 && day.tempMax !== 0);
  if (hasDayRange) return { min: day.tempMin, max: day.tempMax };
  if (day.hours.length === 0) {
    return { min: day.tempMin, max: day.tempMax };
  }
  const temps = day.hours.map((h) => h.temperature);
  return { min: Math.min(...temps), max: Math.max(...temps) };
}

export function hourLabel(time: string): string {
  return time.slice(11, 16);
}

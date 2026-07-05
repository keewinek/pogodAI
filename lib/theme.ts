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

/** Motyw na podstawie emoji werdyktu i godziny lokalnej (Europe/Warsaw). */
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

/** Bieżąca godzina w strefie Europe/Warsaw. */
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

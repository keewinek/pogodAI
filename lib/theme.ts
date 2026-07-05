export interface Theme {
  name: string;
  gradient: string; // klasy Tailwind na tło
  accent: string; // klasa koloru akcentu
  themeColor: string; // meta theme-color
}

const THEMES: Record<string, Theme> = {
  sunny: {
    name: "sunny",
    gradient: "bg-gradient-to-b from-sky-400 to-blue-600",
    accent: "text-amber-300",
    themeColor: "#38bdf8",
  },
  cloudy: {
    name: "cloudy",
    gradient: "bg-gradient-to-b from-slate-400 to-slate-700",
    accent: "text-sky-300",
    themeColor: "#94a3b8",
  },
  rainy: {
    name: "rainy",
    gradient: "bg-gradient-to-b from-slate-600 to-indigo-900",
    accent: "text-cyan-300",
    themeColor: "#475569",
  },
  snowy: {
    name: "snowy",
    gradient: "bg-gradient-to-b from-slate-500 to-blue-900",
    accent: "text-white",
    themeColor: "#64748b",
  },
  storm: {
    name: "storm",
    gradient: "bg-gradient-to-b from-slate-800 to-purple-950",
    accent: "text-yellow-300",
    themeColor: "#1e293b",
  },
  night: {
    name: "night",
    gradient: "bg-gradient-to-b from-slate-900 to-indigo-950",
    accent: "text-indigo-300",
    themeColor: "#0f172a",
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

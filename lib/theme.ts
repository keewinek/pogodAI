import { getWarsawHour } from "./time.ts";

export const STORAGE_KEY = "pogodai_location";

export type WeatherTheme =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "snowy"
  | "storm"
  | "night";

const SUNNY = new Set(["☀️", "🌤️"]);
const CLOUDY = new Set(["⛅", "☁️", "🌫️"]);
const RAINY = new Set(["🌧️", "💨"]);
const STORM = new Set(["⛈️", "🌩️"]);
const SNOWY = new Set(["🌨️", "❄️"]);

export const THEME_GRADIENTS: Record<WeatherTheme, string> = {
  sunny: "from-sky-400 to-blue-600",
  cloudy: "from-slate-400 to-slate-700",
  rainy: "from-slate-600 to-indigo-900",
  snowy: "from-slate-300 to-blue-800",
  storm: "from-slate-800 to-purple-950",
  night: "from-slate-900 to-indigo-950",
};

export const THEME_COLORS: Record<WeatherTheme, string> = {
  sunny: "#38bdf8",
  cloudy: "#64748b",
  rainy: "#312e81",
  snowy: "#93c5fd",
  storm: "#3b0764",
  night: "#1e1b4b",
};

export function resolveTheme(
  emoji: string,
  hour = getWarsawHour(),
): WeatherTheme {
  if (hour >= 22 || hour < 6) return "night";
  if (SUNNY.has(emoji)) return "sunny";
  if (SNOWY.has(emoji)) return "snowy";
  if (STORM.has(emoji)) return "storm";
  if (RAINY.has(emoji)) return "rainy";
  if (CLOUDY.has(emoji)) return "cloudy";
  return "cloudy";
}

export function isLightTheme(theme: WeatherTheme): boolean {
  return theme === "snowy";
}

import {
  formatRelativeTime,
  formatSources,
  getFreshnessLevel,
} from "../lib/time.ts";
import { isLightTheme, type WeatherTheme } from "../lib/theme.ts";

interface FreshnessFooterProps {
  generatedAt: string;
  sources: string[];
  theme: WeatherTheme;
}

export function FreshnessFooter(
  { generatedAt, sources, theme }: FreshnessFooterProps,
) {
  const light = isLightTheme(theme);
  const level = getFreshnessLevel(generatedAt);
  const relative = formatRelativeTime(generatedAt);

  const freshnessClass = level === "fresh"
    ? light ? "text-slate-500" : "text-white/60"
    : level === "stale"
    ? "text-amber-300"
    : "text-red-300";

  const freshnessText = level === "fresh"
    ? `Zaktualizowano ${relative}`
    : level === "stale"
    ? `Dane mogą być nieaktualne (${relative})`
    : `Ostatnia aktualizacja ${relative} — automatyzacja mogła się wysypać`;

  return (
    <footer
      class={`text-center text-sm space-y-1 pt-2 ${
        light ? "text-slate-600" : ""
      }`}
    >
      <p class={freshnessClass}>{freshnessText}</p>
      {sources.length > 0 && (
        <p class={light ? "text-slate-500" : "text-white/50"}>
          Synteza z: {formatSources(sources)}
        </p>
      )}
    </footer>
  );
}

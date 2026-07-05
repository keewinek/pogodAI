import { cardClass } from "./WeatherLayout.tsx";
import { isLightTheme, type WeatherTheme } from "../lib/theme.ts";

interface VerdictCardProps {
  text: string;
  precipitationChance: number;
  theme: WeatherTheme;
}

export function VerdictCard(
  { text, precipitationChance, theme }: VerdictCardProps,
) {
  const light = isLightTheme(theme);
  const accent = light ? "text-blue-700" : "text-cyan-200";

  return (
    <section
      class={`${cardClass(light)} p-5 ${
        light
          ? "ring-2 ring-blue-300/60 bg-gradient-to-br from-white/90 to-blue-50/80"
          : "ring-1 ring-white/25 bg-gradient-to-br from-white/15 to-white/5"
      }`}
    >
      <p
        class={`text-xs font-semibold tracking-widest uppercase mb-2 ${
          light ? "text-slate-500" : "text-white/70"
        }`}
      >
        Werdykt
      </p>
      <p class="text-lg sm:text-xl leading-snug font-medium">{text}</p>
      <p class={`mt-3 text-sm font-medium ${accent}`}>
        ☔ {precipitationChance}% szansa opadów
      </p>
    </section>
  );
}

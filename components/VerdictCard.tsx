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
      class={`${cardClass(light)} p-5 ring-1 ${
        light ? "ring-blue-200/80" : "ring-white/20"
      }`}
    >
      <p
        class={`text-xs font-semibold tracking-widest uppercase mb-3 ${
          light ? "text-slate-500" : "text-white/70"
        }`}
      >
        Werdykt
      </p>
      <p class="text-lg leading-relaxed font-medium">{text}</p>
      <p class={`mt-4 text-sm ${accent}`}>
        ☔ {precipitationChance}% szansa opadów
      </p>
    </section>
  );
}

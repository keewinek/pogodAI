import { cardClass } from "./WeatherLayout.tsx";
import { isLightTheme, type WeatherTheme } from "../lib/theme.ts";

interface HeroProps {
  emoji: string;
  temperature: number;
  feelsLike: number;
  windKmh: number;
  theme: WeatherTheme;
}

export function Hero(
  { emoji, temperature, feelsLike, windKmh, theme }: HeroProps,
) {
  const light = isLightTheme(theme);
  const muted = light ? "text-slate-600" : "text-white/80";

  return (
    <section class="text-center pt-2">
      <div class="text-7xl leading-none mb-2" aria-hidden="true">{emoji}</div>
      <div class="text-7xl font-light tracking-tight">{temperature}°</div>
      <p class={`mt-2 text-base ${muted}`}>
        Odczuwalna {feelsLike}° · Wiatr {windKmh} km/h
      </p>
    </section>
  );
}

export function WaitingHero({ theme }: { theme: WeatherTheme }) {
  const light = isLightTheme(theme);

  return (
    <section class={`${cardClass(light)} p-6 text-center`}>
      <div class="text-5xl mb-3" aria-hidden="true">⏳</div>
      <h2 class="text-xl font-medium mb-2">Czekam na pierwszą prognozę</h2>
      <p class={light ? "text-slate-600" : "text-white/80"}>
        Pojawi się w ciągu godziny po uruchomieniu automatyzacji.
      </p>
    </section>
  );
}

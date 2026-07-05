import type { Verdict } from "../lib/types.ts";

export function Hero({ verdict }: { verdict: Verdict }) {
  return (
    <section class="flex flex-col items-center pt-6 pb-4 text-center">
      <div class="text-7xl leading-none drop-shadow-lg" aria-hidden="true">
        {verdict.emoji}
      </div>
      <div class="mt-2 text-7xl font-light tracking-tight">
        {Math.round(verdict.temperature)}°
      </div>
      <div class="mt-2 text-sm text-white/80">
        Odczuwalna {Math.round(verdict.feelsLike)}° · Wiatr{" "}
        {Math.round(verdict.windKmh)} km/h
      </div>
    </section>
  );
}

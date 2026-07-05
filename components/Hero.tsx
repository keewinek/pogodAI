import type { Verdict } from "../lib/types.ts";
import { conditionLabel } from "../lib/weather-label.ts";

export function Hero({ verdict }: { verdict: Verdict }) {
  const label = conditionLabel(verdict.emoji);
  return (
    <section class="flex flex-col items-center pt-2 pb-1 text-center">
      <p
        class={`hero-condition ${
          label === "Słonecznie" ? "text-amber-100/90" : ""
        }`}
      >
        {label}
      </p>
      <div class="hero-emoji mt-3 mb-1 select-none" aria-hidden="true">
        {verdict.emoji}
      </div>
      <div class="temp-hero">{Math.round(verdict.temperature)}°</div>

      <div class="stat-chip w-full max-w-[18rem]">
        <div class="stat-chip-item">
          <span class="stat-chip-value">{Math.round(verdict.feelsLike)}°</span>
          Odczuwalna
        </div>
        <div class="stat-chip-item">
          <span class="stat-chip-value">{Math.round(verdict.windKmh)}</span>
          km/h wiatr
        </div>
        <div class="stat-chip-item">
          <span class="stat-chip-value">
            {Math.round(verdict.precipitationChance)}%
          </span>
          Opady
        </div>
      </div>
    </section>
  );
}

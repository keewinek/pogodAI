import type { HourForecast, Verdict } from "../lib/db.ts";
import {
  ageMinutes,
  conditionLabel,
  hourLabel,
  relativeTime,
} from "../lib/display.ts";

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

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  return (
    <section class="grouped px-5 py-4">
      <div class="verdict-accent">
        <p class="text-[17px] leading-relaxed font-medium text-white/95">
          {verdict.text}
        </p>
      </div>
      <div class="mt-4">
        <span class="precip-badge">
          {Math.round(verdict.precipitationChance)}% szansa opadów
        </span>
      </div>
    </section>
  );
}

export function HourlyStrip(
  { hours, embedded = false }: { hours: HourForecast[]; embedded?: boolean },
) {
  if (hours.length === 0) {
    return <p class="text-[15px] muted px-1">Brak danych godzinowych.</p>;
  }

  const strip = (
    <div class="overflow-x-auto no-scrollbar">
      <div class={`flex w-max ${embedded ? "gap-0" : "gap-1 px-1"}`}>
        {hours.map((h, i) => {
          const isNow = !embedded && i === 0;
          return (
            <div
              key={h.time}
              class={`flex flex-col items-center gap-1 min-w-[3.75rem] px-3 py-2 rounded-xl ${
                isNow ? "bg-white/10" : ""
              } ${embedded && i > 0 ? "border-l border-white/10" : ""}`}
            >
              <span
                class={`text-[12px] font-medium tabular-nums ${
                  isNow ? "text-white" : "muted"
                }`}
              >
                {isNow ? "Teraz" : hourLabel(h.time)}
              </span>
              <span class="text-[24px] leading-none" aria-hidden="true">
                {h.emoji}
              </span>
              <span class="text-[16px] font-semibold tabular-nums">
                {Math.round(h.temperature)}°
              </span>
              {h.precipitationChance > 0 && (
                <span class="text-[11px] muted tabular-nums">
                  {Math.round(h.precipitationChance)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (embedded) return strip;
  return <div class="grouped px-2 py-2">{strip}</div>;
}

export function FreshnessFooter(
  { generatedAt, sources }: { generatedAt: string; sources: string[] },
) {
  const age = ageMinutes(generatedAt);
  let freshnessClass = "muted";
  let warning: string | null = null;
  if (age > 180) {
    freshnessClass = "text-red-400/90";
    warning = "automatyzacja mogła się wysypać";
  } else if (age > 90) {
    freshnessClass = "text-amber-300/90";
    warning = "dane mogą być nieaktualne";
  }

  return (
    <footer class="pt-4 pb-12 text-center">
      <div class="footer-badge inline-block rounded-full px-4 py-2">
        <p class={`text-[12px] ${freshnessClass}`}>
          Zaktualizowano {relativeTime(generatedAt)}
          {warning && <span class="block mt-0.5 opacity-90">{warning}</span>}
        </p>
      </div>
      <p class="mt-3 text-[11px] muted leading-relaxed max-w-xs mx-auto px-2">
        Synteza z: {sources.slice(0, 8).join(" · ")}
        {sources.length > 8 ? ` · +${sources.length - 8}` : ""}
      </p>
    </footer>
  );
}

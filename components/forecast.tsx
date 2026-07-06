import type { HourForecast, Verdict } from "../lib/db.ts";
import {
  ageMinutes,
  conditionLabel,
  displayEmoji,
  hourLabel,
  relativeTime,
} from "../lib/display.ts";

export function Hero(
  { verdict, hour }: { verdict: Verdict; hour: number },
) {
  const emoji = displayEmoji(
    verdict.emoji,
    hour,
    verdict.windKmh,
    verdict.precipitationChance,
  );
  const label = conditionLabel(emoji);
  const labelClass = label === "Słonecznie"
    ? "hero-condition--warm"
    : label === "Pogodna noc"
    ? "hero-condition--cool"
    : "";
  return (
    <section class="flex flex-col items-center pt-2 pb-1 text-center">
      <p class={`hero-condition ${labelClass}`}>
        {label}
      </p>
      <div class="temp-hero mt-2">{Math.round(verdict.temperature)}°</div>
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
        <p class="verdict-text">
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
      <div class="flex w-max gap-1 px-1">
        {hours.map((h, i) => {
          const isNow = !embedded && i === 0;
          const hour = parseInt(h.time.slice(11, 13), 10);
          const emoji = displayEmoji(
            h.emoji,
            hour,
            h.windKmh,
            h.precipitationChance,
          );
          return (
            <div
              key={h.time}
              class={`hour-slot ${isNow ? "hour-slot-active" : ""}`}
            >
              <span
                class={`hour-time ${isNow ? "hour-time-active" : ""}`}
              >
                {isNow ? "Teraz" : hourLabel(h.time)}
              </span>
              <span class="text-[24px] leading-none" aria-hidden="true">
                {emoji}
              </span>
              <span class="hour-temp">
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
  return <div class="grouped hour-strip">{strip}</div>;
}

export function FreshnessFooter(
  { generatedAt, sources }: { generatedAt: string; sources: string[] },
) {
  const age = ageMinutes(generatedAt);
  let freshnessClass = "muted";
  let warning: string | null = null;
  if (age > 180) {
    freshnessClass = "text-danger";
    warning = "automatyzacja mogła się wysypać";
  } else if (age > 90) {
    freshnessClass = "text-warn";
    warning = "dane mogą być nieaktualne";
  }

  return (
    <footer class="pt-4 pb-12 text-center">
      <div class="footer-badge inline-block rounded-full px-4 py-2">
        <p class={`text-[12px] ${freshnessClass}`}>
          Zaktualizowano {relativeTime(generatedAt)}
          {warning && <span class="block mt-0.5">{warning}</span>}
        </p>
      </div>
      <p class="mt-3 text-[11px] muted leading-relaxed max-w-xs mx-auto px-2">
        Synteza z: {sources.slice(0, 8).join(" · ")}
        {sources.length > 8 ? ` · +${sources.length - 8}` : ""}
      </p>
    </footer>
  );
}

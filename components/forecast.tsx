import type { HourForecast, Verdict } from "../lib/db.ts";
import {
  ageMinutes,
  conditionLabel,
  displayEmoji,
  hourLabel,
  relativeTime,
} from "../lib/display.ts";
import { formatAccuracyPl } from "../lib/verification.ts";

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
  return (
    <section class="flex flex-col items-center pt-2 pb-1 text-center">
      <p class="hero-condition">
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

export function VerdictCard(
  { verdict, accuracy, preliminary }: {
    verdict: Verdict;
    accuracy: number | null;
    preliminary?: boolean;
  },
) {
  const label = accuracy != null
    ? `${formatAccuracyPl(accuracy)} sprawdzalności${
      preliminary ? " (wstępnie)" : ""
    }`
    : "Zbieram dane sprawdzalności…";

  return (
    <section class="verdict-block">
      <p class="verdict-text">
        {verdict.text}
      </p>
      <a
        href="/sprawdzalnosc"
        class="precip-badge precip-badge-link mt-3 block"
      >
        {label}
      </a>
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
              class={`hour-slot`}
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
  return <div class="hour-strip">{strip}</div>;
}

export function FreshnessFooter(
  { generatedAt, sources }: { generatedAt: string; sources: string[] },
) {
  const age = ageMinutes(generatedAt);
  let freshnessClass = "muted";
  let warning: string | null = null;
  if (age > 180) {
    warning = "automatyzacja mogła się wysypać";
  } else if (age > 90) {
    warning = "dane mogą być nieaktualne";
  }

  return (
    <footer class="pt-4 pb-12 text-center">
      <div class="footer-badge inline-block px-4 py-2">
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

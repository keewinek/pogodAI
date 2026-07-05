import type { HourForecast } from "../lib/types.ts";
import { hourLabel } from "../lib/forecast-utils.ts";

export function HourlyStrip(
  { hours, embedded = false }: { hours: HourForecast[]; embedded?: boolean },
) {
  if (hours.length === 0) {
    return <p class="text-[15px] muted px-1">Brak danych godzinowych.</p>;
  }

  const strip = (
    <div
      class={`overflow-x-auto snap-x no-scrollbar ${
        embedded ? "" : "scroll-fade"
      }`}
    >
      <div class="flex w-max px-3 py-1">
        {hours.map((h, i) => {
          const isNow = !embedded && i === 0;
          return (
            <div
              key={h.time}
              class={`snap-start hour-cell flex flex-col items-center gap-1.5 px-3.5 py-2 min-w-[4.25rem] ${
                isNow
                  ? "hour-cell--now"
                  : i > 0
                  ? "border-l border-white/[0.06]"
                  : ""
              }`}
            >
              <span
                class={`text-[13px] font-medium tabular-nums ${
                  isNow ? "text-white/90" : "muted"
                }`}
              >
                {isNow ? "Teraz" : hourLabel(h.time)}
              </span>
              <span
                class="text-[26px] leading-none select-none"
                aria-hidden="true"
              >
                {h.emoji}
              </span>
              <span class="text-[17px] font-semibold tabular-nums">
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
  return <div class="grouped py-2">{strip}</div>;
}

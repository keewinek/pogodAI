import type { HourForecast } from "../lib/types.ts";
import { hourLabel } from "../lib/forecast-utils.ts";

export function HourlyStrip({ hours }: { hours: HourForecast[] }) {
  if (hours.length === 0) {
    return <p class="text-sm text-white/60 px-1">Brak danych godzinowych.</p>;
  }
  return (
    <div class="overflow-x-auto snap-x no-scrollbar -mx-1 px-1">
      <div class="flex gap-2 w-max">
        {hours.map((h) => (
          <div
            key={h.time}
            class="snap-start flex flex-col items-center gap-1 rounded-2xl bg-white/10 px-3 py-3 min-w-16"
          >
            <span class="text-xs text-white/70">{hourLabel(h.time)}</span>
            <span class="text-2xl leading-none" aria-hidden="true">
              {h.emoji}
            </span>
            <span class="text-sm font-semibold">
              {Math.round(h.temperature)}°
            </span>
            <span class="text-[11px] text-cyan-200">
              ☔{Math.round(h.precipitationChance)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

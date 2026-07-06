import type { HourForecast } from "../lib/types.ts";
import { hourLabel } from "../lib/forecast-utils.ts";

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

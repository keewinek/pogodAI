import { useMemo, useState } from "preact/hooks";
import type { DayForecast } from "../lib/types.ts";
import { dayTemps } from "../lib/forecast-utils.ts";
import { HourlyStrip } from "../components/HourlyStrip.tsx";

function tempBarStyle(
  tempMin: number,
  tempMax: number,
  globalMin: number,
  globalMax: number,
): { left: string; width: string } {
  const span = globalMax - globalMin || 1;
  const left = ((tempMin - globalMin) / span) * 100;
  const width = Math.max(((tempMax - tempMin) / span) * 100, 8);
  return { left: `${left}%`, width: `${width}%` };
}

/**
 * Lista dni z rozwijaną godzinówką. Wszystkie dane są w HTML z SSR —
 * island tylko przełącza widoczność (jeden rozwinięty dzień naraz).
 */
export default function DailyAccordion(
  { days, labels }: { days: DayForecast[]; labels: string[] },
) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const { globalMin, globalMax } = useMemo(() => {
    const ranges = days.map((d) => dayTemps(d));
    return {
      globalMin: Math.min(...ranges.map((r) => r.min)),
      globalMax: Math.max(...ranges.map((r) => r.max)),
    };
  }, [days]);

  return (
    <div class="grouped grouped-divider">
      {days.map((day, i) => {
        const open = openIdx === i;
        const isToday = labels[i] === "Dziś";
        const { min: tempMin, max: tempMax } = dayTemps(day);
        const bar = tempBarStyle(
          tempMin,
          tempMax,
          globalMin,
          globalMax,
        );
        return (
          <div key={day.date}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIdx(open ? null : i)}
              class={`grouped-row w-full text-left transition hover:bg-white/[0.04] py-3 ${
                isToday ? "font-semibold" : ""
              }`}
            >
              <span class="w-[3.25rem] shrink-0 text-[17px]">
                {labels[i]}
              </span>
              <span
                class="text-[20px] leading-none select-none shrink-0"
                aria-hidden="true"
              >
                {day.emoji}
              </span>

              <div class="flex-1 flex items-center gap-2 min-w-0 mx-1">
                <span class="text-[15px] muted tabular-nums w-7 text-right shrink-0">
                  {Math.round(tempMin)}°
                </span>
                <div class="temp-range-track flex-1 min-w-[3rem]">
                  <div
                    class="temp-range-fill"
                    style={{ left: bar.left, width: bar.width }}
                  />
                </div>
                <span class="text-[15px] tabular-nums w-7 shrink-0">
                  {Math.round(tempMax)}°
                </span>
              </div>

              <span class="w-9 shrink-0 text-right text-[14px] muted tabular-nums">
                {day.precipitationChance > 0
                  ? `${Math.round(day.precipitationChance)}%`
                  : "—"}
              </span>
              <span
                class={`chevron transition-transform duration-200 ${
                  open ? "rotate-[135deg]" : "chevron-down"
                }`}
                aria-hidden="true"
              />
            </button>
            {open && (
              <div class="px-4 pb-4 pt-2 border-t border-white/[0.08]">
                <p class="text-[15px] muted-strong leading-relaxed mb-4">
                  {day.summary}
                </p>
                <HourlyStrip hours={day.hours} embedded />
                <p class="mt-3 text-[13px] muted tabular-nums">
                  Wiatr do {Math.round(day.windKmh)} km/h
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

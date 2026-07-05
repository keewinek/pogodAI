import { useState } from "preact/hooks";
import type { DayForecast } from "../lib/types.ts";
import { HourlyStrip } from "../components/HourlyStrip.tsx";

/**
 * Lista dni z rozwijaną godzinówką. Wszystkie dane są w HTML z SSR —
 * island tylko przełącza widoczność (jeden rozwinięty dzień naraz).
 */
export default function DailyAccordion(
  { days, labels }: { days: DayForecast[]; labels: string[] },
) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div class="rounded-3xl bg-white/10 backdrop-blur border border-white/15 overflow-hidden divide-y divide-white/10">
      {days.map((day, i) => {
        const open = openIdx === i;
        const isToday = labels[i] === "Dziś";
        return (
          <div key={day.date}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIdx(open ? null : i)}
              class={`w-full flex items-center gap-3 px-4 py-3.5 text-left min-h-11 hover:bg-white/5 transition ${
                isToday ? "bg-white/5" : ""
              }`}
            >
              <span
                class={`w-14 shrink-0 text-sm ${
                  isToday ? "font-bold" : "font-medium"
                }`}
              >
                {labels[i]}
              </span>
              <span class="text-xl" aria-hidden="true">{day.emoji}</span>
              <span class="flex-1 text-sm text-right text-white/90">
                <span class="text-white/60">{Math.round(day.tempMin)}°</span>
                {" / "}
                <span class="font-semibold">{Math.round(day.tempMax)}°</span>
              </span>
              <span class="w-14 shrink-0 text-right text-xs text-cyan-200">
                ☔{Math.round(day.precipitationChance)}%
              </span>
              <span class="text-white/40 text-xs" aria-hidden="true">
                {open ? "▾" : "▸"}
              </span>
            </button>
            {open && (
              <div class="px-4 pb-4">
                <p class="text-sm text-white/80 mb-3">{day.summary}</p>
                <HourlyStrip hours={day.hours} />
                <p class="mt-2 text-xs text-white/50">
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

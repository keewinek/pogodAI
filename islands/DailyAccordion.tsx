import { useState } from "preact/hooks";
import type { DayForecast } from "../lib/types.ts";
import { formatDayLabel } from "../lib/time.ts";
import { isLightTheme, type WeatherTheme } from "../lib/theme.ts";
import { cardClass } from "../components/WeatherLayout.tsx";
import { HourlyStrip } from "../components/HourlyStrip.tsx";

interface DailyAccordionProps {
  days: DayForecast[];
  theme: WeatherTheme;
}

export default function DailyAccordion({ days, theme }: DailyAccordionProps) {
  const [expanded, setExpanded] = useState<number | null>(0);
  const light = isLightTheme(theme);
  const muted = light ? "text-slate-600" : "text-white/70";

  function toggle(index: number) {
    setExpanded((current) => (current === index ? null : index));
  }

  return (
    <div
      class={`${cardClass(light)} divide-y ${
        light ? "divide-slate-200/80" : "divide-white/10"
      }`}
    >
      {days.map((day, index) => {
        const isOpen = expanded === index;
        const panelId = `day-panel-${index}`;

        return (
          <div key={day.date}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(index)}
              class={`flex w-full min-h-14 items-center gap-3 px-4 py-3 text-left ${
                index === 0 ? "font-semibold" : ""
              }`}
            >
              <span class="w-14 shrink-0">
                {formatDayLabel(day.date, index)}
              </span>
              <span class="text-xl" aria-hidden="true">{day.emoji}</span>
              <span class="flex-1">
                {day.tempMin}°/{day.tempMax}°
              </span>
              <span class={`text-sm ${muted}`}>
                ☔{day.precipitationChance}%
              </span>
              <span aria-hidden="true" class={muted}>{isOpen ? "▾" : "▸"}</span>
            </button>

            {isOpen && (
              <div id={panelId} class={`px-4 pb-4 space-y-3 ${muted}`}>
                <p class="text-sm">{day.summary}</p>
                <HourlyStrip hours={day.hours} theme={theme} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

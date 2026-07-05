import type { HourForecast } from "../lib/types.ts";
import { formatHour } from "../lib/time.ts";
import { isLightTheme, type WeatherTheme } from "../lib/theme.ts";

interface HourlyStripProps {
  hours: HourForecast[];
  theme: WeatherTheme;
  id?: string;
}

export function HourlyStrip({ hours, theme, id }: HourlyStripProps) {
  if (hours.length === 0) return null;

  const light = isLightTheme(theme);
  const muted = light ? "text-slate-500" : "text-white/70";
  const precip = light ? "text-blue-600" : "text-cyan-200";

  return (
    <div
      id={id}
      class="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-hide"
    >
      {hours.map((hour) => (
        <div
          key={hour.time}
          class={`snap-start shrink-0 w-16 text-center rounded-2xl py-3 ${
            light ? "bg-white/60" : "bg-white/10"
          }`}
        >
          <div class={`text-sm font-medium ${muted}`}>
            {formatHour(hour.time)}
          </div>
          <div class="text-2xl my-1" aria-hidden="true">{hour.emoji}</div>
          <div class="text-base font-medium">{hour.temperature}°</div>
          <div class={`text-xs mt-1 ${precip}`}>
            ☔{hour.precipitationChance}
          </div>
        </div>
      ))}
    </div>
  );
}

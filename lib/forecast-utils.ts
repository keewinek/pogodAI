import type { DayForecast, HourForecast } from "./types.ts";

/**
 * Godziny do paska „Godzinowa”: dziś od bieżącej godziny;
 * jeśli zostało < 6 wpisów, doklej początek jutra. Maks. 24 wpisy.
 */
export function upcomingHours(
  days: DayForecast[],
  todayDate: string,
  currentHour: number,
): HourForecast[] {
  const todayIdx = days.findIndex((d) => d.date === todayDate);
  if (todayIdx === -1) return days[0]?.hours ?? [];

  const today = days[todayIdx];
  const result = today.hours.filter((h) => {
    const hour = parseInt(h.time.slice(11, 13), 10);
    return hour >= currentHour;
  });

  if (result.length < 6) {
    const tomorrow = days[todayIdx + 1];
    if (tomorrow) result.push(...tomorrow.hours.slice(0, 8));
  }
  return result.slice(0, 24);
}

/** Min/max z godzin, gdy agent nie wypełnił tempMin/tempMax. */
export function dayTemps(day: DayForecast): { min: number; max: number } {
  const hasDayRange = day.tempMax > day.tempMin ||
    (day.tempMin !== 0 && day.tempMax !== 0);
  if (hasDayRange) {
    return { min: day.tempMin, max: day.tempMax };
  }
  if (day.hours.length === 0) {
    return { min: day.tempMin, max: day.tempMax };
  }
  const temps = day.hours.map((h) => h.temperature);
  return { min: Math.min(...temps), max: Math.max(...temps) };
}

/** "2026-07-05T15:00" → "15:00" */
export function hourLabel(time: string): string {
  return time.slice(11, 16);
}

import type { DayForecast, HourForecast } from "./types.ts";
import { getCurrentWarsawHourKey } from "./time.ts";

export function getNearestHours(
  days: DayForecast[],
  minCount = 6,
): HourForecast[] {
  if (days.length === 0) return [];

  const currentKey = getCurrentWarsawHourKey();
  const todayHours = days[0].hours.filter((hour) => hour.time >= currentKey);
  const result = [...todayHours];

  if (result.length < minCount && days.length > 1) {
    const needed = minCount - result.length;
    result.push(...days[1].hours.slice(0, needed));
  }

  return result.length > 0 ? result : days[0].hours.slice(0, minCount);
}

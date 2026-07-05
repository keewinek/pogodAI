export function getCurrentWarsawHourKey(date = new Date()): string {
  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const hour = getWarsawHour(date);
  return `${datePart}T${String(hour).padStart(2, "0")}:00`;
}

export function getWarsawHour(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((now - then) / 60_000);

  if (diffMin < 1) return "przed chwilą";
  if (diffMin < 60) return `${diffMin} min temu`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h temu`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d temu`;
}

export type FreshnessLevel = "fresh" | "stale" | "old";

export function getFreshnessLevel(
  iso: string,
  now = Date.now(),
): FreshnessLevel {
  const ageMin = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (ageMin < 90) return "fresh";
  if (ageMin < 180) return "stale";
  return "old";
}

export function formatDayLabel(date: string, index: number): string {
  if (index === 0) return "Dziś";
  if (index === 1) return "Jutro";

  const label = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatHour(time: string): string {
  return time.slice(11, 13);
}

export function formatSources(sources: string[]): string {
  return sources
    .map((source) =>
      source
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split(".")[0]
        .toUpperCase()
    )
    .join(" · ");
}

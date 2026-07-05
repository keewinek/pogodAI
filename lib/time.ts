const DAY_NAMES = ["Niedz.", "Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."];

/** "2026-07-05" → data w południe UTC (stabilny dzień tygodnia niezależnie od strefy). */
function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** Nazwa dnia tygodnia po polsku; "Dziś"/"Jutro" dla dwóch pierwszych dat. */
export function dayLabel(date: string, todayDate: string): string {
  if (date === todayDate) return "Dziś";
  const d = parseDate(date);
  const today = parseDate(todayDate);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return "Jutro";
  return DAY_NAMES[d.getUTCDay()];
}

/** Dzisiejsza data "YYYY-MM-DD" w Europe/Warsaw. */
export function warsawToday(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Relatywny czas po polsku, np. "12 min temu". */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "przed chwilą";
  if (diffMin < 60) return `${diffMin} min temu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    const restMin = diffMin % 60;
    return restMin > 0 ? `${diffH} h ${restMin} min temu` : `${diffH} h temu`;
  }
  const diffD = Math.floor(diffH / 24);
  return diffD === 1 ? "wczoraj" : `${diffD} dni temu`;
}

/** Wiek danych w minutach. */
export function ageMinutes(iso: string, now = new Date()): number {
  return Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
}

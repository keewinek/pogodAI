import { ageMinutes, relativeTime } from "../lib/time.ts";

export function FreshnessFooter(
  { generatedAt, sources }: { generatedAt: string; sources: string[] },
) {
  const age = ageMinutes(generatedAt);
  let freshnessClass = "text-white/60";
  let warning: string | null = null;
  if (age > 180) {
    freshnessClass = "text-red-300";
    warning = "automatyzacja mogła się wysypać";
  } else if (age > 90) {
    freshnessClass = "text-amber-300";
    warning = "dane mogą być nieaktualne";
  }

  return (
    <footer class="pt-2 pb-8 text-center text-xs">
      <p class={freshnessClass}>
        Zaktualizowano {relativeTime(generatedAt)}
        {warning && <span>— {warning}</span>}
      </p>
      <p class="mt-1 text-white/50">
        Synteza z: {sources.join(" · ")}
      </p>
    </footer>
  );
}

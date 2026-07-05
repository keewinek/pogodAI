import { ageMinutes, relativeTime } from "../lib/time.ts";

export function FreshnessFooter(
  { generatedAt, sources }: { generatedAt: string; sources: string[] },
) {
  const age = ageMinutes(generatedAt);
  let freshnessClass = "muted";
  let warning: string | null = null;
  if (age > 180) {
    freshnessClass = "text-red-400/90";
    warning = "automatyzacja mogła się wysypać";
  } else if (age > 90) {
    freshnessClass = "text-amber-300/90";
    warning = "dane mogą być nieaktualne";
  }

  return (
    <footer class="pt-4 pb-12 text-center">
      <div class="footer-badge inline-block rounded-full px-4 py-2">
        <p class={`text-[12px] ${freshnessClass}`}>
          Zaktualizowano {relativeTime(generatedAt)}
          {warning && <span class="block mt-0.5 opacity-90">{warning}</span>}
        </p>
      </div>
      <p class="mt-3 text-[11px] muted leading-relaxed max-w-xs mx-auto px-2">
        Synteza z: {sources.slice(0, 8).join(" · ")}
        {sources.length > 8 ? ` · +${sources.length - 8}` : ""}
      </p>
    </footer>
  );
}

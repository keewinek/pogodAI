import type { Verdict } from "../lib/types.ts";

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  return (
    <section class="grouped px-5 py-4">
      <div class="verdict-accent">
        <p class="text-[17px] leading-relaxed font-medium text-white/95">
          {verdict.text}
        </p>
      </div>
      <div class="mt-4 flex items-center gap-2">
        <span class="precip-badge">
          {Math.round(verdict.precipitationChance)}% szansa opadów
        </span>
      </div>
    </section>
  );
}

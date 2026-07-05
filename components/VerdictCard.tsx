import type { Verdict } from "../lib/types.ts";

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  return (
    <section class="rounded-3xl bg-white/15 backdrop-blur border border-white/20 shadow-lg p-5">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-white/60">
        Werdykt
      </h2>
      <p class="mt-2 text-lg font-medium leading-snug">{verdict.text}</p>
      <p class="mt-3 text-sm text-white/80">
        ☔ {Math.round(verdict.precipitationChance)}% szansa opadów
      </p>
    </section>
  );
}

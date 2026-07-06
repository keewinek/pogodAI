import type { Location } from "../lib/db.ts";
import type { AccuracyStats, VerifiedPair } from "../lib/verification.ts";
import {
  formatAccuracyPl,
  LEAD_BUCKETS,
  leadBucketLabel,
  PRECIP_RAIN_THRESHOLD_MM,
  PRELIMINARY_PAIR_THRESHOLD,
  SAMPLE_HOURS_PER_FORECAST,
} from "../lib/verification.ts";
import { relativeTime } from "../lib/display.ts";
import { AccuracyFilter } from "../islands/AccuracyFilter.tsx";

interface AccuracyPageProps {
  globalStats: AccuracyStats;
  locationStats: { location: Location; stats: AccuracyStats }[];
  verifiedPairs: VerifiedPair[];
  locations: Location[];
}

export function AccuracyHeader(
  { globalStats }: { globalStats: AccuracyStats },
) {
  const hasData = globalStats.totalPairs > 0;
  const preliminary = hasData &&
    globalStats.totalPairs < PRELIMINARY_PAIR_THRESHOLD;

  return (
    <header class="accuracy-header">
      <h1 class="text-[28px] font-semibold tracking-tight">
        Sprawdzalność prognoz
      </h1>
      {hasData
        ? (
          <p class="accuracy-hero-value mt-2">
            {formatAccuracyPl(globalStats.overallAccuracy)}
            {preliminary && (
              <span class="text-[15px] font-normal muted ml-2">(wstępnie)</span>
            )}
          </p>
        )
        : (
          <p class="mt-2 text-[15px] muted">
            Zbieram dane — pierwsze wyniki pojawią się po kilku godzinach.
          </p>
        )}
      {hasData && (
        <p class="mt-1 text-[13px] muted">
          {globalStats.totalPairs} {globalStats.totalPairs === 1
            ? "para prognoza–obserwacja"
            : globalStats.totalPairs < 5
            ? "pary prognoza–obserwacja"
            : "par prognoza–obserwacja"}
          <span>· zaktualizowano {relativeTime(globalStats.updatedAt)}</span>
        </p>
      )}
    </header>
  );
}

export function AccuracyMethodology() {
  return (
    <section class="accuracy-section">
      <h2 class="section-label">Jak to liczymy</h2>
      <div class="accuracy-card text-[14px] leading-relaxed muted">
        <p>
          Przy każdej prognozie zapisujemy{" "}
          <strong class="text-white/80">
            {SAMPLE_HOURS_PER_FORECAST} losowych godzin
          </strong>{" "}
          rozłożonych stratyfikowanie po horyzoncie 0–14 dni (freeze-at-issue —
          zanim prognoza zostanie nadpisana).
        </p>
        <p class="mt-3">
          Koszyki czasowe mają rosnącą szerokość: dni 1–7 osobno, dni 8–14
          łącznie — zgodnie ze spadkiem skillu prognozy numerycznej (WMO/NWP).
        </p>
        <p class="mt-3">
          Po upływie danej godziny porównujemy z{" "}
          <a
            href="https://open-meteo.com/"
            class="underline text-white/70"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open-Meteo
          </a>{" "}
          (temperatura 2 m, opady mm/h).
        </p>
        <ul class="mt-3 space-y-2 list-disc pl-5">
          <li>
            <strong class="text-white/80">Temperatura</strong> — MAE → wynik
            {" "}
            <code class="text-[12px]">max(0, 100 − błąd°C × 10)</code>
          </li>
          <li>
            <strong class="text-white/80">Opady</strong>{" "}
            — Brier score na % szansy vs fakt (próg opadu:{" "}
            {PRECIP_RAIN_THRESHOLD_MM} mm)
          </li>
          <li>
            <strong class="text-white/80">Para</strong>{" "}
            — średnia 50/50 temp + opady
          </li>
          <li>
            <strong class="text-white/80">Globalnie</strong>{" "}
            — pooling ze wszystkich miast, nie średnia miast
          </li>
        </ul>
      </div>
    </section>
  );
}

export function AccuracyBuckets({ stats }: { stats: AccuracyStats }) {
  return (
    <section class="accuracy-section">
      <h2 class="section-label">Wg odległości prognozy</h2>
      <div class="accuracy-grid">
        {LEAD_BUCKETS.map((bucket) => {
          const b = stats.buckets[bucket];
          return (
            <div key={bucket} class="accuracy-card">
              <p class="text-[12px] muted">{leadBucketLabel(bucket)}</p>
              <p class="text-[22px] font-semibold tabular-nums mt-1">
                {b.count > 0 ? formatAccuracyPl(b.accuracy) : "—"}
              </p>
              <p class="text-[11px] muted mt-1">
                {b.count > 0
                  ? `${b.count} par · MAE ${
                    (b.tempMaeSum / b.count).toFixed(1)
                  }°`
                  : "brak danych"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AccuracyByCity(
  { locationStats }: {
    locationStats: { location: Location; stats: AccuracyStats }[];
  },
) {
  if (locationStats.length === 0) {
    return (
      <section class="accuracy-section">
        <h2 class="section-label">Wg miasta</h2>
        <p class="text-[14px] muted px-1">Brak zweryfikowanych danych.</p>
      </section>
    );
  }

  return (
    <section class="accuracy-section">
      <h2 class="section-label">Wg miasta</h2>
      <div class="accuracy-city-list">
        {locationStats.map(({ location, stats }) => (
          <div
            key={location.id}
            class="accuracy-card flex justify-between items-center"
          >
            <span class="text-[15px] font-medium">{location.name}</span>
            <div class="text-right">
              <span class="text-[17px] font-semibold tabular-nums">
                {formatAccuracyPl(stats.overallAccuracy)}
              </span>
              <p class="text-[11px] muted">{stats.totalPairs} par</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AccuracyAuditTable(
  { verifiedPairs, locations }: {
    verifiedPairs: VerifiedPair[];
    locations: Location[];
  },
) {
  if (verifiedPairs.length === 0) {
    return (
      <section class="accuracy-section">
        <h2 class="section-label">Ostatnie weryfikacje</h2>
        <p class="text-[14px] muted px-1">
          Jeszcze nie ma zweryfikowanych par. Pojawią się po pierwszej godzinie
          od wydania prognozy.
        </p>
      </section>
    );
  }

  return (
    <section class="accuracy-section">
      <h2 class="section-label">Ostatnie weryfikacje</h2>
      <AccuracyFilter
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        pairs={verifiedPairs}
      />
    </section>
  );
}

export function AccuracyPageContent(props: AccuracyPageProps) {
  return (
    <>
      <AccuracyHeader globalStats={props.globalStats} />
      <AccuracyMethodology />
      <AccuracyBuckets stats={props.globalStats} />
      <AccuracyByCity locationStats={props.locationStats} />
      <AccuracyAuditTable
        verifiedPairs={props.verifiedPairs}
        locations={props.locations}
      />
    </>
  );
}

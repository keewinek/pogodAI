import { useState } from "preact/hooks";
import type { VerifiedPair } from "../lib/verification.ts";
import {
  formatAccuracyPl,
  formatValidTime,
  leadBucketLabel,
} from "../lib/verification.ts";

interface LocationOption {
  id: string;
  name: string;
}

interface Props {
  locations: LocationOption[];
  pairs: VerifiedPair[];
}

function rainLabel(rain: boolean): string {
  return rain ? "Pada" : "Nie pada";
}

export function AccuracyFilter({ locations, pairs }: Props) {
  const [filterId, setFilterId] = useState("");

  const filtered = filterId
    ? pairs.filter((p) => p.locationId === filterId)
    : pairs;

  const locationOptions = locations.length > 0
    ? locations
    : [...new Map(pairs.map((p) => [p.locationId, {
      id: p.locationId,
      name: p.locationName,
    }])).values()];

  return (
    <div class="accuracy-audit">
      {locationOptions.length > 1 && (
        <div class="mb-3 px-1">
          <label class="text-[12px] muted block mb-1">Filtruj miasto</label>
          <select
            class="accuracy-select"
            value={filterId}
            onChange={(e) => setFilterId((e.target as HTMLSelectElement).value)}
          >
            <option value="">Wszystkie miasta</option>
            {locationOptions.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      <div class="overflow-x-auto no-scrollbar">
        <table class="accuracy-table">
          <thead>
            <tr>
              <th>Miasto</th>
              <th>Godzina</th>
              <th>Wyprzedz.</th>
              <th>Prognoza</th>
              <th>Rzeczywistość</th>
              <th>Wynik</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pair) => (
              <tr
                key={`${pair.locationId}-${pair.validTime}`}
                class="accuracy-row"
              >
                <td class="accuracy-cell">{pair.locationName}</td>
                <td class="accuracy-cell">{formatValidTime(pair.validTime)}</td>
                <td class="accuracy-cell tabular-nums">
                  {pair.leadHours} h
                  <span class="block text-[11px] muted">
                    {leadBucketLabel(pair.leadBucket)}
                  </span>
                </td>
                <td class="accuracy-cell tabular-nums">
                  {Math.round(pair.predictedTemp)}° ·{" "}
                  {pair.predictedPrecipChance}%
                  <span class="block text-[11px] muted">
                    {rainLabel(pair.predictedRain)}
                  </span>
                </td>
                <td class="accuracy-cell tabular-nums">
                  {Math.round(pair.actualTemp)}° ·{" "}
                  {pair.actualPrecipMm.toFixed(1)} mm
                  <span class="block text-[11px] muted">
                    {rainLabel(pair.actualRain)}
                  </span>
                </td>
                <td class="accuracy-cell tabular-nums font-medium">
                  {formatAccuracyPl(pair.pairScore)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p class="text-[14px] muted px-1 mt-3">
          Brak wyników dla wybranego filtra.
        </p>
      )}
    </div>
  );
}

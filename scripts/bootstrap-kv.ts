/**
 * Uzupełnia brakujące prognozy w Deno KV (predeploy na Deno Deploy).
 * Gdy lokalizacja istnieje, ale nie ma prognozy — zapisuje przykładową,
 * żeby UI nie pokazywało pustego stanu do czasu crona.
 */
import { getForecast, listLocations, setForecast } from "../lib/db.ts";
import { buildSampleForecast } from "../lib/sample-forecast.ts";

async function main() {
  const locations = await listLocations();
  if (locations.length === 0) {
    console.log("bootstrap-kv: brak lokalizacji — pomijam");
    return;
  }

  let seeded = 0;
  for (const loc of locations) {
    const existing = await getForecast(loc.id);
    if (existing) continue;
    await setForecast(buildSampleForecast(loc.id));
    seeded++;
    console.log(`bootstrap-kv: przykładowa prognoza → ${loc.id}`);
  }

  if (seeded === 0) {
    console.log("bootstrap-kv: wszystkie lokalizacje mają prognozę");
  } else {
    console.log(`bootstrap-kv: zapisano ${seeded} prognoz(y)`);
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("bootstrap-kv:", e);
    Deno.exit(1);
  });
}

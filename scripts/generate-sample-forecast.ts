/**
 * Generuje przykładowy obiekt Forecast (na dziś + 6 kolejnych dni)
 * do testowania POST /api/forecast.
 *
 * Użycie: deno run -A scripts/generate-sample-forecast.ts [locationId]
 */
import { buildSampleForecast } from "../lib/sample-forecast.ts";

const locationId = Deno.args[0] ?? "warszawa-bialoleka";
console.log(JSON.stringify(buildSampleForecast(locationId), null, 2));

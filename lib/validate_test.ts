import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { validateForecast, validateNewLocation } from "./validate.ts";

Deno.test("validateNewLocation accepts valid input", () => {
  const r = validateNewLocation({ name: "Kraków", lat: 50.06, lon: 19.94 });
  assertEquals(r.ok, true);
});

Deno.test("validateNewLocation rejects empty name", () => {
  const r = validateNewLocation({ name: "  ", lat: 50, lon: 19 });
  assertEquals(r.ok, false);
});

Deno.test("validateForecast rejects missing locationId", () => {
  const r = validateForecast({ generatedAt: new Date().toISOString() });
  assertEquals(r.ok, false);
});

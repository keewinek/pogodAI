import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { weatherCodeToEmoji } from "./weather-code.ts";

Deno.test("weatherCodeToEmoji maps WMO codes", () => {
  assertEquals(weatherCodeToEmoji(0), "☀️");
  assertEquals(weatherCodeToEmoji(61), "🌧️");
  assertEquals(weatherCodeToEmoji(95), "⛈️");
});

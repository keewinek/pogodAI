import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { slugify } from "./slug.ts";

Deno.test("slugify normalizes Polish diacritics", () => {
  assertEquals(slugify("Białołęka, Warszawa"), "bialoleka-warszawa");
});

Deno.test("slugify trims dashes", () => {
  assertEquals(slugify("  Zakopane  "), "zakopane");
});

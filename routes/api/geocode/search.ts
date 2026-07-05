import { define } from "@/utils.ts";
import { searchPlaces } from "@/lib/geocode.ts";
import { errorJson, json } from "@/lib/http.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const q = ctx.url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return errorJson("Parametr q musi mieć co najmniej 2 znaki.", 400);
    }
    if (q.length > 80) {
      return errorJson("Zapytanie jest za długie.", 400);
    }

    try {
      const results = await searchPlaces(q);
      return json({ results });
    } catch {
      return errorJson("Nie udało się wyszukać lokalizacji.", 502);
    }
  },
});

import { define } from "@/utils.ts";
import { reversePlace, searchPlaces } from "@/lib/geocode.ts";
import { errorJson, json } from "@/lib/db.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const lat = ctx.url.searchParams.get("lat");
    const lon = ctx.url.searchParams.get("lon");

    if (lat !== null && lon !== null) {
      const latN = parseFloat(lat);
      const lonN = parseFloat(lon);
      if (!Number.isFinite(latN) || !Number.isFinite(lonN)) {
        return errorJson("Parametry lat i lon muszą być liczbami.", 400);
      }
      if (latN < -90 || latN > 90 || lonN < -180 || lonN > 180) {
        return errorJson("Współrzędne poza zakresem.", 400);
      }
      try {
        const place = await reversePlace(latN, lonN);
        if (!place) {
          return errorJson("Nie udało się rozpoznać lokalizacji.", 404);
        }
        return json({ place });
      } catch {
        return errorJson("Nie udało się rozpoznać lokalizacji.", 502);
      }
    }

    const q = ctx.url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return errorJson("Parametr q musi mieć co najmniej 2 znaki.", 400);
    }
    if (q.length > 80) {
      return errorJson("Zapytanie jest za długie.", 400);
    }
    try {
      return json({ results: await searchPlaces(q) });
    } catch {
      return errorJson("Nie udało się wyszukać lokalizacji.", 502);
    }
  },
});

import { define } from "@/utils.ts";
import { errorJson, json } from "@/lib/db.ts";
import { reversePlace, searchPlaces } from "@/lib/geocode.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");

    if (lat !== null && lon !== null) {
      const latN = Number(lat);
      const lonN = Number(lon);
      if (
        !Number.isFinite(latN) || !Number.isFinite(lonN) ||
        latN < -90 || latN > 90 || lonN < -180 || lonN > 180
      ) {
        return errorJson("Nieprawidłowe współrzędne.", 400);
      }
      try {
        const place = await reversePlace(latN, lonN);
        if (!place) {
          return errorJson("Nie udało się rozpoznać miejsca.", 404);
        }
        return json({ results: [place] });
      } catch {
        return errorJson("Błąd wyszukiwania lokalizacji.", 502);
      }
    }

    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return json({ results: [] });
    }

    try {
      const results = await searchPlaces(q);
      return json({ results });
    } catch {
      return errorJson("Błąd wyszukiwania lokalizacji.", 502);
    }
  },
});

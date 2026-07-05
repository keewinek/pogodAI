import { define } from "@/utils.ts";
import { reversePlace } from "@/lib/geocode.ts";
import { errorJson, json } from "@/lib/http.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const latRaw = ctx.url.searchParams.get("lat");
    const lonRaw = ctx.url.searchParams.get("lon");
    const lat = latRaw === null ? NaN : Number(latRaw);
    const lon = lonRaw === null ? NaN : Number(lonRaw);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return errorJson("Parametr lat musi być liczbą w zakresie -90..90.", 400);
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      return errorJson(
        "Parametr lon musi być liczbą w zakresie -180..180.",
        400,
      );
    }

    try {
      const place = await reversePlace(lat, lon);
      if (!place) {
        return errorJson("Nie znaleziono nazwy dla tych współrzędnych.", 404);
      }
      return json({ place });
    } catch {
      return errorJson("Nie udało się ustalić nazwy lokalizacji.", 502);
    }
  },
});

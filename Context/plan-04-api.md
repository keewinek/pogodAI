# PogodAI — Plan API

REST API w Fresh 2 (`routes/api/`), JSON, UTF-8. Wszystkie odpowiedzi z
`Content-Type: application/json`.

## 1. Zestawienie endpointów

| Metoda | Ścieżka                     | Autoryzacja             | Opis                                 |
| ------ | --------------------------- | ----------------------- | ------------------------------------ |
| GET    | `/api/locations`            | —                       | Lista lokalizacji                    |
| POST   | `/api/locations`            | —                       | Dodaj lokalizację                    |
| DELETE | `/api/locations/:id`        | —                       | Usuń lokalizację (+ jej prognozę)    |
| GET    | `/api/forecast/:locationId` | —                       | Najnowsza prognoza dla lokalizacji   |
| POST   | `/api/forecast`             | Bearer `POGODAI_SECRET` | Zapis prognozy (tylko automatyzacja) |
| GET    | `/api/health`               | —                       | Status systemu                       |

Pliki tras:

```
routes/api/locations/index.ts     → GET + POST /api/locations
routes/api/locations/[id].ts      → DELETE /api/locations/:id
routes/api/forecast/index.ts      → POST /api/forecast
routes/api/forecast/[id].ts       → GET /api/forecast/:locationId
routes/api/health.ts              → GET /api/health
```

(Usunąć demo `routes/api/[name].tsx` ze scaffoldu.)

## 2. Specyfikacja

### 2.1 `GET /api/locations`

**200:**

```json
{
  "locations": [
    {
      "id": "warszawa-bialoleka",
      "name": "Białołęka, Warszawa",
      "lat": 52.32,
      "lon": 20.97,
      "createdAt": "2026-07-05T18:00:00Z"
    }
  ]
}
```

### 2.2 `POST /api/locations`

**Body:**

```json
{ "name": "Zakopane", "lat": 49.30, "lon": 19.95 }
```

- `id` generowane serwerowo: slug z `name` (małe litery, bez diakrytyków,
  spacje→`-`).
- Walidacja: `name` niepusty ≤ 60 znaków; `lat` ∈ [-90, 90]; `lon` ∈ [-180,
  180]; unikalność `id`.

**201:** obiekt utworzonej lokalizacji. **400:**
`{ "error": "opis po polsku" }`. **409:** lokalizacja o tym id już istnieje.

### 2.3 `DELETE /api/locations/:id`

- Usuwa wpis z listy `["locations"]` **oraz** klucz `["forecast", id]` (atomowo,
  `kv.atomic()`).
- **200:** `{ "ok": true }`. **404:** nie znaleziono.

### 2.4 `GET /api/forecast/:locationId`

**200:** pełny obiekt `Forecast` (schemat: `plan-00-przeglad.md` §5).

**404:** `{ "error": "Brak prognozy dla tej lokalizacji" }` — frontend pokazuje
stan "czekam na pierwszą prognozę".

Nagłówek `Cache-Control: no-store` (dane zmieniają się co godzinę, strona i tak
jest SSR; nie komplikujemy cache'owaniem).

### 2.5 `POST /api/forecast` (dla Cursor Automation)

**Nagłówki:**

```
Authorization: Bearer <POGODAI_SECRET>
Content-Type: application/json
```

**Body:** pełny obiekt `Forecast`:

```json
{
  "locationId": "warszawa-bialoleka",
  "generatedAt": "2026-07-05T19:00:00Z",
  "sources": ["tvn", "interia", "google", "icm"],
  "verdict": {
    "text": "Po południu rozpada się na dobre — weź parasol.",
    "emoji": "🌧️",
    "temperature": 14,
    "feelsLike": 12,
    "precipitationChance": 70,
    "windKmh": 18
  },
  "days": [
    {
      "date": "2026-07-05",
      "summary": "Deszczowo od 15:00.",
      "emoji": "🌧️",
      "tempMin": 9,
      "tempMax": 15,
      "precipitationChance": 70,
      "windKmh": 18,
      "hours": [
        {
          "time": "2026-07-05T15:00",
          "emoji": "🌧️",
          "temperature": 14,
          "precipitationChance": 70,
          "windKmh": 18
        },
        {
          "time": "2026-07-05T16:00",
          "emoji": "🌧️",
          "temperature": 13,
          "precipitationChance": 60,
          "windKmh": 16
        }
      ]
    }
  ]
}
```

Walidacja serwerowa:

- autoryzacja → w razie braku/błędu **401** (bez szczegółów),
- `locationId` musi istnieć na liście lokalizacji → inaczej **404**,
- `days`: 1–8 elementów; liczby w sensownych zakresach (temp -60..60, opady
  0..100, wiatr 0..300),
- `days[i].hours`: 1–24 elementów, `time` w formacie `YYYY-MM-DDTHH:00`, te same
  zakresy liczb (dziś i jutro co 1 h = 24 wpisy, dni 3+ co 3 h = 8 wpisów),
- `verdict.text` niepusty, ≤ 300 znaków,
- łączny rozmiar body ≤ 60 KiB (limit wartości Deno KV to 64 KiB).

**200:** `{ "ok": true }` — wpis `["forecast", locationId]` nadpisany.

### 2.6 `GET /api/health`

**200:**

```json
{
  "ok": true,
  "locations": 2,
  "forecasts": 2,
  "newestForecastAt": "2026-07-05T19:00:00Z"
}
```

## 3. Warstwa wspólna

- **`utils.ts` / `lib/db.ts`:** `getKv()`, `listLocations()`, `addLocation()`,
  `deleteLocation()`, `getForecast(id)`, `setForecast(f)` — jedyne miejsce
  dotykające KV; trasy i strony SSR używają tych funkcji (strona główna czyta KV
  bezpośrednio przez tę warstwę, nie przez fetch własnego API).
- **`lib/types.ts`:** interfejsy `Location`, `Forecast`, `DayForecast`,
  `HourForecast` (współdzielone przez API, SSR i islands).
- **`lib/auth.ts`:** `requireBearer(req): boolean` — porównanie stałoczasowe z
  `POGODAI_SECRET`.
- **Walidacja:** ręczne funkcje strażników typów (bez Zod — trzymamy zależności
  na zerze, walidowane pola są proste).
- **Błędy:** zawsze `{ "error": string }` po polsku + właściwy status HTTP.

## 4. Konwencje

- Czas: zawsze ISO 8601 UTC; formatowanie do czasu lokalnego (Europe/Warsaw)
  tylko na frontendzie.
- Jednostki: °C, km/h, % — na sztywno (aplikacja polska, bez przełącznika
  jednostek).
- Brak wersjonowania API (`/v1/…`) — jedyny klient (automatyzacja + własny
  frontend) jest pod naszą kontrolą.

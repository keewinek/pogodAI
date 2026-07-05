# PogodAI — Plan ogólny aplikacji

> Dokument nadrzędny. Szczegóły w pozostałych plikach `plan-*.md` w tym
> folderze.

## 1. Cel

Osobisty, hiperlokalny system prognozowania pogody. Zamiast jednego, często
niedokładnego źródła — agregacja danych z wielu serwisów pogodowych (TVN Meteo,
Interia Pogoda, Google Weather, ICM/meteo.pl itp.) i synteza przez model AI w
jeden, "ostateczny werdykt" dla wybranej lokalizacji.

## 2. Kluczowe decyzje projektowe (ustalone)

| Obszar             | Decyzja                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework          | **Fresh 2** (Deno + Vite + Preact islands + Tailwind) — istniejący scaffold w repo                                                                                                                                                                                       |
| Baza danych        | **Deno KV** — tylko najnowsza prognoza per lokalizacja (bez historii)                                                                                                                                                                                                    |
| Zakres prognozy    | Werdykt na dziś + prognoza wielodniowa (5–7 dni) + **prognoza godzinowa per dzień** (dziś i jutro co 1 h, dalsze dni co 3 h)                                                                                                                                             |
| Routing            | `/` = panel wyboru lokalizacji (lub redirect wg `localStorage`); `/[lokalizacja]` = strona prognozy                                                                                                                                                                      |
| Edycja lokalizacji | Bez autoryzacji (strona prywatna, nieindeksowana)                                                                                                                                                                                                                        |
| AI                 | Agent w **Cursor Cloud Automations** (cron co godzinę), bez płatnych API zewnętrznych                                                                                                                                                                                    |
| Źródła             | 3 warstwy: rdzeń (Open-Meteo multi-model, YR.no, Google, IMGW) + pula rotacyjna ~12 serwisów (TVN, Interia, Onet, WP, AccuWeather…) + 0–2 źródła dobierane dynamicznie przez agenta z wyników wyszukiwania; łącznie 6–10 źródeł na lokalizację (szczegóły: `plan-05` §4) |
| Scraping           | Przez `https://r.jina.ai/<URL>` — czysty Markdown, omija Cloudflare/RODO, oszczędza tokeny                                                                                                                                                                               |
| Hosting            | **Deno Deploy** (frontend + API + KV w jednym projekcie)                                                                                                                                                                                                                 |

## 3. Architektura — big picture

```
┌────────────────────────────────────────────────────────┐
│  Cursor Cloud Automation (cron, co godzinę)             │
│                                                          │
│  1. GET https://<app>.deno.dev/api/locations             │
│  2. Dla każdej lokalizacji:                              │
│     - pobierz źródła przez r.jina.ai (Markdown)          │
│     - agent AI syntetyzuje JSON prognozy                 │
│  3. POST https://<app>.deno.dev/api/forecast             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│  Deno Deploy — projekt Fresh 2 (to repo)                 │
│                                                          │
│  routes/api/*  ── REST API (JSON)                        │
│  routes/*      ── SSR stron (Preact)                     │
│  islands/*     ── interaktywne wyspy (wybór lokalizacji, │
│                   edycja listy lokalizacji)              │
│  Deno KV       ── prognozy + lista lokalizacji           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                ┌──────▼──────┐
                │ Przeglądarka │  (mobilna web-app, PWA-like)
                └─────────────┘
```

## 4. Komponenty

1. **Agregator/Analityk** — Cursor Cloud Automation (cron). Szczegóły:
   `plan-05-automatyzacja-agent.md`.
2. **Backend/API** — endpointy Fresh w `routes/api/`. Szczegóły:
   `plan-04-api.md`.
3. **Frontend** — strona główna jak nowoczesna aplikacja pogodowa + edycja
   lokalizacji. Szczegóły: `plan-01-ui.md`, `plan-02-ux.md`.
4. **Infrastruktura/serwery** — Deno Deploy, KV, domeny. Szczegóły:
   `plan-03-infrastruktura-serwery.md`.

## 5. Model danych (Deno KV)

### Klucze

| Klucz KV                   | Wartość      | Opis                                             |
| -------------------------- | ------------ | ------------------------------------------------ |
| `["locations"]`            | `Location[]` | Lista lokalizacji (edytowalna z frontendu)       |
| `["forecast", locationId]` | `Forecast`   | Najnowsza prognoza dla lokalizacji (nadpisywana) |

### Typy (TypeScript)

```ts
interface Location {
  id: string; // slug, np. "warszawa-bialoleka"
  name: string; // "Białołęka, Warszawa"
  lat: number;
  lon: number;
  createdAt: string; // ISO 8601
}

interface Forecast {
  locationId: string;
  generatedAt: string; // ISO 8601 — kiedy agent wygenerował
  sources: string[]; // np. ["tvn", "interia", "google", "icm"]
  verdict: {
    text: string; // krótki werdykt, np. "Chłodno i deszczowo po południu — weź parasol."
    emoji: string; // np. "🌧️"
    temperature: number; // aktualna/dominująca temp. °C
    feelsLike: number;
    precipitationChance: number; // 0–100 %
    windKmh: number;
  };
  days: DayForecast[]; // 5–7 dni, [0] = dziś
}

interface DayForecast {
  date: string; // "2026-07-05"
  summary: string; // 1 zdanie
  emoji: string;
  tempMin: number;
  tempMax: number;
  precipitationChance: number; // 0–100 %
  windKmh: number;
  hours: HourForecast[]; // dziś+jutro co 1 h (24 wpisy), dni 3+ co 3 h (8 wpisów)
}

interface HourForecast {
  time: string; // "2026-07-05T15:00" — czas lokalny Europe/Warsaw
  emoji: string;
  temperature: number; // °C
  precipitationChance: number; // 0–100 %
  windKmh: number;
}
```

Uwaga: przechowujemy **tylko najnowszą** prognozę — POST nadpisuje wpis
`["forecast", locationId]`. Rozmiar: 7 dni z godzinami to ~10–15 KiB JSON —
mieści się w limicie 64 KiB wartości KV.

## 6. Fazy realizacji

### Faza 1 — MVP backend

- [ ] Typy współdzielone (`utils.ts` lub `types.ts`)
- [ ] Helper KV (otwarcie bazy, seed domyślnej lokalizacji Białołęka)
- [ ] `POST /api/forecast`
- [ ] `GET /api/forecast/:locationId`
- [ ] `GET /api/locations`

### Faza 2 — MVP frontend

- [ ] `/` — panel "Wybierz lokalizację" + island przekierowujący do
      `/[lokalizacja]` gdy zapis w `localStorage`
- [ ] `/[lokalizacja]` — strona prognozy (SSR): werdykt + pasek godzinowy
      "dziś" + lista dni
- [ ] Rozwijane wiersze dni (akordeon) z prognozą godzinową danego dnia
- [ ] Island wyboru lokalizacji (zapis w `localStorage`, nawigacja do
      `/[lokalizacja]`)
- [ ] Stylizacja mobile-first (Tailwind), wygląd nowoczesnej aplikacji pogodowej

### Faza 3 — Automatyzacja

- [ ] Prompt/skrypt dla Cursor Cloud Automation (cron co godzinę)
- [ ] Test end-to-end: automation → POST → KV → strona

### Faza 4 — Zarządzanie lokalizacjami

- [ ] `POST /api/locations`, `DELETE /api/locations/:id`
- [ ] Strona/island edycji listy lokalizacji (dodawanie, usuwanie)

### Faza 5 — Szlif

- [ ] Stany puste/błędów ("prognoza jeszcze się nie wygenerowała")
- [ ] Wskaźnik świeżości danych ("zaktualizowano 12 min temu")
- [ ] Meta tagi, favicon, manifest PWA (opcjonalnie)

## 7. Zasady (z idea.md)

- Jedna, prawdziwa prognoza po syntezie wielu źródeł.
- Bez płatnych API zewnętrznych — moc modelu w ramach subskrypcji Cursora.
- Kod lekki i wydajny; minimalizacja tokenów (Jina Reader → Markdown).
- Werdykt: krótki, konkretny, zrozumiały.

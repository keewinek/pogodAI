# PogodAI 🌦️

Najdokładniejsza pogoda pod słońcem. Osobisty, hiperlokalny system prognozowania
pogody: agent AI (Cursor Cloud Automations) co godzinę agreguje dane z wielu
serwisów i modeli pogodowych, a następnie syntetyzuje jedną, "ostateczną"
prognozę z werdyktem po polsku.

Prod: **https://pogodai.keewinek.deno.net/**

## Architektura

- **Frontend + API:** Fresh 2 (Deno + Vite + Preact islands + Tailwind) na Deno
  Deploy, dane w Deno KV.
- **Agregator:** Cursor Cloud Automation (cron co godzinę) — prompt w
  `automation/PROMPT.md`. Scraping przez `r.jina.ai`, twarde liczby z Open-Meteo
  (multi-model) i YR.no.

Szczegółowe plany w folderze `Context/`.

## API

| Metoda | Ścieżka                     | Autoryzacja | Opis                               |
| ------ | --------------------------- | ----------- | ---------------------------------- |
| GET    | `/api/locations`            | —           | Lista lokalizacji                  |
| POST   | `/api/locations`            | —           | Dodaj lokalizację                  |
| DELETE | `/api/locations/:id`        | —           | Usuń lokalizację (+ jej prognozę)  |
| GET    | `/api/forecast/:locationId` | —           | Najnowsza prognoza dla lokalizacji |
| POST   | `/api/forecast`             | —           | Zapis prognozy (automatyzacja)     |
| GET    | `/api/health`               | —           | Status systemu                     |
| GET    | `/api/geocode/search?q=`    | —           | Autocomplete miejscowości (PL)     |
| GET    | `/api/geocode/reverse`      | —           | Reverse geocoding (GPS → nazwa)    |

## Development

Wymagany [Deno](https://docs.deno.com/runtime/getting_started/installation).

```bash
deno task dev          # dev server (Vite)
deno task check        # fmt + lint + typy + testy
deno task build        # build produkcyjny
deno task start        # serwuj build (port 8000)
```

Test end-to-end z przykładową prognozą:

```bash
./scripts/seed-forecast.sh http://localhost:8000 warszawa-bialoleka
./scripts/seed-forecast.sh https://pogodai.keewinek.deno.net/   # prod
```

## Deploy

Push na `main` → automatyczny deploy na Deno Deploy (konfiguracja w `deno.json`
→ `deploy`).

### Odświeżanie prognoz (co godzinę)

| Mechanizm             | Opis                                                                            |
| --------------------- | ------------------------------------------------------------------------------- |
| **Cursor Automation** | Główny: deep research AI — `automation/PROMPT.md`, cron `0 * * * *`             |
| **GitHub Actions**    | Fallback: `.github/workflows/update-forecasts.yml` — Open-Meteo + Jina, bez LLM |
| **Ręcznie**           | `deno task update-forecasts` (env `POGODAI_API`, domyślnie prod)                |

```bash
deno task update-forecasts
POGODAI_API=http://localhost:8000 deno task update-forecasts
```

### Aktualizacja prognoz (co godzinę)

| Metoda                | Opis                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **GitHub Actions**    | `.github/workflows/update-forecasts.yml` — cron co godzinę, Open-Meteo + Jina → POST prod |
| **Lokalnie**          | `deno task update-forecasts` (env `POGODAI_API`, domyślnie prod)                          |
| **Cursor Automation** | `automation/PROMPT.md` — deep research AI (gdy działa UI)                                 |
| **Smoke test**        | `./scripts/seed-forecast.sh` — przykładowe dane                                           |

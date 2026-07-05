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

## Development

Wymagany [Deno](https://docs.deno.com/runtime/getting_started/installation).

```bash
deno task dev          # dev server (Vite)
deno task build        # build produkcyjny
deno task start        # serwuj build (port 8000)
```

Test end-to-end z przykładową prognozą:

```bash
./scripts/seed-forecast.sh http://localhost:8000 warszawa-bialoleka
```

## Deploy

Push na `main` → automatyczny deploy na Deno Deploy (konfiguracja w `deno.json`
→ `deploy`).

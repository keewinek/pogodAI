# PogodAI — kontekst projektu

Osobista, hiperlokalna pogoda: **Cursor Cloud Automation** co godzinę zbiera
dane z wielu źródeł, składa JSON i zapisuje przez `POST /api/forecast`.
Aplikacja (Fresh + Deno KV) tylko wyświetla wynik.

## Architektura

```
Cursor Automation (cron) → POST /api/forecast → Deno KV → Fresh (SSR)
```

## API

| Metoda | Ścieżka                     |
| ------ | --------------------------- |
| GET    | `/api/locations`            |
| POST   | `/api/locations`            |
| DELETE | `/api/locations/:id`        |
| GET    | `/api/forecast/:locationId` |
| POST   | `/api/forecast`             |
| GET    | `/api/health`               |

## Strony

- `/` — wybór lokalizacji (redirect z `localStorage`)
- `/[lokalizacja]` — prognoza
- `/lokalizacje` — dodaj/usuń lokalizacje (nazwa + lat + lon)

## Automatyzacja

Prompt: `automation/PROMPT.md` (cron `0 * * * *`).

## Infrastruktura

- Deno Deploy + Deno KV (baza przypisana do aplikacji w panelu)
- Brak auth, brak płatnych API — scraping przez `r.jina.ai`
- Deploy: push na `main`

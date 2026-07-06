# PogodAI 🌦️

Hiperlokalna prognoza pogody. **Cursor Cloud Automation** co godzinę zbiera dane
z wielu źródeł, składa JSON i zapisuje go przez `POST /api/forecast`. Frontend
czyta prognozę z Deno KV.

Prod: **https://pogodai.keewinek.deno.net/**

## Architektura

```
Cursor Automation (cron) → POST /api/forecast → Deno KV → Fresh (SSR + islands)
```

- Prompt automatyzacji: `automation/PROMPT.md`
- Plany: folder `Context/`

## API

| Metoda | Ścieżka                     | Opis                            |
| ------ | --------------------------- | ------------------------------- |
| GET    | `/api/locations`            | Lista lokalizacji               |
| POST   | `/api/locations`            | Dodaj lokalizację               |
| DELETE | `/api/locations/:id`        | Usuń lokalizację (+ prognozę)   |
| GET    | `/api/forecast/:locationId` | Prognoza dla lokalizacji        |
| POST   | `/api/forecast`             | Zapis prognozy (automatyzacja)  |
| GET    | `/api/health`               | Status KV i liczba prognoz      |
| GET    | `/api/geocode/search?q=`    | Autocomplete miejscowości (PL)  |
| GET    | `/api/geocode/reverse`      | Reverse geocoding (GPS → nazwa) |

## Development

```bash
deno task dev      # dev server
deno task check    # fmt + lint + typy + testy
deno task build    # build produkcyjny
deno task start    # serwuj build (port 8000)
```

## Deploy

Push na `main` → Deno Deploy (`deno.json` → `deploy`).

**Deno KV:** w panelu Deno Deploy → Databases → Provision Deno KV → Assign do
aplikacji `pogodai`. `/api/health` powinno zwracać `"kv": true`.

**Prognozy:** tylko Cursor Automation (`automation/PROMPT.md`, cron
`0 * * * *`).

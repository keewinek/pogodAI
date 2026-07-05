# PogodAI

Najdokładniejsza pogoda pod słońcem — hiperlokalny werdykt AI po syntezie wielu
źródeł.

## Lokalnie

```bash
cp .env.example .env   # ustaw POGODAI_SECRET
deno task dev
```

## Produkcja (Deno Deploy)

1. [dash.deno.com](https://dash.deno.com) → New Project → GitHub → `pogodAI`
2. **App directory:** zostaw puste (katalog główny repo) — `deno.json` musi być
   w rootcie
3. Framework preset: **Fresh** (wykrywany z `deno.json` → `deploy.framework`)
4. Env var: `POGODAI_SECRET` (`openssl rand -hex 32`)
5. Push na `main` = deploy produkcyjny

Jeśli build pada z `couldn't find deno.json` → w Settings → App configuration
ustaw **App directory** na `.` (pusty root repo).

### Seed prognozy (test)

```bash
POGODAI_SECRET=twoj-sekret ./scripts/seed-forecast.sh https://TWOJ-URL.deno.dev
```

## Automatyzacja

Prompt dla Cursor Cloud Automation:
[`automation/PROMPT.md`](automation/PROMPT.md)\
Cron: `0 * * * *`

## Stack

Fresh 2 · Deno · Deno KV · Tailwind · Preact islands

# PogodAI — Cursor Cloud Automation

Konfiguracja:

- **Nazwa:** PogodAI — aktualizacja prognoz
- **Harmonogram:** cron `0 * * * *` (co godzinę)
- **Repo:** `keewinek/pogodAI` (branch `main`) — agent uruchamia skrypt z
  repozytorium
- **Bez LLM do prognozy** — całość robi `scripts/update-forecasts.ts` (fetch +
  reguły + POST)

## Prompt do wklejenia w automatyzację

```
Uruchom aktualizację prognoz PogodAI. Nie składaj JSON ręcznie i nie czytaj stron pogodowych tokenami.

1. Wykonaj: deno run -A scripts/update-forecasts.ts
2. Jeśli skrypt zakończy się błędem (exit ≠ 0), napraw wyłącznie pliki w scripts/ lub lib/ i uruchom ponownie raz.
3. Nie pobieraj źródeł ręcznie, nie generuj werdyktu — skrypt robi fetch (Open-Meteo, YR.no, Jina), reguły PL i POST /api/forecast.
4. Podsumuj: ile lokalizacji zapisano OK, ile pominięto / błąd HTTP.

Opcjonalnie inny host API: POGODAI_API=https://pogodai.keewinek.deno.net deno run -A scripts/update-forecasts.ts
```

## Co robi skrypt (bez AI)

| Krok                           | Jak                                                           |
| ------------------------------ | ------------------------------------------------------------- |
| Lokalizacje                    | GET /api/locations                                            |
| Liczby (godziny, dni, werdykt) | Open-Meteo multi-model — mediana 3 modeli                     |
| Źródło YR.no                   | GET API (tylko obecność w `sources`)                          |
| ~28 portali redakcyjnych       | r.jina.ai równolegle (curl/fetch) — sukces → wpis w `sources` |
| Werdykt po polsku              | Reguły w lib/verdict-rules.ts                                 |
| Zapis                          | POST /api/forecast (JSON z Deno)                              |

Test lokalny: `deno task update-forecasts`

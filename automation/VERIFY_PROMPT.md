# Weryfikacja sprawdzalności prognoz

## Cel

Co godzinę (15 min po pełnej) uruchom weryfikację prognoz — porównanie
zarchiwizowanych prognoz z obserwacjami Open-Meteo.

## Harmonogram

- **Cron:** `15 * * * *` (15 minut po każdej godzinie)

## Kroki

1. Wywołaj endpoint weryfikacji:

```bash
curl -X POST https://pogodai.deno.dev/api/verification/run
```

(lub odpowiedni URL produkcyjny / lokalny
`http://localhost:8000/api/verification/run`)

2. Sprawdź odpowiedź JSON:
   - `verified` — ile par zweryfikowano w tej rundzie
   - `skipped` — ile pominięto (brak obserwacji)
   - `staleRemoved` — ile przeterminowanych pending usunięto
   - `globalAccuracy` — aktualna globalna sprawdzalność
   - `errors` — ewentualne błędy Open-Meteo

3. Jeśli `errors` nie jest puste — nie panikuj, spróbuj ponownie za godzinę.

4. Opcjonalnie sprawdź health:

```bash
curl https://pogodai.deno.dev/api/health
```

## Uwagi

- Weryfikacja wymaga, żeby wcześniej automation prognozy
  (`automation/PROMPT.md`) wysłała POST `/api/forecast` — wtedy zapisują się
  pending samples.
- Pierwsze wyniki pojawiają się ~7+ godzin po pierwszej prognozie (min. lead 6h
  - 1h na obserwację).
- Nie modyfikuj danych w KV ręcznie.

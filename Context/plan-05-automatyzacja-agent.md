# PogodAI — Plan automatyzacji (Cursor Cloud Automation + agent AI)

## 1. Rola

Serce systemu: co godzinę agent AI pobiera prognozy z wielu źródeł, syntetyzuje "jedną prawdziwą prognozę" i wysyła ją do API na Deno Deploy. Bez płatnych API — cała inteligencja to model dostępny w subskrypcji Cursora.

## 2. Konfiguracja automatyzacji

| Parametr | Wartość |
|---|---|
| Nazwa | PogodAI — aktualizacja prognoz |
| Harmonogram | cron `0 * * * *` (co godzinę) |
| Dostęp do repo | niepotrzebny (agent działa wyłącznie na HTTP) |
| Sekrety | `POGODAI_SECRET` w konfiguracji automatyzacji |

## 3. Przepływ agenta (krok po kroku)

```
1. GET https://pogodai.deno.dev/api/locations
   → lista lokalizacji do obsłużenia

2. DLA KAŻDEJ lokalizacji:
   a) Pobierz źródła przez Jina Reader (czysty Markdown):
      curl -s "https://r.jina.ai/https://<url-źródła>"
   b) Przeczytaj/przeanalizuj Markdown każdego źródła.
   c) Syntetyzuj JEDEN obiekt Forecast (JSON) wg schematu.
   d) Wyślij:
      curl -s -X POST https://pogodai.deno.dev/api/forecast \
        -H "Authorization: Bearer $POGODAI_SECRET" \
        -H "Content-Type: application/json" \
        -d '<JSON>'
   e) Sprawdź odpowiedź; przy błędzie — jedna ponowna próba.

3. Podsumuj przebieg (ile lokalizacji OK / błędy).
```

## 4. Źródła danych

Adresy budowane z `lat`/`lon` lub nazwy lokalizacji. Zestaw startowy (3–4 źródła — kompromis między jakością syntezy a tokenami):

| Źródło | Typ | Jak adresować |
|---|---|---|
| TVN Meteo | serwis redakcyjny | wyszukanie/URL miasta, np. `tvnmeteo.tvn24.pl/pogoda/...` |
| Interia Pogoda | serwis redakcyjny | `pogoda.interia.pl/prognoza-szczegolowa-...` |
| Google Weather | agregator | `google.com/search?q=pogoda+<miasto>` przez Jina |
| Open-Meteo | modele numeryczne (GFS/ICON/ECMWF) | `api.open-meteo.com/v1/forecast?latitude=..&longitude=..&daily=..` — darmowe API bez klucza, JSON wprost (nie wymaga Jina) |

Uwagi:
- **Open-Meteo** to darmowe, bezkluczowe API dające dane z kilku modeli matematycznych naraz — idealnie realizuje wymóg "wiele modeli matematycznych" z idea.md i jest najstabilniejszym źródłem (czysty JSON). Redakcyjne serwisy dają lokalny kontekst, Open-Meteo daje twarde liczby.
- Dokładne URL-e per lokalizacja najlepiej trzymać jako szablony w prompcie automatyzacji; jeśli URL serwisu redakcyjnego nie istnieje dla danej miejscowości, agent pomija to źródło (odnotowuje w `sources` tylko faktycznie użyte).
- Ostrożnie z liczbą źródeł × liczbą lokalizacji — każde źródło to tokeny. Limit: ≤ 4 źródła na lokalizację.

## 5. Prompt automatyzacji (szkic do wklejenia w Cursor Automations)

```
Jesteś agentem PogodAI. Twoje zadanie: zaktualizować prognozy pogody.

KROKI:
1. Pobierz listę lokalizacji: curl -s https://pogodai.deno.dev/api/locations
2. Dla każdej lokalizacji zbierz dane pogodowe:
   - Open-Meteo: curl -s "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&timezone=Europe%2FWarsaw&forecast_days=7"
   - TVN Meteo i Interia: pobierz przez https://r.jina.ai/<pełny-url> (czysty Markdown)
   - Google: curl -s "https://r.jina.ai/https://www.google.com/search?q=pogoda+{nazwa}"
   Jeśli któreś źródło zawiedzie — pomiń je i pracuj na pozostałych.
3. SYNTEZA: porównaj źródła i wyciągnij jeden werdykt. Gdy źródła się
   różnią, preferuj konsensus; rozbieżności zaznacz w tekście werdyktu.
   Werdykt: max 2 zdania, po polsku, z konkretną radą (np. "weź parasol").
4. Zbuduj JSON zgodny ze schematem (poniżej) i wyślij:
   curl -s -X POST https://pogodai.deno.dev/api/forecast \
     -H "Authorization: Bearer $POGODAI_SECRET" \
     -H "Content-Type: application/json" \
     -d '<json>'
5. Zweryfikuj odpowiedź {"ok":true}. Przy błędzie popraw JSON i ponów raz.

SCHEMAT JSON:
{
  "locationId": "<id z /api/locations>",
  "generatedAt": "<teraz, ISO 8601 UTC>",
  "sources": ["open-meteo", "tvn", "interia", "google"],  // tylko użyte
  "verdict": {
    "text": "...", "emoji": "🌧️", "temperature": 14, "feelsLike": 12,
    "precipitationChance": 70, "windKmh": 18
  },
  "days": [  // 7 dni, [0] = dziś
    { "date": "YYYY-MM-DD", "summary": "1 zdanie", "emoji": "⛅",
      "tempMin": 9, "tempMax": 15, "precipitationChance": 70, "windKmh": 18 }
  ]
}

ZASADY:
- Emoji tylko z zestawu: ☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ 🌨️ ❄️ 🌫️ 💨
- Liczby całkowite. Temperatury w °C, wiatr w km/h, opady w %.
- Nie zmyślaj: jeśli masz tylko 1 źródło, napisz to w werdykcie.
```

## 6. Odporność na błędy

| Scenariusz | Zachowanie |
|---|---|
| Jedno źródło padło / zmienił się layout | Agent pomija źródło, syntetyzuje z pozostałych, `sources` odzwierciedla stan faktyczny |
| Wszystkie źródła padły dla lokalizacji | Agent NIE wysyła POST (stara prognoza w KV pozostaje; frontend pokaże jej wiek) |
| POST zwraca 401 | Błąd konfiguracji sekretu — agent raportuje w podsumowaniu przebiegu, nie ponawia |
| POST zwraca 400 | Agent czyta `error`, poprawia JSON, ponawia raz |
| Deno Deploy nie odpowiada | Ponowna próba raz; potem raport błędu |

Detekcja awarii przez człowieka: wskaźnik świeżości na stronie (UX §3) + historia przebiegów w panelu Cursor Automations.

## 7. Koszty tokenów — dyscyplina

- Jina Reader zwraca czysty Markdown zamiast HTML (~10× mniej tokenów).
- Open-Meteo zwraca zwarty JSON (setki tokenów, nie tysiące).
- Limit źródeł: ≤ 4/lokalizację; limit lokalizacji praktyczny: ~5 (przy 24 przebiegach/dobę).
- Prompt każe agentowi NIE cytować całych stron w odpowiedziach, tylko wyciągać liczby.

## 8. Testowanie

1. **Ręczny przebieg:** uruchomić automatyzację raz ręcznie (przycisk "Run now") przed włączeniem crona.
2. Sprawdzić: `GET /api/forecast/warszawa-bialoleka` zwraca świeży JSON.
3. Sprawdzić stronę: werdykt się wyświetla, świeżość "przed chwilą".
4. Test negatywny: POST ze złym sekretem → 401; POST z nieistniejącym `locationId` → 404.

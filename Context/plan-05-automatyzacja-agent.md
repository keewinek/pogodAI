# PogodAI — Plan automatyzacji (Cursor Cloud Automation + agent AI)

## 1. Rola

Serce systemu: co godzinę agent AI pobiera prognozy z wielu źródeł, syntetyzuje "jedną prawdziwą prognozę" i wysyła ją do API na Deno Deploy. Bez płatnych API — cała inteligencja to model dostępny w subskrypcji Cursora.

## 2. Konfiguracja automatyzacji


| Parametr       | Wartość                                       |
| -------------- | --------------------------------------------- |
| Nazwa          | PogodAI — aktualizacja prognoz                |
| Harmonogram    | cron `0 * * * *` (co godzinę)                 |
| Dostęp do repo | niepotrzebny (agent działa wyłącznie na HTTP) |
| Sekrety        | `POGODAI_SECRET` w konfiguracji automatyzacji |




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

Adresy budowane z `lat`/`lon` lub nazwy lokalizacji. Trzy warstwy źródeł: **rdzeń** (zawsze), **pula rotacyjna** (agent dobiera kilka) i **odkrywanie dynamiczne** (agent sam znajduje dodatkowe źródła w wyszukiwarce).

### 4.1 Rdzeń — zawsze pobierane (twarde liczby + godzinówka)

| Źródło | Typ | Jak adresować |
| --- | --- | --- |
| Open-Meteo (multi-model) | modele numeryczne | `api.open-meteo.com/v1/forecast?latitude=..&longitude=..&models=icon_seamless,gfs_seamless,ecmwf_ifs025&...` — jeden request zwraca prognozy z **3 modeli naraz** (ICON, GFS, ECMWF); JSON wprost, bez Jina |
| IMGW-PIB | państwowy instytut (PL) | `danepubliczne.imgw.pl/api/data/synop/station/<stacja>` (aktualny pomiar) + `meteo.imgw.pl` przez Jina (prognoza) |
| Google Weather | agregator | `r.jina.ai/https://www.google.com/search?q=pogoda+<miasto>` |

### 4.2 Pula rotacyjna — agent wybiera 3–5 na przebieg

Agent dobiera z puli tak, by w sumie mieć 6–8 źródeł; jeśli któreś padnie, sięga po następne z listy:

| Źródło | Typ | Jak adresować (przez `r.jina.ai/` o ile nie zaznaczono) |
| --- | --- | --- |
| TVN Meteo | serwis redakcyjny (PL) | `tvnmeteo.tvn24.pl/pogoda/...` |
| Interia Pogoda | serwis redakcyjny (PL) | `pogoda.interia.pl/prognoza-szczegolowa-...` |
| Onet Pogoda | serwis redakcyjny (PL) | `pogoda.onet.pl/prognoza-pogody/...` |
| WP Pogoda | serwis redakcyjny (PL) | `pogoda.wp.pl/...` |
| ICM Meteo (UM) | model UM 4km (PL, kultowy) | `meteo.pl` — meteogramy; wersja tekstowa ograniczona, traktować jako uzupełnienie |
| AccuWeather | agregator globalny | `accuweather.com/pl/pl/<miasto>/...` |
| Weather.com (TWC) | agregator globalny | `weather.com/pl-PL/pogoda/dzisiaj/l/<lat>,<lon>` |
| Meteoblue | modele numeryczne (wizualizacja) | `meteoblue.com/pl/pogoda/tydzien/<miasto>` |
| YR.no | norweski instytut (MET Norway) | `api.met.no/weatherapi/locationforecast/2.0/compact?lat=..&lon=..` — darmowe API JSON (wymaga nagłówka User-Agent), bez Jina |
| WetterOnline PL | serwis redakcyjny (DE/PL) | `wetteronline.pl/pogoda/<miasto>` |
| Foreca | agregator fiński | `foreca.pl/Poland/<miasto>` |
| MSN Pogoda | agregator | `msn.com/pl-pl/pogoda/prognoza/...` |

### 4.3 Odkrywanie dynamiczne — agent sam dobiera dodatkowe źródła

Poza stałymi listami agent może dodać 1–2 źródła "z ulicy":

1. Agent wykonuje wyszukiwanie: `r.jina.ai/https://www.google.com/search?q=prognoza+pogody+<miasto>` (i/lub `duckduckgo.com/html/?q=...`).
2. Z wyników wybiera 1–2 serwisy pogodowe, których **nie ma** jeszcze w tym przebiegu (np. lokalny portal miejski, regionalne media) i pobiera je przez Jina.
3. Kryteria wyboru: strona wygląda na prognozę (są liczby: temperatura, opady), dotyczy właściwej miejscowości, treść po polsku lub angielsku.
4. Użyte źródło dynamiczne trafia do `sources` pod swoją domeną (np. `"pogoda.lokalneradio.pl"`).
5. Zakaz: strony wymagające logowania, PDF-y, fora/social media, strony starsze niż z bieżącej doby.

### 4.4 Źródła odrzucone (nie próbować ponownie)

| Źródło | Powód odrzucenia (sprawdzone 2026-07) |
| --- | --- |
| Apple Weather / WeatherKit | Jedyna legalna droga to WeatherKit REST API, które wymaga płatnego konta Apple Developer (99 USD/rok) — konflikt z zasadą "bez płatnych API". Web `weather.apple.com` zwraca 403 zarówno bezpośrednio, jak i przez `r.jina.ai` (zabezpieczenia Apple). |

Uwagi:
- **Open-Meteo multi-model** to najważniejszy ruch: parametr `models=` daje trzy niezależne modele numeryczne w jednym tanim JSON-ie — realizuje wymóg "wielu modeli matematycznych" bez dodatkowych tokenów.
- **YR.no i IMGW** mają czyste, darmowe API — tanie tokenowo, warto mieć zawsze w grze.
- Dokładne URL-e per lokalizacja najlepiej trzymać jako szablony w prompcie automatyzacji; jeśli URL serwisu nie istnieje dla danej miejscowości, agent pomija źródło (w `sources` tylko faktycznie użyte).
- Budżet: 6–8 źródeł stałych + maks. 2 dynamiczne = do 10 źródeł na lokalizację na przebieg.




## 5. Prompt automatyzacji (szkic do wklejenia w Cursor Automations)

```
Jesteś agentem PogodAI. Twoje zadanie: zaktualizować prognozy pogody.

KROKI:
1. Pobierz listę lokalizacji: curl -s https://pogodai.deno.dev/api/locations
2. Dla każdej lokalizacji zbierz dane pogodowe.

   ŹRÓDŁA OBOWIĄZKOWE (zawsze):
   - Open-Meteo multi-model (3 modele naraz: ICON, GFS, ECMWF):
     curl -s "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&models=icon_seamless,gfs_seamless,ecmwf_ifs025&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&timezone=Europe%2FWarsaw&forecast_days=7"
   - YR.no (MET Norway): curl -s -H "User-Agent: PogodAI/1.0" \
     "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}"
   - Google: curl -s "https://r.jina.ai/https://www.google.com/search?q=pogoda+{nazwa}"

   ŹRÓDŁA Z PULI (wybierz 3-5, przez https://r.jina.ai/<pełny-url>):
   TVN Meteo, Interia, Onet Pogoda, WP Pogoda, AccuWeather, Weather.com,
   Meteoblue, WetterOnline, Foreca, MSN Pogoda, IMGW (meteo.imgw.pl).
   Jeśli któreś zawiedzie (błąd, brak miejscowości, paywall) — weź następne.

   ŹRÓDŁA DYNAMICZNE (0-2, wedle uznania):
   Przejrzyj wyniki wyszukiwania Google z kroku wyżej. Jeśli widzisz tam
   sensowny serwis pogodowy spoza powyższych list (np. lokalny portal),
   pobierz go przez r.jina.ai i dolicz do syntezy. Kryteria: są konkretne
   liczby (temperatura/opady), dotyczy właściwej miejscowości, treść
   aktualna. Nie używaj forów, social mediów ani stron z logowaniem.

   Cel: 6-10 użytych źródeł na lokalizację. Minimum do syntezy: 2.
3. SYNTEZA: porównaj źródła i wyciągnij jeden werdykt. Gdy źródła się
   różnią, preferuj konsensus (medianę); wagi: instytuty (IMGW, YR.no)
   i modele numeryczne > serwisy redakcyjne > źródła dynamiczne.
   Rozbieżności zaznacz w tekście werdyktu.
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
  "sources": ["open-meteo", "yr.no", "google", "tvn", "interia",
              "accuweather", "pogoda.lokalneradio.pl"],  // tylko faktycznie użyte;
              // źródła dynamiczne pod swoją domeną
  "verdict": {
    "text": "...", "emoji": "🌧️", "temperature": 14, "feelsLike": 12,
    "precipitationChance": 70, "windKmh": 18
  },
  "days": [  // 7 dni, [0] = dziś
    { "date": "YYYY-MM-DD", "summary": "1 zdanie", "emoji": "⛅",
      "tempMin": 9, "tempMax": 15, "precipitationChance": 70, "windKmh": 18,
      "hours": [  // dziś i jutro: co 1h (24 wpisy); dni 3-7: co 3h (8 wpisów)
        { "time": "YYYY-MM-DDTHH:00", "emoji": "🌧️", "temperature": 14,
          "precipitationChance": 70, "windKmh": 18 }
      ] }
  ]
}

ZASADY:
- Emoji tylko z zestawu: ☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ 🌨️ ❄️ 🌫️ 💨
- Liczby całkowite. Temperatury w °C, wiatr w km/h, opady w %.
- Dane godzinowe (hours) bierz wprost z hourly Open-Meteo (mapuj weather_code
  na emoji); serwisów redakcyjnych używaj do korekty werdyktu i podsumowań
  dziennych — nie przepisuj z nich godzinówki ręcznie.
- "time" w czasie lokalnym Europe/Warsaw (tak zwraca Open-Meteo z timezone).
- Nie zmyślaj: jeśli masz tylko 1 źródło, napisz to w werdykcie.
```



## 6. Odporność na błędy


| Scenariusz                              | Zachowanie                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| Jedno źródło padło / zmienił się layout | Agent pomija źródło, syntetyzuje z pozostałych, `sources` odzwierciedla stan faktyczny |
| Wszystkie źródła padły dla lokalizacji  | Agent NIE wysyła POST (stara prognoza w KV pozostaje; frontend pokaże jej wiek)        |
| POST zwraca 401                         | Błąd konfiguracji sekretu — agent raportuje w podsumowaniu przebiegu, nie ponawia      |
| POST zwraca 400                         | Agent czyta `error`, poprawia JSON, ponawia raz                                        |
| Deno Deploy nie odpowiada               | Ponowna próba raz; potem raport błędu                                                  |


Detekcja awarii przez człowieka: wskaźnik świeżości na stronie (UX §3) + historia przebiegów w panelu Cursor Automations.

## 7. Koszty tokenów — dyscyplina

- Jina Reader zwraca czysty Markdown zamiast HTML (~10× mniej tokenów).
- Najtańsze źródła robią najcięższą robotę: Open-Meteo multi-model (3 modele w jednym JSON-ie) i YR.no (zwarty JSON) dają twarde liczby niemal za darmo tokenowo; serwisy redakcyjne służą do korekty werdyktu i lokalnego kontekstu.
- Godzinówka: agent nie "wymyśla" 88+ wpisów godzinowych — przepisuje je programowo/mechanicznie z `hourly` Open-Meteo (najlepiej krótkim skryptem, np. `deno eval`/`jq`, zamiast generować tokeny na każdy wpis). AI syntetyzuje tylko werdykt, podsumowania dzienne i emoji.
- Limit źródeł: ≤ 10/lokalizację (3 rdzeń + 3–5 z puli + 0–2 dynamiczne); limit lokalizacji praktyczny: ~5 (przy 24 przebiegach/dobę). Gdyby przebiegi robiły się za drogie, kolejność cięć: najpierw źródła dynamiczne do 0, potem pula do 2 — rdzeń zostaje nietknięty.
- Prompt każe agentowi NIE cytować całych stron w odpowiedziach, tylko wyciągać liczby.



## 8. Testowanie

1. **Ręczny przebieg:** uruchomić automatyzację raz ręcznie (przycisk "Run now") przed włączeniem crona.
2. Sprawdzić: `GET /api/forecast/warszawa-bialoleka` zwraca świeży JSON.
3. Sprawdzić stronę: werdykt się wyświetla, świeżość "przed chwilą".
4. Test negatywny: POST ze złym sekretem → 401; POST z nieistniejącym `locationId` → 404.


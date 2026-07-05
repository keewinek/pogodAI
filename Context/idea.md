# Projekt: [WYBIERZ NAZWĘ, NP. PEWNIAI]

## Opis projektu

Celem projektu jest stworzenie osobistego, hiperlokalnego systemu prognozowania
pogody dla wybranej lokalizacji (Białołęka, Warszawa). Zamiast polegać na
jednym, często niedokładnym źródle, system agreguje dane z wielu serwisów
pogodowych (TVN, Interia, Google itp.) i przy użyciu modelu AI wyciąga z nich
jeden, "ostateczny" werdykt.

## Architektura techniczna

Projekt składa się z dwóch głównych komponentów:

1. **Agregator/Analityk (Cursor Cloud Automations):**
   - Działa w oparciu o zaplanowane zadania (Cron).
   - Wykorzystuje agenta AI do "scrappowania" treści z portali pogodowych.
   - Aby ominąć zabezpieczenia (Cloudflare, RODO), każda strona jest pobierana
     za pośrednictwem `https://r.jina.ai/` (konwersja do czystego Markdowna).
   - Agent analizuje dane i generuje JSON z prognozą (`glowny_werdykt`,
     `temperatura`, `szansa_opadow`).
   - Wysyła gotowy wynik za pomocą `curl` (POST) na serwer Deno Deploy.

2. **Backend/Frontend (Deno Deploy):**
   - Serwer zbudowany w TypeScript (Deno).
   - Odbiera dane przez `POST` (wymagana autoryzacja nagłówkiem
     `Authorization`).
   - Przechowuje aktualną prognozę w `Deno KV`.
   - Zwraca prognozę użytkownikowi przez `GET`.

## Wymagania funkcjonalne

- **Automatyzacja:** Proces musi uruchamiać się co godzinę bez ingerencji
  użytkownika.
- **Efektywność:** Minimalizacja tokenów przez pobieranie wyłącznie czystego
  tekstu (Markdown) przez Jina Reader.
- **Bezpieczeństwo:** Komunikacja między Cursor Automation a Deno musi być
  zabezpieczona kluczem w nagłówku.
- **User Experience:** Wynik ma być krótki, konkretny i zrozumiały ("Werdykt").

## Wytyczne dla AI (Cursor)

- Przy każdej modyfikacji kodu pamiętaj, że celem jest "jedna, prawdziwa
  prognoza" po syntezie danych z wielu źródeł.
- Unikaj używania płatnych API zewnętrznych (OpenAI API itp.) — wykorzystuj moc
  modelu, do którego masz dostęp w ramach subskrypcji Cursora.
- Kod ma być lekki, wydajny i utrzymywany w jednym pliku (o ile to możliwe) na
  Deno Deploy.

## Zadania priorytetowe

1. Implementacja endpointu POST w Deno z obsługą Deno KV.
2. Stworzenie skryptu dla Cursor Automation (Cron), który pobiera dane i
   wykonuje `curl`.
3. Stylizacja interfejsu GET (HTML/CSS) w Deno, aby aplikacja wyglądała jak
   nowoczesna, mobilna web-app.

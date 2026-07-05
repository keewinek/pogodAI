# PogodAI — Plan UX

## 1. Zasada naczelna

Użytkownik otwiera stronę i w **poniżej 2 sekundy** wie: _jaka będzie pogoda i
co ma zrobić_ ("weź parasol"). Werdykt AI to serce aplikacji — wszystko inne
jest drugorzędne.

## 2. Kluczowe przepływy (user flows)

### 2.1 Pierwsze wejście (brak zapisanej lokalizacji)

1. Użytkownik otwiera `/`.
2. Widzi panel "Wybierz lokalizację" (lista kart lokalizacji, SSR).
3. Tap na lokalizację → island zapisuje `localStorage.pogodai_location = <id>` →
   nawigacja do `/[lokalizacja]`.

### 2.2 Codzienne sprawdzenie pogody (główny, 95% użyć)

1. Użytkownik otwiera `/` (np. z ikony na ekranie głównym telefonu).
2. Island `LocationGate` znajduje zapis w `localStorage` i robi
   `location.replace("/" + id)` — bez wpisu w historii przeglądarki (przycisk
   "wstecz" nie wraca na pusty `/`).
3. `/[lokalizacja]` renderuje się serwerowo (SSR) — od razu z pełnymi danymi,
   bez spinnera.
4. Widzi: emoji + temperaturę + werdykt + najbliższe godziny. Koniec — cel
   osiągnięty.
5. Opcjonalnie scrolluje do prognozy wielodniowej; tap w dzień rozwija jego
   prognozę godzinową.

Wymagania UX:

- **Zero spinnerów** na `/[lokalizacja]` — dane wstrzyknięte w SSR z KV (odczyt
  KV to milisekundy).
- Decyzja: **lokalizacja w `localStorage`**, redirect kliencki z `/`.
  Konsekwencja: `/` mignie na ułamek sekundy przed przekierowaniem —
  akceptowalne; w zamian strona `/[lokalizacja]` ma stabilny, udostępnialny URL
  i pełny SSR. Można też dodać ikonę na ekran główny telefonu wskazującą
  bezpośrednio na `/warszawa-bialoleka` i całkiem ominąć redirect.
- Jeśli zapisany w `localStorage` id nie istnieje już na liście lokalizacji
  (usunięty), `LocationGate` czyści zapis i pokazuje panel wyboru.

### 2.3 Zmiana lokalizacji

1. Tap na pigułkę lokalizacji na górze strony prognozy.
2. Rozwija się lista lokalizacji (dropdown/bottom-sheet).
3. Tap na lokalizację → island zapisuje nowy id w `localStorage` → nawigacja do
   `/[nowa-lokalizacja]` (pełne przejście, SSR jest szybki).
4. Kolejne wejścia na `/` przekierowują już na tę lokalizację.

### 2.4 Prognoza godzinowa

1. Pod werdyktem zawsze widoczny pasek "Najbliższe godziny" (scroll poziomy,
   dziś od bieżącej godziny; pod koniec dnia doklejony początek jutra) —
   najczęstsze pytanie "czy za 3h będzie padać" ma odpowiedź bez żadnego
   kliknięcia.
2. Tap w wiersz dnia w liście dni → wiersz rozwija się (akordeon) i pokazuje
   `summary` + pasek godzinowy tego dnia (dziś/jutro co 1 h, dalsze dni co 3 h).
3. Tap w rozwinięty wiersz zwija go; rozwinięcie innego dnia zwija poprzedni
   (jeden naraz).
4. Zero fetchowania — wszystkie godziny są w dokumencie z SSR, island tylko
   przełącza widoczność. Rozwinięcie jest natychmiastowe.

### 2.5 Edycja listy lokalizacji (rzadkie, tylko właściciel)

1. W dropdownie lokalizacji na dole link "Edytuj lokalizacje…" → `/lokalizacje`.
2. Dodanie: nazwa + współrzędne (lat/lon) → walidacja → POST → wpis pojawia się
   na liście.
3. Komunikat po dodaniu: "✅ Dodano. Prognoza pojawi się po następnym cyklu
   automatyzacji (do 1h)." — zarządzanie oczekiwaniem, bo dane nie będą
   natychmiast.
4. Usunięcie: ikona kosza → `confirm("Usunąć lokalizację X?")` → DELETE → znika
   z listy (kasuje też prognozę z KV).

Ułatwienie wpisywania współrzędnych: pod polami podpowiedź "Współrzędne
znajdziesz w Google Maps (PPM → współrzędne)". Opcjonalnie w przyszłości:
geokodowanie po nazwie (poza MVP, wymagałoby zewnętrznego API).

## 3. Zaufanie do danych (kluczowy element UX tej aplikacji)

Aplikacja agreguje wiele źródeł — użytkownik musi wiedzieć, na czym stoi:

- **Świeżość:** zawsze widoczny relatywny czas "Zaktualizowano 12 min temu".
  - < 90 min → neutralny szary,
  - 90 min – 3 h → bursztynowy "Dane mogą być nieaktualne",
  - 3 h → czerwony "Ostatnia aktualizacja X h temu — automatyzacja mogła się
    > wysypać".
- **Źródła:** stopka z listą źródeł użytych w tej prognozie ("Synteza z: TVN ·
  Interia · Google · ICM").
- **Pewność:** jeśli agent zwróci rozbieżność źródeł, werdykt powinien to
  komunikować w tekście ("źródła są niezgodne co do opadów — być może przelotny
  deszcz").

## 4. Ton komunikacji

- Werdykt pisany po polsku, po ludzku, z konkretną rekomendacją: nie "opady
  atmosferyczne 70%", tylko "Po południu rozpada się na dobre — weź parasol."
- Krótko: werdykt maks. 2 zdania (limit w prompcie agenta).
- Komunikaty błędów też po ludzku: "Nie mam jeszcze prognozy dla tej
  lokalizacji. Wpadnij za godzinę. ⏳"

## 5. Wydajność i dostępność

- SSR + minimalny JS (4 małe islands: gate, picker, editor, akordeon) → TTI
  niemal natychmiastowy.
- Brak webfontów, brak bibliotek ikon, emoji zamiast SVG-ów.
- Kontrast: biały tekst na gradientach — sprawdzić kontrast dla motywu `snowy`
  (jasne tło → ciemny tekst).
- Elementy dotykowe ≥ 44px; dropdown obsługiwany też klawiaturą
  (focus/Enter/Escape).
- `<html lang="pl">`, sensowne `aria-label` na selektorze i przyciskach
  usuwania.
- Meta `theme-color` dopasowany do motywu pogodowego (ładny pasek w mobilnym
  Chrome/Safari).

## 6. "Jak aplikacja" na telefonie

- `manifest.json` (nazwa: PogodAI, ikona, `display: standalone`, kolor motywu) —
  użytkownik doda do ekranu głównego i apka otwiera się bez paska przeglądarki.
- Bez service workera w MVP (oszczędność złożoności); dane i tak muszą być
  świeże z sieci. Ewentualnie później prosty SW z fallbackiem offline "ostatnia
  znana prognoza".

## 7. Antywzorce, których unikamy

- Brak reklam, pop-upów, banerów zgód (jedyny zapis po stronie klienta to
  `localStorage` z wybraną lokalizacją, apka prywatna).
- Brak przeładowanego dashboardu — jedna kolumna, jedna odpowiedź.
- Brak ukrywania werdyktu poniżej zgięcia ekranu (fold) — werdykt widoczny bez
  scrollowania na typowym telefonie (~660px viewport).

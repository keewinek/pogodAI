# PogodAI — Plan UX

## 1. Zasada naczelna

Użytkownik otwiera stronę i w **poniżej 2 sekundy** wie: *jaka będzie pogoda i co ma zrobić* ("weź parasol"). Werdykt AI to serce aplikacji — wszystko inne jest drugorzędne.

## 2. Kluczowe przepływy (user flows)

### 2.1 Codzienne sprawdzenie pogody (główny, 95% użyć)

1. Użytkownik otwiera `/` (np. z ikony na ekranie głównym telefonu).
2. Strona renderuje się serwerowo (SSR) — od razu z danymi, bez spinnera.
3. Widzi: emoji + temperaturę + werdykt. Koniec — cel osiągnięty.
4. Opcjonalnie scrolluje do prognozy wielodniowej.

Wymagania UX:
- **Zero spinnerów na starcie** — dane wstrzyknięte w SSR z KV (odczyt KV to milisekundy).
- Ostatnio wybrana lokalizacja pamiętana w `localStorage`; przy pierwszym renderze SSR używamy domyślnej (pierwszej) lokalizacji, a island podmienia na zapamiętaną jeśli inna (albo: ciasteczko `location` czytane serwerowo — preferowane, bo unika mignięcia treści).
- Decyzja: **lokalizacja w cookie** (`pogodai_location=<id>`), ustawiane przez `LocationPicker`. SSR czyta cookie i od razu renderuje właściwą lokalizację. `localStorage` niepotrzebny.

### 2.2 Zmiana lokalizacji

1. Tap na pigułkę lokalizacji na górze.
2. Rozwija się lista lokalizacji (dropdown/bottom-sheet).
3. Tap na lokalizację → island ustawia cookie → pobiera `GET /api/forecast/:id` → podmienia dane na stronie bez pełnego przeładowania (albo prosto: `location.reload()` — akceptowalne, SSR jest szybki; na start wybieramy reload dla prostoty).
4. Kolejne wejścia od razu pokazują tę lokalizację.

### 2.3 Edycja listy lokalizacji (rzadkie, tylko właściciel)

1. W dropdownie lokalizacji na dole link "Edytuj lokalizacje…" → `/lokalizacje`.
2. Dodanie: nazwa + współrzędne (lat/lon) → walidacja → POST → wpis pojawia się na liście.
3. Komunikat po dodaniu: "✅ Dodano. Prognoza pojawi się po następnym cyklu automatyzacji (do 1h)." — zarządzanie oczekiwaniem, bo dane nie będą natychmiast.
4. Usunięcie: ikona kosza → `confirm("Usunąć lokalizację X?")` → DELETE → znika z listy (kasuje też prognozę z KV).

Ułatwienie wpisywania współrzędnych: pod polami podpowiedź "Współrzędne znajdziesz w Google Maps (PPM → współrzędne)". Opcjonalnie w przyszłości: geokodowanie po nazwie (poza MVP, wymagałoby zewnętrznego API).

## 3. Zaufanie do danych (kluczowy element UX tej aplikacji)

Aplikacja agreguje wiele źródeł — użytkownik musi wiedzieć, na czym stoi:

- **Świeżość:** zawsze widoczny relatywny czas "Zaktualizowano 12 min temu".
  - < 90 min → neutralny szary,
  - 90 min – 3 h → bursztynowy "Dane mogą być nieaktualne",
  - > 3 h → czerwony "Ostatnia aktualizacja X h temu — automatyzacja mogła się wysypać".
- **Źródła:** stopka z listą źródeł użytych w tej prognozie ("Synteza z: TVN · Interia · Google · ICM").
- **Pewność:** jeśli agent zwróci rozbieżność źródeł, werdykt powinien to komunikować w tekście ("źródła są niezgodne co do opadów — być może przelotny deszcz").

## 4. Ton komunikacji

- Werdykt pisany po polsku, po ludzku, z konkretną rekomendacją: nie "opady atmosferyczne 70%", tylko "Po południu rozpada się na dobre — weź parasol."
- Krótko: werdykt maks. 2 zdania (limit w prompcie agenta).
- Komunikaty błędów też po ludzku: "Nie mam jeszcze prognozy dla tej lokalizacji. Wpadnij za godzinę. ⏳"

## 5. Wydajność i dostępność

- SSR + minimalny JS (tylko 2 islands) → TTI niemal natychmiastowy.
- Brak webfontów, brak bibliotek ikon, emoji zamiast SVG-ów.
- Kontrast: biały tekst na gradientach — sprawdzić kontrast dla motywu `snowy` (jasne tło → ciemny tekst).
- Elementy dotykowe ≥ 44px; dropdown obsługiwany też klawiaturą (focus/Enter/Escape).
- `<html lang="pl">`, sensowne `aria-label` na selektorze i przyciskach usuwania.
- Meta `theme-color` dopasowany do motywu pogodowego (ładny pasek w mobilnym Chrome/Safari).

## 6. "Jak aplikacja" na telefonie

- `manifest.json` (nazwa: PogodAI, ikona, `display: standalone`, kolor motywu) — użytkownik doda do ekranu głównego i apka otwiera się bez paska przeglądarki.
- Bez service workera w MVP (oszczędność złożoności); dane i tak muszą być świeże z sieci. Ewentualnie później prosty SW z fallbackiem offline "ostatnia znana prognoza".

## 7. Antywzorce, których unikamy

- Brak reklam, pop-upów, zgód cookie (cookie funkcjonalne, apka prywatna).
- Brak przeładowanego dashboardu — jedna kolumna, jedna odpowiedź.
- Brak ukrywania werdyktu poniżej zgięcia ekranu (fold) — werdykt widoczny bez scrollowania na typowym telefonie (~660px viewport).

# PogodAI — Plan UI

Wygląd nowoczesnej, mobilnej aplikacji pogodowej. Mobile-first, ale responsywnie do desktopu. Tailwind CSS (już w scaffoldzie Fresh).

## 1. Kierunek wizualny

- **Styl:** czysty, "glassmorphism-lite" — duże zaokrąglenia (rounded-3xl), subtelne przezroczystości, miękkie cienie.
- **Tło:** gradient zależny od pogody i pory dnia (patrz §5). Domyślnie spokojny niebiesko-granatowy.
- **Typografia:** systemowy font stack (`system-ui`) — zero ładowania webfontów, szybkość na mobile. Temperatura główna bardzo duża (np. `text-7xl font-light`), reszta wyraźna hierarchia.
- **Ikony pogody:** emoji (🌧️ ☀️ ⛅ ❄️ 🌩️) — zero zależności, generowane przez agenta AI w JSON-ie. Duży rozmiar na karcie głównej.
- **Język interfejsu:** polski.

## 2. Routing i ekrany

| Ścieżka | Rola |
|---|---|
| `/` | Panel "Wybierz lokalizację" — LUB natychmiastowy redirect do `/[lokalizacja]`, jeśli wybór zapisany w `localStorage` |
| `/[lokalizacja]` | Strona prognozy dla lokalizacji (główny ekran aplikacji) |
| `/lokalizacje` | Zarządzanie listą lokalizacji |

### 2.1 Panel wyboru `/`

- SSR renderuje listę lokalizacji jako duże, dotykalne karty (nazwa + 📍).
- Island `LocationGate` przy montowaniu sprawdza `localStorage.pogodai_location`:
  - jest zapisana i istnieje na liście → `location.replace("/" + id)` (natychmiast, bez wpisu w historii),
  - brak → panel zostaje widoczny.
- Tap na kartę lokalizacji → zapis do `localStorage` → nawigacja do `/[lokalizacja]`.
- Na dole link "Edytuj lokalizacje…" → `/lokalizacje`.
- Gdy lista pusta: CTA "Dodaj pierwszą lokalizację".

```
┌──────────────────────────────┐
│         PogodAI 🌦️           │
│   Wybierz lokalizację        │
│                              │
│  ┌────────────────────────┐  │
│  │ 📍 Białołęka, Warszawa │  │
│  ├────────────────────────┤  │
│  │ 📍 Zakopane            │  │
│  └────────────────────────┘  │
│                              │
│      Edytuj lokalizacje…     │
└──────────────────────────────┘
```

### 2.2 Strona prognozy `/[lokalizacja]`

Układ pionowy, od góry:

```
┌──────────────────────────────┐
│  [📍 Białołęka, Warszawa ▾]  │  ← selektor lokalizacji (dropdown)
│                              │
│            🌧️               │
│            14°               │  ← temperatura, bardzo duża
│   Odczuwalna 12° · Wiatr 18  │
│                              │
│  ┌────────────────────────┐  │
│  │ WERDYKT                │  │  ← karta werdyktu (najważniejsza!)
│  │ "Chłodno i deszczowo   │  │
│  │  po południu — weź     │  │
│  │  parasol."             │  │
│  │ ☔ 70% szansa opadów   │  │
│  └────────────────────────┘  │
│                              │
│  Najbliższe godziny          │
│  ┌────────────────────────┐  │
│  │ 15  16  17  18  19  20 │→ │  ← pasek godzinowy, scroll poziomy
│  │ 🌧️  🌧️  ⛅  ⛅  ☀️  ☀️ │  │     (godziny "dziś" od teraz)
│  │ 14° 13° 13° 12° 11° 10°│  │
│  │ ☔70 ☔60 ☔20 ☔10 ☔5 ☔5│  │
│  └────────────────────────┘  │
│                              │
│  Prognoza na kolejne dni     │
│  ┌────────────────────────┐  │
│  │ Dziś ▾  🌧️  9°/15° ☔70%│  │  ← tap = rozwija godzinówkę dnia
│  │ Pon  ▸  ⛅ 11°/18° ☔20%│  │
│  │ ┌ rozwinięte: ────────┐│  │
│  │ │ 06 09 12 15 18 21  →││  │  ← ten sam pasek godzinowy,
│  │ │ ⛅ ☀️ ☀️ ⛅ 🌧️ 🌧️   ││  │     dane z days[i].hours
│  │ │ 8° 12° 17° 18° 15° …││  │
│  │ └─────────────────────┘│  │
│  │ Wt   ▸  ☀️ 13°/21° ☔5%│  │
│  │ ...     (5–7 wierszy)  │  │
│  └────────────────────────┘  │
│                              │
│  Zaktualizowano 12 min temu  │  ← stopka świeżości
│  Źródła: TVN · Interia · ... │
└──────────────────────────────┘
```

Elementy:

1. **Selektor lokalizacji** — pigułka na górze, po tapnięciu rozwija listę lokalizacji (island `LocationPicker`). Wybór zapisuje `localStorage.pogodai_location` i nawiguje do `/[lokalizacja]`.
2. **Hero** — emoji pogody + temperatura + odczuwalna + wiatr. Wycentrowane.
3. **Karta werdyktu** — wizualnie najmocniejszy element (wyróżniona karta, lekko podświetlona). Zawiera tekst werdyktu AI i szansę opadów. To jest "produkt" aplikacji.
4. **Pasek godzinowy "Najbliższe godziny"** — poziomo scrollowana taśma kolumn: godzina, emoji, temperatura, szansa opadów. Dane: `days[0].hours` przefiltrowane od bieżącej godziny; jeśli zostało < 6 godzin dnia, doklejamy początek `days[1].hours`. Scroll natywny (`overflow-x-auto snap-x`), bez JS.
5. **Lista dni (akordeon)** — 5–7 wierszy: dzień tygodnia, emoji, min/max, szansa opadów. Wiersz "Dziś" wyróżniony. **Tap na wiersz rozwija panel z `summary` dnia + paskiem godzinowym tego dnia** (`days[i].hours`). Jeden rozwinięty dzień naraz. Island `DailyAccordion` (dane godzinowe już w HTML z SSR — island tylko przełącza widoczność, zero fetchowania).
6. **Stopka świeżości** — czas ostatniej aktualizacji (relatywny) + lista źródeł. Jeśli dane starsze niż 2h — kolor ostrzegawczy (bursztynowy).

### 2.3 Zarządzanie lokalizacjami `/lokalizacje`

Prosty ekran-lista (bez autoryzacji):

```
┌──────────────────────────────┐
│  ← Wróć     Lokalizacje      │
│                              │
│  ┌────────────────────────┐  │
│  │ 📍 Białołęka, Warszawa │🗑│
│  │ 📍 Zakopane            │🗑│
│  └────────────────────────┘  │
│                              │
│  ┌ Dodaj lokalizację ─────┐  │
│  │ Nazwa: [___________]   │  │
│  │ Lat:   [_____] Lon: [__]│ │
│  │      [ + Dodaj ]        │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

- Usuwanie z potwierdzeniem (`confirm()` wystarczy — apka prywatna).
- Po dodaniu lokalizacji informacja: "Prognoza pojawi się po następnym cyklu automatyzacji (do 1h)".
- Link do tego ekranu: mała ikonka zębatki/„Edytuj" w dropdownie selektora lokalizacji.

### 2.4 Stany specjalne

- **Brak prognozy dla lokalizacji** (świeżo dodana): hero zastąpione kartą "⏳ Czekam na pierwszą prognozę — pojawi się w ciągu godziny."
- **Nieistniejący slug w `/[lokalizacja]`:** 404 z linkiem "Wybierz lokalizację" → `/` (island `LocationGate` powinien wtedy też wyczyścić nieaktualny wpis z `localStorage`).
- **Brak lokalizacji w bazie:** CTA "Dodaj pierwszą lokalizację" → `/lokalizacje`.
- **Błąd sieci / 500:** karta "Nie udało się pobrać danych" + przycisk odśwież.

## 3. Paleta kolorów (Tailwind)

Zdefiniowana motywami zależnymi od pogody (klasa na `<body>` lub zmienne CSS):

| Motyw | Warunek | Gradient tła | Akcent |
|---|---|---|---|
| `sunny` | ☀️ dzień, bezchmurnie | `from-sky-400 to-blue-600` | `amber-300` |
| `cloudy` | ⛅/☁️ | `from-slate-400 to-slate-700` | `sky-300` |
| `rainy` | 🌧️/☔ | `from-slate-600 to-indigo-900` | `cyan-300` |
| `snowy` | ❄️ | `from-slate-300 to-blue-800` | `white` |
| `storm` | 🌩️ | `from-slate-800 to-purple-950` | `yellow-300` |
| `night` | noc (22–6) | `from-slate-900 to-indigo-950` | `indigo-300` |

- Tekst zawsze biały/jasny na gradientach; karty: `bg-white/10 backdrop-blur rounded-3xl`.
- Motyw wybierany serwerowo na podstawie emoji werdyktu + godziny (prosta funkcja mapująca).

## 4. Komponenty (pliki)

| Komponent | Typ | Plik |
|---|---|---|
| `LocationGate` | island (redirect z `/` wg `localStorage` + wybór lokalizacji) | `islands/LocationGate.tsx` |
| `LocationPicker` | island (interaktywny dropdown na stronie prognozy) | `islands/LocationPicker.tsx` |
| `LocationEditor` | island (formularz + lista z usuwaniem) | `islands/LocationEditor.tsx` |
| `DailyAccordion` | island (rozwijanie dni z godzinówką; dane w HTML z SSR) | `islands/DailyAccordion.tsx` |
| `VerdictCard` | komponent SSR | `components/VerdictCard.tsx` |
| `HourlyStrip` | komponent SSR (pasek godzinowy, scroll natywny CSS) | `components/HourlyStrip.tsx` |
| `Hero` | komponent SSR | `components/Hero.tsx` |
| `FreshnessFooter` | komponent SSR | `components/FreshnessFooter.tsx` |

Zasada: wszystko co statyczne renderujemy serwerowo; islands tylko tam, gdzie potrzebna interakcja (redirect/wybór/edycja lokalizacji, akordeon dni). `HourlyStrip` jest reużywany: raz jako "Najbliższe godziny" pod werdyktem, raz wewnątrz rozwiniętego dnia w `DailyAccordion`.

## 5. Responsywność

- **Mobile (default):** jedna kolumna, max szerokość treści `max-w-md mx-auto`, padding `px-4`.
- **Desktop (md+):** ta sama kolumna wycentrowana (aplikacja "telefonowa" na środku) — celowo prosto; ewentualnie tło gradientowe na pełną szerokość.
- Selektor i przyciski: min. 44px wysokości dotyku.

## 6. Sprzątanie scaffoldu

Do usunięcia/wymiany z domyślnego szablonu Fresh:
- `islands/Counter.tsx`, `components/Button.tsx` (demo),
- zawartość `routes/index.tsx` (demo),
- `routes/api/[name].tsx` (demo),
- `static/logo.svg` → własne logo/favicon PogodAI (opcjonalnie proste ☀️/🌦️ SVG).

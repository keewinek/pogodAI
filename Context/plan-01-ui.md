# PogodAI — Plan UI

Wygląd nowoczesnej, mobilnej aplikacji pogodowej. Mobile-first, ale responsywnie do desktopu. Tailwind CSS (już w scaffoldzie Fresh).

## 1. Kierunek wizualny

- **Styl:** czysty, "glassmorphism-lite" — duże zaokrąglenia (rounded-3xl), subtelne przezroczystości, miękkie cienie.
- **Tło:** gradient zależny od pogody i pory dnia (patrz §5). Domyślnie spokojny niebiesko-granatowy.
- **Typografia:** systemowy font stack (`system-ui`) — zero ładowania webfontów, szybkość na mobile. Temperatura główna bardzo duża (np. `text-7xl font-light`), reszta wyraźna hierarchia.
- **Ikony pogody:** emoji (🌧️ ☀️ ⛅ ❄️ 🌩️) — zero zależności, generowane przez agenta AI w JSON-ie. Duży rozmiar na karcie głównej.
- **Język interfejsu:** polski.

## 2. Ekrany

### 2.1 Strona główna `/` (jedyny główny ekran)

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
│  Prognoza na kolejne dni     │
│  ┌────────────────────────┐  │
│  │ Dziś    🌧️  9° / 15°  ☔70%│
│  │ Pon     ⛅  11° / 18° ☔20%│
│  │ Wt      ☀️  13° / 21° ☔5% │
│  │ ...     (5–7 wierszy)     │
│  └────────────────────────┘  │
│                              │
│  Zaktualizowano 12 min temu  │  ← stopka świeżości
│  Źródła: TVN · Interia · ... │
└──────────────────────────────┘
```

Elementy:

1. **Selektor lokalizacji** — pigułka na górze, po tapnięciu rozwija listę lokalizacji (island `LocationPicker`). Aktywna lokalizacja zapamiętana w `localStorage`.
2. **Hero** — emoji pogody + temperatura + odczuwalna + wiatr. Wycentrowane.
3. **Karta werdyktu** — wizualnie najmocniejszy element (wyróżniona karta, lekko podświetlona). Zawiera tekst werdyktu AI i szansę opadów. To jest "produkt" aplikacji.
4. **Lista dni** — 5–7 wierszy: dzień tygodnia, emoji, min/max, szansa opadów. Wiersz "Dziś" wyróżniony. Opcjonalnie tap na wiersz rozwija `summary` dnia.
5. **Stopka świeżości** — czas ostatniej aktualizacji (relatywny) + lista źródeł. Jeśli dane starsze niż 2h — kolor ostrzegawczy (bursztynowy).

### 2.2 Zarządzanie lokalizacjami `/lokalizacje`

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

### 2.3 Stany specjalne

- **Brak prognozy dla lokalizacji** (świeżo dodana): hero zastąpione kartą "⏳ Czekam na pierwszą prognozę — pojawi się w ciągu godziny."
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
| `LocationPicker` | island (interaktywny dropdown) | `islands/LocationPicker.tsx` |
| `LocationEditor` | island (formularz + lista z usuwaniem) | `islands/LocationEditor.tsx` |
| `VerdictCard` | komponent SSR | `components/VerdictCard.tsx` |
| `DailyList` | komponent SSR | `components/DailyList.tsx` |
| `Hero` | komponent SSR | `components/Hero.tsx` |
| `FreshnessFooter` | komponent SSR | `components/FreshnessFooter.tsx` |

Zasada: wszystko co statyczne renderujemy serwerowo; islands tylko tam, gdzie potrzebna interakcja (wybór/edycja lokalizacji).

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

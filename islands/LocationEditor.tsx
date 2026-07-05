import { useEffect, useRef, useState } from "preact/hooks";
import type { Location } from "../lib/types.ts";

interface GeocodePlace {
  name: string;
  lat: number;
  lon: number;
}

/** Lista lokalizacji z usuwaniem + wyszukiwarka miejsc + GPS. */
export default function LocationEditor(
  { initialLocations }: { initialLocations: Location[] },
) {
  const [locations, setLocations] = useState(initialLocations);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodePlace[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GeocodePlace | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!searchOpen) return;
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    addEventListener("click", onClick);
    return () => removeEventListener("click", onClick);
  }, [searchOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = globalThis.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        if (res.ok) {
          setSuggestions(data.results ?? []);
          setSearchOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pick = (place: GeocodePlace) => {
    setSelected(place);
    setQuery(place.name);
    setSuggestions([]);
    setSearchOpen(false);
    setMessage(null);
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      setMessage({
        kind: "error",
        text: "Twoja przeglądarka nie obsługuje geolokalizacji.",
      });
      return;
    }

    setGpsBusy(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/geocode/reverse?lat=${latitude}&lon=${longitude}`,
          );
          const data = await res.json();
          if (!res.ok) {
            setMessage({
              kind: "error",
              text: data.error ?? "Nie udało się rozpoznać lokalizacji.",
            });
            return;
          }
          pick(data.place);
        } catch {
          setMessage({ kind: "error", text: "Błąd sieci — spróbuj ponownie." });
        } finally {
          setGpsBusy(false);
        }
      },
      (err) => {
        setGpsBusy(false);
        const text = err.code === err.PERMISSION_DENIED
          ? "Brak dostępu do lokalizacji — zezwól w ustawieniach przeglądarki."
          : err.code === err.POSITION_UNAVAILABLE
          ? "Nie udało się ustalić pozycji GPS."
          : "Przekroczono czas oczekiwania na GPS.";
        setMessage({ kind: "error", text });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  const add = async (e: Event) => {
    e.preventDefault();
    setMessage(null);

    if (!selected) {
      setMessage({
        kind: "error",
        text: "Wyszukaj miejscowość na liście albo użyj GPS.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          lat: selected.lat,
          lon: selected.lon,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: data.error ?? "Nie udało się dodać lokalizacji.",
        });
        return;
      }
      setLocations([...locations, data]);
      setQuery("");
      setSelected(null);
      setMessage({
        kind: "ok",
        text:
          "✅ Dodano. Prognoza pojawi się po następnym cyklu automatyzacji (do 1h).",
      });
    } catch {
      setMessage({ kind: "error", text: "Błąd sieci — spróbuj ponownie." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (loc: Location) => {
    if (!confirm(`Usunąć lokalizację „${loc.name}"?`)) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/locations/${loc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setMessage({
          kind: "error",
          text: data.error ?? "Nie udało się usunąć.",
        });
        return;
      }
      setLocations(locations.filter((l) => l.id !== loc.id));
      if (localStorage.getItem("pogodai_location") === loc.id) {
        localStorage.removeItem("pogodai_location");
      }
    } catch {
      setMessage({ kind: "error", text: "Błąd sieci — spróbuj ponownie." });
    }
  };

  return (
    <div class="flex flex-col gap-6">
      {locations.length === 0
        ? (
          <p class="text-white/70 text-center">
            Brak lokalizacji — dodaj pierwszą poniżej.
          </p>
        )
        : (
          <ul class="rounded-3xl bg-white/10 backdrop-blur border border-white/15 overflow-hidden divide-y divide-white/10">
            {locations.map((l) => (
              <li key={l.id} class="flex items-center gap-3 px-4 py-3">
                <span class="flex-1 font-medium">📍 {l.name}</span>
                <span class="text-xs text-white/50">
                  {l.lat.toFixed(2)}, {l.lon.toFixed(2)}
                </span>
                <button
                  type="button"
                  aria-label={`Usuń lokalizację ${l.name}`}
                  onClick={() =>
                    remove(l)}
                  class="rounded-xl px-3 py-2 min-h-11 hover:bg-red-500/20 transition"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}

      <form
        onSubmit={add}
        class="rounded-3xl bg-white/10 backdrop-blur border border-white/15 p-5 flex flex-col gap-3"
      >
        <h2 class="font-semibold">Dodaj lokalizację</h2>

        <button
          type="button"
          onClick={useGps}
          disabled={gpsBusy || busy}
          class="rounded-2xl bg-white/15 border border-white/20 px-4 py-3 text-sm font-medium hover:bg-white/25 transition disabled:opacity-50 min-h-11"
        >
          {gpsBusy
            ? "Szukam Twojej lokalizacji…"
            : "📍 Użyj mojej lokalizacji (GPS)"}
        </button>

        <div class="relative" ref={searchRef}>
          <label class="flex flex-col gap-1 text-sm">
            <span class="text-white/70">Szukaj miejscowości</span>
            <input
              type="search"
              value={query}
              autoComplete="off"
              aria-expanded={searchOpen && suggestions.length > 0}
              aria-controls="geocode-suggestions"
              onFocus={() => suggestions.length > 0 && setSearchOpen(true)}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setQuery(v);
                if (selected && v !== selected.name) setSelected(null);
              }}
              placeholder="np. Białołęka, Zakopane…"
              class="rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 placeholder-white/40 focus:outline-none focus:border-white/50 min-h-11"
            />
          </label>

          {searching && <p class="mt-1 text-xs text-white/50">Szukam…</p>}

          {searchOpen && suggestions.length > 0 && (
            <ul
              id="geocode-suggestions"
              role="listbox"
              class="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur border border-white/20 shadow-xl py-1"
            >
              {suggestions.map((s) => (
                <li key={`${s.lat}-${s.lon}-${s.name}`}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => pick(s)}
                    class="w-full px-4 py-3 text-left text-sm hover:bg-white/10 transition min-h-11"
                  >
                    <span class="font-medium">📍 {s.name}</span>
                    <span class="block text-xs text-white/50 mt-0.5">
                      {s.lat.toFixed(4)}, {s.lon.toFixed(4)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div class="rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm">
            <p class="font-medium">Wybrano: {selected.name}</p>
            <p class="text-xs text-white/50 mt-1">
              {selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !selected}
          class="rounded-2xl bg-white/20 px-5 py-3 font-medium hover:bg-white/30 transition disabled:opacity-50 min-h-11"
        >
          {busy ? "Dodawanie…" : "+ Dodaj"}
        </button>

        {message && (
          <p
            class={`text-sm ${
              message.kind === "ok" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}

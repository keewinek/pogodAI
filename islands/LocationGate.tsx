import { useEffect } from "preact/hooks";
import type { Location } from "../lib/types.ts";

const STORAGE_KEY = "pogodai_location";

/**
 * Panel wyboru lokalizacji na "/".
 * Przy montowaniu: jeśli w localStorage jest zapisana lokalizacja z listy,
 * przekierowuje natychmiast (location.replace — bez wpisu w historii).
 * Nieaktualny zapis (usunięta lokalizacja) jest czyszczony.
 */
export default function LocationGate({ locations }: { locations: Location[] }) {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    if (locations.some((l) => l.id === saved)) {
      location.replace("/" + saved);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const choose = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    location.href = "/" + id;
  };

  if (locations.length === 0) {
    return (
      <div class="text-center">
        <p class="text-white/80">Nie ma jeszcze żadnej lokalizacji.</p>
        <a
          href="/lokalizacje"
          class="mt-4 inline-block rounded-2xl bg-white/20 px-6 py-3 font-medium hover:bg-white/30 transition"
        >
          + Dodaj pierwszą lokalizację
        </a>
      </div>
    );
  }

  return (
    <div class="flex flex-col gap-3">
      {locations.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => choose(l.id)}
          class="w-full rounded-3xl bg-white/15 backdrop-blur border border-white/20 px-5 py-4 text-left text-lg font-medium shadow hover:bg-white/25 transition min-h-11"
        >
          📍 {l.name}
        </button>
      ))}
    </div>
  );
}

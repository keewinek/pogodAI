import { useEffect } from "preact/hooks";
import type { Location } from "../lib/types.ts";

const STORAGE_KEY = "pogodai_location";

/**
 * Panel wyboru lokalizacji na "/".
 * Przy montowaniu: jeśli w localStorage jest zapisana lokalizacja z listy,
 * przekierowuje natychmiast (location.replace — bez wpisu w historii).
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
      <div class="text-center grouped px-6 py-10">
        <p class="text-[17px] muted-strong">Brak lokalizacji</p>
        <a href="/lokalizacje" class="btn-primary inline-flex mt-6">
          Dodaj pierwszą
        </a>
      </div>
    );
  }

  return (
    <div class="grouped grouped-divider">
      {locations.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => choose(l.id)}
          class="grouped-row w-full text-left text-[17px] font-medium transition hover:bg-white/[0.04]"
        >
          {l.name}
          <span class="chevron ml-auto" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

import { useEffect } from "preact/hooks";
import { STORAGE_KEY } from "../lib/theme.ts";

interface LocationItem {
  id: string;
  name: string;
}

interface LocationGateProps {
  locations: LocationItem[];
  showPicker?: boolean;
  clearInvalid?: boolean;
}

export default function LocationGate(
  { locations, showPicker = false, clearInvalid = false }: LocationGateProps,
) {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const exists = locations.some((location) => location.id === saved);
    if (exists && !clearInvalid) {
      globalThis.location.replace(`/${saved}`);
      return;
    }

    if (!exists) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [locations, showPicker, clearInvalid]);

  if (!showPicker) return null;

  function selectLocation(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    globalThis.location.href = `/${id}`;
  }

  if (locations.length === 0) {
    return (
      <div class="text-center space-y-4 py-8">
        <p class="text-white/80">Brak lokalizacji w bazie.</p>
        <a
          href="/lokalizacje"
          class="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white/20 px-6 py-3 font-medium"
        >
          Dodaj pierwszą lokalizację
        </a>
      </div>
    );
  }

  return (
    <ul class="space-y-3">
      {locations.map((location) => (
        <li key={location.id}>
          <button
            type="button"
            onClick={() => selectLocation(location.id)}
            class="w-full min-h-14 rounded-3xl bg-white/10 backdrop-blur px-5 py-4 text-left text-lg font-medium transition hover:bg-white/20 active:scale-[0.99]"
          >
            📍 {location.name}
          </button>
        </li>
      ))}
    </ul>
  );
}

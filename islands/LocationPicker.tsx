import { useEffect, useRef, useState } from "preact/hooks";
import { STORAGE_KEY } from "../lib/theme.ts";

interface LocationItem {
  id: string;
  name: string;
}

interface LocationPickerProps {
  locations: LocationItem[];
  currentId: string;
  currentName: string;
}

export default function LocationPicker(
  { locations, currentId, currentName }: LocationPickerProps,
) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  function selectLocation(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    globalThis.location.href = `/${id}`;
  }

  return (
    <div ref={containerRef} class="relative">
      <button
        type="button"
        aria-label="Wybierz lokalizację"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        class="mx-auto flex min-h-11 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur"
      >
        <span>📍 {currentName}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div class="absolute left-1/2 z-20 mt-2 w-full max-w-xs -translate-x-1/2 rounded-3xl bg-slate-900/95 p-2 shadow-xl backdrop-blur">
          <ul>
            {locations.map((location) => (
              <li key={location.id}>
                <button
                  type="button"
                  onClick={() => selectLocation(location.id)}
                  class={`w-full rounded-2xl px-4 py-3 text-left text-sm ${
                    location.id === currentId
                      ? "bg-white/15 font-semibold"
                      : "hover:bg-white/10"
                  }`}
                >
                  📍 {location.name}
                </button>
              </li>
            ))}
          </ul>
          <div class="mt-1 border-t border-white/10 pt-1">
            <a
              href="/lokalizacje"
              class="block rounded-2xl px-4 py-3 text-sm text-white/70 hover:bg-white/10"
            >
              Edytuj lokalizacje…
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

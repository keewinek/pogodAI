import { useEffect, useRef, useState } from "preact/hooks";
import { isLightTheme, STORAGE_KEY, type WeatherTheme } from "../lib/theme.ts";

interface LocationItem {
  id: string;
  name: string;
}

interface LocationPickerProps {
  locations: LocationItem[];
  currentId: string;
  currentName: string;
  theme: WeatherTheme;
}

export default function LocationPicker(
  { locations, currentId, currentName, theme }: LocationPickerProps,
) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const light = isLightTheme(theme);

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

  const triggerClass = light
    ? "bg-white/80 text-slate-900 border border-white/60 shadow-sm"
    : "bg-white/15 text-white border border-white/10";

  return (
    <div ref={containerRef} class="relative z-30">
      <button
        type="button"
        aria-label="Wybierz lokalizację"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        class={`mx-auto flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium backdrop-blur ${triggerClass}`}
      >
        <span>📍 {currentName}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div
          role="listbox"
          class="absolute left-1/2 z-20 mt-2 w-[min(100vw-2rem,20rem)] -translate-x-1/2 rounded-3xl bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl"
        >
          <ul>
            {locations.map((location) => (
              <li key={location.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={location.id === currentId}
                  onClick={() => selectLocation(location.id)}
                  class={`w-full rounded-2xl px-4 py-3 text-left text-sm text-white ${
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
              ⚙️ Edytuj lokalizacje…
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

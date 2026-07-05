import { define } from "../utils.ts";

export default define.page(function NotFound() {
  return (
    <main class="max-w-md mx-auto px-4 py-24 text-center flex flex-col gap-6 items-center">
      <div class="text-6xl" aria-hidden="true">🌫️</div>
      <h1 class="text-2xl font-bold">Nie znaleziono strony</h1>
      <p class="text-white/70">
        Ta lokalizacja nie istnieje albo została usunięta.
      </p>
      <a
        href="/"
        class="rounded-2xl bg-white/20 px-6 py-3 font-medium hover:bg-white/30 transition"
      >
        Wybierz lokalizację
      </a>
    </main>
  );
});

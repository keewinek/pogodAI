import { define } from "../utils.ts";
import NotFoundCleanup from "../islands/NotFoundCleanup.tsx";

export default define.page(function NotFound() {
  return (
    <main class="max-w-md mx-auto px-5 py-24 text-center flex flex-col gap-8 items-center">
      <NotFoundCleanup />
      <h1 class="text-[28px] font-semibold tracking-tight">
        Nie znaleziono
      </h1>
      <p class="text-[17px] muted max-w-xs leading-relaxed">
        Ta lokalizacja nie istnieje albo została usunięta.
      </p>
      <a href="/" class="btn-primary inline-flex">
        Wybierz lokalizację
      </a>
    </main>
  );
});

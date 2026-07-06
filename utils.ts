import { createDefine } from "fresh";
import type { Theme } from "@/lib/display.ts";

// Stan współdzielony między middleware, layoutami i stronami.
export interface State {
  theme?: Theme;
  title?: string;
}

export const define = createDefine<State>();

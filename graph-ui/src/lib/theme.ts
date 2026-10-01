import * as React from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "cbm-theme";

function readStored(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* storage can be blocked; fall back to following the OS */
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Toggle the class that drives every colour token, and report the result. */
export function applyTheme(preference: ThemePreference): boolean {
  const dark = preference === "system" ? systemPrefersDark() : preference === "dark";
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared store.

   Several independent places need to know the current theme at once: the
   header toggle, the 3D scene, anything else branching on it. A per-hook
   useState gives each of them its own copy, so a change made in one leaves
   the others stale — the chrome flips while the canvas keeps the old look.
   One module-level state plus a subscriber set keeps every consumer in step;
   it mirrors the pattern already used for language in lib/i18n.ts.
   ───────────────────────────────────────────────────────────────────────── */

type Listener = (preference: ThemePreference, isDark: boolean) => void;

const listeners = new Set<Listener>();
let preference: ThemePreference = readStored();
let isDark = applyTheme(preference);

function emit() {
  for (const listener of listeners) listener(preference, isDark);
}

/* Keep "system" honest when the OS switches appearance mid-session. */
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (preference !== "system") return;
      const next = applyTheme("system");
      if (next === isDark) return;
      isDark = next;
      emit();
    });
}

export function setTheme(next: ThemePreference) {
  preference = next;
  isDark = applyTheme(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* a blocked storage only means the choice does not survive a reload */
  }
  emit();
}

export function useTheme() {
  const [state, setState] = React.useState({ preference, isDark });

  React.useEffect(() => {
    const listener: Listener = (nextPreference, nextIsDark) =>
      setState({ preference: nextPreference, isDark: nextIsDark });
    listeners.add(listener);
    /* Re-sync in case the store moved between render and effect. */
    setState({ preference, isDark });
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { ...state, setPreference: setTheme };
}

/* ─────────────────────────────────────────────────────────────────────────
   Scene look.

   The 3D view cannot read CSS variables, so it gets an explicit per-theme
   description of how the same data should be rendered.

   The dark look is the original: additive edges, nodes pushed above 1.0 so
   bloom builds a glow corona, no outlines. It only works on a dark
   background — additive blending on white clips to white, and the glow
   bleeds into a wash.

   The light look inverts those choices: flat nodes with more saturation and
   slightly less value so pale colours still read on white, a dark rim
   behind every node to give it a real edge, and normal-blended edges dark
   enough to be seen at all.
   ───────────────────────────────────────────────────────────────────────── */

export interface SceneLook {
  background: string;
  bloomThreshold: number;
  bloomSmoothing: number;
  bloomScale: number;
  /** Multiplier on the per-node glow boost; 0 removes the corona entirely. */
  glowBoost: number;
  /** >1 saturates, <1 desaturates. */
  saturation: number;
  /** Multiplies HSL value; <1 darkens, which is what white backgrounds need. */
  value: number;
  /** Outline sphere scale; 0 disables the rim pass. */
  rimScale: number;
  rimColor: string;
  rimOpacity: number;
  edgeAdditive: boolean;
  /** Extra edge intensity, since normal blending stacks far less than additive. */
  edgeInk: number;
  /** 0 keeps edge-type hues, 1 pulls them all toward neutral ink. */
  edgeNeutral: number;
  /** Multiplier on the label texture colour. */
  labelValue: number;
  labelInk: string;
}

export const DARK_LOOK: SceneLook = {
  background: "#06090f",
  bloomThreshold: 0.3,
  bloomSmoothing: 0.7,
  bloomScale: 1,
  glowBoost: 1,
  saturation: 1,
  value: 1,
  rimScale: 0,
  rimColor: "#000000",
  rimOpacity: 0,
  edgeAdditive: true,
  edgeInk: 1,
  edgeNeutral: 0,
  labelValue: 1,
  labelInk: "#ffffff",
};

export const LIGHT_LOOK: SceneLook = {
  background: "#f4f6fa",
  bloomThreshold: 0.92,
  bloomSmoothing: 0.12,
  bloomScale: 0.22,
  glowBoost: 0,
  saturation: 1.28,
  value: 0.86,
  /* A thin dark contour, not a second ball: any more and it swallows the
   * node colour the label encoding depends on. */
  rimScale: 1.16,
  rimColor: "#243244",
  rimOpacity: 0.34,
  edgeAdditive: false,
  /* Normal blending already carries far more than additive-on-black, so the
   * ink stays low; pulling most of the way to neutral keeps a 5000-edge cloud
   * from turning into a grey scribble. */
  edgeInk: 0.8,
  edgeNeutral: 0.62,
  labelValue: 0.62,
  labelInk: "#1f2b3a",
};

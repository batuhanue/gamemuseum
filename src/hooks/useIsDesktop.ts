"use client";
import { useSyncExternalStore } from "react";

const query = "(min-width: 1024px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(query);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** Desktop and mobile get different layouts (not a scaled-down copy). */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);
}

import { useCallback, useSyncExternalStore } from "react";

const COOKIE_KEY = "listingViewMode";

type ViewMode = "grid" | "list";

// Module-level client store. `null` means: no client-side change yet, so
// reads fall back to the SSR-provided `initialMode`. This is what keeps
// SSR and the first hydrated client render byte-identical (no localStorage
// read during initial hydration) and prevents the grid <-> list DOM swap.
let currentMode: ViewMode | null = null;
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

const subscribe = (callback: () => void) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};

const writeCookie = (mode: ViewMode) => {
  if (typeof document === "undefined") return;
  // 1 year, root path. Used by server pages to pre-render the correct
  // variant so first paint matches what the user previously chose.
  document.cookie = `${COOKIE_KEY}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
};

const persistMode = (next: ViewMode) => {
  currentMode = next;
  writeCookie(next);
  notifySubscribers();
};

export function useListingViewMode(initialMode: ViewMode = "grid") {
  // Both snapshots return `initialMode` until the user explicitly toggles.
  // The cookie is only WRITTEN on the client; it's read on the server and
  // threaded back through `initialMode`. This avoids any post-hydration
  // re-render caused by reading client-only storage.
  const getSnapshot = (): ViewMode => currentMode ?? initialMode;
  const getServerSnapshot = (): ViewMode => initialMode;

  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = useCallback(
    (next: ViewMode | ((current: ViewMode) => ViewMode)) => {
      const base = currentMode ?? initialMode;
      const resolved = typeof next === "function" ? next(base) : next;
      persistMode(resolved);
    },
    [initialMode]
  );

  return { mode, setMode };
}

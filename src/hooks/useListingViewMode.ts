import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "listingViewMode";

type ViewMode = "grid" | "list";

const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

const subscribe = (callback: () => void) => {
  subscribers.add(callback);

  if (typeof window !== "undefined") {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        callback();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      subscribers.delete(callback);
      window.removeEventListener("storage", handleStorage);
    };
  }

  return () => {
    subscribers.delete(callback);
  };
};

const getSnapshot = (): ViewMode => {
  if (typeof window === "undefined") return "grid";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "list" || stored === "grid" ? stored : "grid";
};

const getServerSnapshot = (): ViewMode => "grid";

const persistMode = (next: ViewMode) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, next);
  notifySubscribers();
};

export function useListingViewMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = useCallback(
    (next: ViewMode | ((current: ViewMode) => ViewMode)) => {
      const resolved = typeof next === "function" ? next(getSnapshot()) : next;
      persistMode(resolved);
    },
    []
  );

  return { mode, setMode };
}

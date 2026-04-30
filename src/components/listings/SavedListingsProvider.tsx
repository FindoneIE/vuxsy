"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type ToggleResult = {
  saved: boolean | null;
  error?: string;
};

type SavedListingsContextValue = {
  savedIds: Set<string>;
  pendingIds: Set<string>;
  count: number;
  isLoaded: boolean;
  refreshSaved: () => Promise<void>;
  isSaved: (listingId: string, fallback?: boolean | null) => boolean;
  toggleSaved: (listingId: string) => Promise<ToggleResult>;
};

const SavedListingsContext = React.createContext<SavedListingsContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "savedListingIds";

const readSessionCache = () => {
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string")
      : [];
  } catch {
    return [] as string[];
  }
};

const writeSessionCache = (ids: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore cache issues
  }
};

const clearSessionCache = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore cache issues
  }
};

export function SavedListingsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [savedIds, setSavedIds] = React.useState<Set<string>>(() => new Set());
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = React.useState(false);

  const refreshSaved = React.useCallback(async () => {
    if (!user?.id) {
      setSavedIds(new Set());
      setIsLoaded(true);
      clearSessionCache();
      return;
    }

    try {
      const response = await fetch("/api/saved", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setIsLoaded(true);
        return;
      }
      const payload = (await response.json()) as { items?: { id?: string }[] };
      const ids = (payload.items ?? [])
        .map((item) => item.id)
        .filter((value): value is string => Boolean(value));
      const next = new Set(ids);
      setSavedIds(next);
      writeSessionCache(next);
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, [user?.id]);

  React.useEffect(() => {
    if (loading) return;
    queueMicrotask(() => {
      void refreshSaved();
    });
  }, [loading, refreshSaved]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = readSessionCache();
    if (cached.length === 0) return;
    queueMicrotask(() => {
      setSavedIds(new Set(cached));
    });
  }, []);

  const toggleSaved = React.useCallback<SavedListingsContextValue["toggleSaved"]>(
    async (listingId) => {
      if (!user?.id) {
        return { saved: null, error: "not-authenticated" };
      }

      if (pendingIds.has(listingId)) {
        return { saved: savedIds.has(listingId) };
      }

      setPendingIds((prev) => new Set(prev).add(listingId));

      let optimisticSaved = false;
      setSavedIds((prev) => {
        const next = new Set(prev);
        optimisticSaved = !next.has(listingId);
        if (optimisticSaved) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        writeSessionCache(next);
        return next;
      });

      try {
        const response = await fetch("/api/saved/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });

        if (!response.ok) {
          throw new Error("Failed to toggle");
        }

        const data = (await response.json()) as { saved?: boolean };
        const saved = typeof data.saved === "boolean" ? data.saved : optimisticSaved;

        if (saved !== optimisticSaved) {
          setSavedIds((prev) => {
            const next = new Set(prev);
            if (saved) {
              next.add(listingId);
            } else {
              next.delete(listingId);
            }
            writeSessionCache(next);
            return next;
          });
        }

        return { saved };
      } catch {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (optimisticSaved) {
            next.delete(listingId);
          } else {
            next.add(listingId);
          }
          writeSessionCache(next);
          return next;
        });

        return { saved: !optimisticSaved, error: "request-failed" };
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      }
    },
    [pendingIds, savedIds, user?.id]
  );

  const value = React.useMemo<SavedListingsContextValue>(
    () => ({
      savedIds,
      pendingIds,
      count: savedIds.size,
      isLoaded,
      refreshSaved,
      isSaved: (listingId, fallback) =>
        savedIds.has(listingId) || (!isLoaded && Boolean(fallback)),
      toggleSaved,
    }),
    [savedIds, pendingIds, isLoaded, refreshSaved, toggleSaved]
  );

  return (
    <SavedListingsContext.Provider value={value}>
      {children}
    </SavedListingsContext.Provider>
  );
}

export function useSavedListings() {
  const context = React.useContext(SavedListingsContext);
  if (!context) {
    throw new Error("useSavedListings must be used within SavedListingsProvider");
  }
  return context;
}

import { useEffect, useState } from "react";

const STORAGE_KEY = "listingViewMode";

export function useListingViewMode() {
  const [mode, setMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "list" || stored === "grid" ? stored : "grid";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return { mode, setMode };
}

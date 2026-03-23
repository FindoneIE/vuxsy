"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

export type QuickSearchTab = "/services" | "/requests" | "/marketplace";

type UseQuickSearchOptions = {
  syncWithHeroTabs?: boolean;
};

function deriveTabFromPath(pathname?: string | null): QuickSearchTab {
  if (!pathname || pathname === "/") return "/services";
  if (pathname.startsWith("/requests")) return "/requests";
  if (pathname.startsWith("/marketplace")) return "/marketplace";
  if (pathname.startsWith("/services")) return "/services";
  return "/services";
}

function getStoredTab(): QuickSearchTab | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    const stored = sessionStorage.getItem("heroActiveTab");
    if (stored === "/services" || stored === "/requests" || stored === "/marketplace") {
      return stored;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function useQuickSearch(options: UseQuickSearchOptions = {}) {
  const { syncWithHeroTabs = true } = options;
  const pathname = usePathname();
  const router = useRouter();

  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [county, setCounty] = React.useState<string | undefined>(undefined);
  const [area, setArea] = React.useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<QuickSearchTab>(() => {
    const derived = deriveTabFromPath(pathname);
    return syncWithHeroTabs ? getStoredTab() ?? derived : derived;
  });

  React.useEffect(() => {
    const derived = deriveTabFromPath(pathname);
    if (!syncWithHeroTabs) {
      setActiveTab(derived);
      return;
    }
    const stored = getStoredTab();
    setActiveTab(stored ?? derived);
  }, [pathname, syncWithHeroTabs]);

  React.useEffect(() => {
    setIsLoading(false);
  }, [pathname]);

  const selectTab = React.useCallback(
    (tab: QuickSearchTab) => {
      setActiveTab(tab);
      if (!syncWithHeroTabs) return;
      try {
        sessionStorage.setItem("heroActiveTab", tab);
        window.dispatchEvent(new CustomEvent("hero:tab-change", { detail: tab }));
      } catch {
        // ignore
      }
    },
    [syncWithHeroTabs]
  );

  React.useEffect(() => {
    if (!syncWithHeroTabs) return undefined;

    function onTabChange(e: Event) {
      try {
        const href = (e as CustomEvent<string>).detail as QuickSearchTab | undefined;
        if (href) setActiveTab(href);
      } catch {
        // ignore
      }
    }

    try {
      window.addEventListener("hero:tab-change", onTabChange as EventListener);
    } catch {
      // ignore
    }

    return () => {
      try {
        window.removeEventListener("hero:tab-change", onTabChange as EventListener);
      } catch {
        // ignore
      }
    };
  }, [syncWithHeroTabs]);

  const [listingCount, setListingCount] = React.useState<number | null>(null);
  const hasCategorySelection = Boolean(category);

  React.useEffect(() => {
    let abort = false;
    let controller: AbortController | null = null;

    async function fetchListingCount() {
      if (!hasCategorySelection) {
        setListingCount(null);
        return;
      }
      setListingCount(null);

      try {
        controller = new AbortController();
        const params = new URLSearchParams();
        const mode =
          activeTab === "/requests"
            ? "requests"
            : activeTab === "/marketplace"
            ? "marketplace"
            : "services";
        params.set("mode", mode);
        if (category) params.set("category", category);
        if (county) params.set("county", county);
        if (area) params.set("area", area);

        const res = await fetch(`/api/listing-count?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (abort) return;
        const c = Number(data?.count);
        setListingCount(Number.isFinite(c) ? c : 0);
      } catch {
        // ignore fetch errors
      }
    }

    fetchListingCount();

    return () => {
      abort = true;
      if (controller) controller.abort();
    };
  }, [activeTab, category, county, area, hasCategorySelection]);

  function onSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("keyword", q);
    if (category) params.set("category", category);
    if (county) params.set("county", county);
    if (area) params.set("area", area);

    const qs = params.toString();
    const base = activeTab ?? "/services";
    router.push(`${base}${qs ? `?${qs}` : ""}`);
  }

  return {
    q,
    setQ,
    category,
    setCategory,
    county,
    setCounty,
    area,
    setArea,
    activeTab,
    selectTab,
    isLoading,
    listingCount,
    hasCategorySelection,
    onSearch,
  };
}

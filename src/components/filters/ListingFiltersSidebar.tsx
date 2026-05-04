"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LocationFields from "@/components/location/LocationFields";
import { cn } from "@/lib/utils";
import { CATEGORIES_BY_MODE } from "./categories";

type Mode = "services" | "requests" | "marketplace";

type ListingFiltersSidebarProps = {
  mode?: Mode;
  // optional override for base path used when pushing URLs (defaults to `/${mode}`)
  basePath?: string;
  variant?: "sidebar" | "drawer";
  headerActions?: React.ReactNode;
  onCategoryChange?: (category: string | null) => void;
};

export default function ListingFiltersSidebar({
  mode = "services",
  basePath,
  variant = "sidebar",
  headerActions,
  onCategoryChange,
}: ListingFiltersSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categories = CATEGORIES_BY_MODE[mode];

  // single-select category state (keeps URL in sync)
  const [activeCategory, setActiveCategory] = React.useState<string | null>(
    () => searchParams?.get("category") ?? null
  );

  // counts start at 0 for all categories and update live via API refreshes
  const initialCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => (map[c.id] = 0));
    return map;
  }, [categories]);

  const [counts, setCounts] = React.useState<Record<string, number>>(initialCounts);

  const refreshCounts = React.useCallback(async () => {
    try {
      window.dispatchEvent(
        new CustomEvent("listing:counts-fetch", {
          detail: { mode },
        })
      );
      const res = await fetch(`/api/category-counts?mode=${mode}`);
      if (!res.ok) return;
      const data = (await res.json()) as { counts?: Record<string, number> };
      if (!data?.counts) return;
      setCounts((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          next[key] = data.counts?.[key] ?? 0;
        });
        return next;
      });
    } catch {
      // ignore fetch errors
    } finally {
      // no-op
    }
  }, [mode]);

  // Sync local state when URL changes (e.g., back/forward navigation)
  React.useEffect(() => {
    queueMicrotask(() => setActiveCategory(searchParams?.get("category") ?? null));
  }, [searchParams]);

  React.useEffect(() => {
    queueMicrotask(() => refreshCounts());

    function handleRefresh() {
      queueMicrotask(() => refreshCounts());
    }

    window.addEventListener("listing:added", handleRefresh as EventListener);
    window.addEventListener("listing:removed", handleRefresh as EventListener);
    window.addEventListener("listing:counts", handleRefresh as EventListener);
    window.addEventListener("listing:updated", handleRefresh as EventListener);

    return () => {
      window.removeEventListener("listing:added", handleRefresh as EventListener);
      window.removeEventListener("listing:removed", handleRefresh as EventListener);
      window.removeEventListener("listing:counts", handleRefresh as EventListener);
      window.removeEventListener("listing:updated", handleRefresh as EventListener);
    };
  }, [refreshCounts]);

  function handleCategoryClick(id: string) {
    const next = activeCategory === id ? null : id;
    setActiveCategory(next);
    onCategoryChange?.(next);

    window.dispatchEvent(
      new CustomEvent("listing:category-click", {
        detail: { category: next, navigationMethod: "history.pushState" },
      })
    );

    // Build new search params while preserving other params
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next) {
      params.set("category", next);
    } else {
      params.delete("category");
    }

    const qs = params.toString();
    // Determine target base path: prefer provided basePath, otherwise use mode-based path
    const targetBase = basePath ?? `/${mode}`;
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `${targetBase}${qs ? `?${qs}` : ""}`);
    }
  }

  function handleCountyChange(value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) params.set("county", value);
    else params.delete("county");
    // clear area when county changes
    params.delete("area");
    const qs = params.toString();
    const targetBase = basePath ?? `/${mode}`;
    router.push(`${targetBase}${qs ? `?${qs}` : ""}`);
  }

  function handleAreaChange(value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) params.set("area", value);
    else params.delete("area");
    const qs = params.toString();
    const targetBase = basePath ?? `/${mode}`;
    router.push(`${targetBase}${qs ? `?${qs}` : ""}`);
  }

  // refs for inputs/checkboxes so Clear can reset them without introducing re-renders
  const priceMinRef = React.useRef<HTMLInputElement | null>(null);
  const priceMaxRef = React.useRef<HTMLInputElement | null>(null);
  const sellerBusinessRef = React.useRef<HTMLInputElement | null>(null);
  const sellerPrivateRef = React.useRef<HTMLInputElement | null>(null);
  const ratingRef = React.useRef<HTMLInputElement | null>(null);

  function handleClear() {
    // Build params copy and remove only the allowed keys.
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    // Reset location filters
    params.delete("county");
    params.delete("area");

    // Remove common price param names (soft-delete for safety)
    [
      "price_min",
      "price_max",
      "min_price",
      "max_price",
      "priceMin",
      "priceMax",
      "min",
      "max",
    ].forEach((k) => params.delete(k));

    // Remove common seller/rating param names
    ["seller", "sellerType", "seller_type", "rating", "min_rating", "rating_gte"].forEach((k) => params.delete(k));

    // Preserve category and any other unrelated params. Push new URL.
  const qs = params.toString();
  const targetBase = basePath ?? `/${mode}`;
  router.push(`${targetBase}${qs ? `?${qs}` : ""}`);

    // Reset DOM inputs/checkboxes directly to avoid re-renders or layout shifts
    try {
      if (priceMinRef.current) priceMinRef.current.value = "";
      if (priceMaxRef.current) priceMaxRef.current.value = "";
      if (sellerBusinessRef.current) sellerBusinessRef.current.checked = false;
      if (sellerPrivateRef.current) sellerPrivateRef.current.checked = false;
      if (ratingRef.current) ratingRef.current.checked = false;
    } catch {
      // swallow any errors - clearing inputs is best-effort and should not block navigation
    }
  }

  const showDividers = variant === "sidebar";

  return (
    <aside
      className={cn(
        "filters-sidebar",
        variant === "drawer" ? "filters-sidebar--drawer" : "card card--padded"
      )}
    >
      <div className="filters-sidebar__header">
        <div className="filters-sidebar__label">Filters</div>
        <div className="filters-sidebar__header-actions">
          <button className="filters-sidebar__clear" type="button" onClick={handleClear}>
            Clear
          </button>
          {headerActions}
        </div>
      </div>

      {showDividers && <div className="filters-sidebar__divider" />}

  <div className="filters-sidebar__section">
        <div className="filters-sidebar__category-list">
          {categories.map((c) => {
            const active = activeCategory === c.id;
            const count = counts[c.id] ?? 0;
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => handleCategoryClick(c.id)}
                onKeyDown={(e) => e.key === "Enter" && handleCategoryClick(c.id)}
                className={cn(
                  "filters-sidebar__category-row text-gray-800 hover:bg-gray-50 transition-colors duration-150",
                  active && "is-active bg-primary/10 text-primary ring-1 ring-primary/15"
                )}
              >
                <span className="filters-sidebar__category-icon">
                  <c.Icon
                    className={cn(
                      "w-6 h-6 sm:w-7 sm:h-7 shrink-0"
                    )}
                    color="currentColor"
                    weight={active ? "fill" : "regular"}
                    aria-hidden
                  />
                </span>
                <span className="filters-sidebar__category-label">{c.label}</span>
                <span className="filters-sidebar__category-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

  {showDividers && <div className="filters-sidebar__divider" />}

      <div className="filters-sidebar__section">
        <div className="filters-sidebar__label">Location</div>
        <div className="filters-sidebar__location">
          <LocationFields
            county={searchParams?.get("county") ?? undefined}
            area={searchParams?.get("area") ?? undefined}
            onCountyChange={handleCountyChange}
            onAreaChange={handleAreaChange}
          />
        </div>
      </div>

  {showDividers && <div className="filters-sidebar__divider" />}

      <div className="filters-sidebar__section">
        <div className="filters-sidebar__label">Price</div>
        <div className="filters-sidebar__field-grid">
          <input ref={priceMinRef} className="input" placeholder="Min" />
          <input ref={priceMaxRef} className="input" placeholder="Max" />
        </div>
      </div>

  {showDividers && <div className="filters-sidebar__divider" />}

      <div className="filters-sidebar__section">
        <div className="filters-sidebar__label">Seller type</div>
        <label className="filters-sidebar__checkbox-row">
          <input ref={sellerBusinessRef} type="checkbox" aria-label="Business seller" />
          <span>Business seller</span>
        </label>
        <label className="filters-sidebar__checkbox-row">
          <input ref={sellerPrivateRef} type="checkbox" aria-label="Private seller" />
          <span>Private seller</span>
        </label>
      </div>

  {showDividers && <div className="filters-sidebar__divider" />}

      <div className="filters-sidebar__section">
        <div className="filters-sidebar__label">Rating</div>
        <label className="filters-sidebar__checkbox-row">
          <input ref={ratingRef} type="checkbox" aria-label="4+ rated sellers only" />
          <span>4+ rated sellers only</span>
        </label>
      </div>
    </aside>
  );
}

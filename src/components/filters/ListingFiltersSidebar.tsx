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
  initialCounts?: Record<string, number>;
  headerActions?: React.ReactNode;
  onCategoryChange?: (category: string | null) => void;
};

export default function ListingFiltersSidebar({
  mode = "services",
  basePath,
  variant = "sidebar",
  initialCounts,
  headerActions,
  onCategoryChange,
}: ListingFiltersSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categories = CATEGORIES_BY_MODE[mode];

  const targetBase = basePath ?? `/${mode}`;

  const currentPriceMin =
    searchParams?.get("price_min") ??
    searchParams?.get("min_price") ??
    searchParams?.get("priceMin") ??
    "";
  const currentPriceMax =
    searchParams?.get("price_max") ??
    searchParams?.get("max_price") ??
    searchParams?.get("priceMax") ??
    "";
  const currentSellerParam =
    searchParams?.get("seller_type") ??
    searchParams?.get("sellerType") ??
    searchParams?.get("seller") ??
    "";
  const parsedSellerTypes = currentSellerParam
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is "business" | "private" => value === "business" || value === "private");

  // single-select category state (keeps URL in sync)
  const [activeCategory, setActiveCategory] = React.useState<string | null>(
    () => searchParams?.get("category") ?? null
  );

  // counts start at 0 for all categories and update live via API refreshes
  const defaultCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => (map[c.id] = 0));
    return map;
  }, [categories]);

  const [counts, setCounts] = React.useState<Record<string, number>>(() => {
    const seeded: Record<string, number> = { ...defaultCounts };
    categories.forEach((category) => {
      seeded[category.id] = initialCounts?.[category.id] ?? seeded[category.id] ?? 0;
    });
    return seeded;
  });
  const businessChecked = parsedSellerTypes.includes("business");
  const privateChecked = parsedSellerTypes.includes("private");

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
      const nextCounts: Record<string, number> = {};
      categories.forEach((category) => {
        nextCounts[category.id] = data.counts?.[category.id] ?? 0;
      });
      setCounts(nextCounts);
      queueMicrotask(() => {
        window.dispatchEvent(
          new CustomEvent("listing:counts-updated", {
            detail: { mode },
          })
        );
      });
    } catch {
      // ignore fetch errors
    } finally {
      // no-op
    }
  }, [categories, mode, setCounts]);

  // Sync local state when URL changes (e.g., back/forward navigation)
  React.useEffect(() => {
    queueMicrotask(() => setActiveCategory(searchParams?.get("category") ?? null));
  }, [searchParams]);

  const pushParams = React.useCallback(
    (nextParams: URLSearchParams) => {
      const qs = nextParams.toString();
      router.push(`${targetBase}${qs ? `?${qs}` : ""}`);
    },
    [router, targetBase]
  );

  const applySellerTypes = React.useCallback(
    (nextBusiness: boolean, nextPrivate: boolean) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      ["seller", "sellerType", "seller_type"].forEach((key) => params.delete(key));

      const selected: string[] = [];
      if (nextBusiness) selected.push("business");
      if (nextPrivate) selected.push("private");

      if (selected.length > 0) {
        params.set("seller_type", selected.join(","));
      }

      pushParams(params);
    },
    [pushParams, searchParams]
  );

  const applyPriceFilter = React.useCallback(
    (field: "price_min" | "price_max", value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      ["price_min", "price_max", "min_price", "max_price", "priceMin", "priceMax", "min", "max"].forEach(
        (key) => {
          if (key === field) return;
          if (field === "price_min" && ["min_price", "priceMin", "min"].includes(key)) params.delete(key);
          if (field === "price_max" && ["max_price", "priceMax", "max"].includes(key)) params.delete(key);
        }
      );

      if (!value.trim()) {
        params.delete(field);
        if (field === "price_min") {
          ["min_price", "priceMin", "min"].forEach((key) => params.delete(key));
        }
        if (field === "price_max") {
          ["max_price", "priceMax", "max"].forEach((key) => params.delete(key));
        }
        pushParams(params);
        return;
      }

      if (!/^\d*(\.\d*)?$/.test(value)) {
        return;
      }

      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        return;
      }

      params.set(field, String(parsed));
      pushParams(params);
    },
    [pushParams, searchParams]
  );

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
    router.push(`${targetBase}${qs ? `?${qs}` : ""}`);
  }

  function handleAreaChange(value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) params.set("area", value);
    else params.delete("area");
    const qs = params.toString();
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
                <span className="filters-sidebar__category-label">
                  {c.label}
                </span>
                <span className="filters-sidebar__category-count">
                  {count}
                </span>
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
          <input
            ref={priceMinRef}
            className="input"
            placeholder="Min"
            inputMode="decimal"
            type="number"
            min="0"
            step="any"
            value={currentPriceMin}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (!/^\d*(\.\d*)?$/.test(nextValue) && nextValue !== "") return;
              applyPriceFilter("price_min", nextValue);
            }}
          />
          <input
            ref={priceMaxRef}
            className="input"
            placeholder="Max"
            inputMode="decimal"
            type="number"
            min="0"
            step="any"
            value={currentPriceMax}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (!/^\d*(\.\d*)?$/.test(nextValue) && nextValue !== "") return;
              applyPriceFilter("price_max", nextValue);
            }}
          />
        </div>
      </div>

  {showDividers && <div className="filters-sidebar__divider" />}

      <div className="filters-sidebar__section">
        <div className="filters-sidebar__label">Seller type</div>
        <label className="filters-sidebar__checkbox-row">
          <input
            ref={sellerBusinessRef}
            type="checkbox"
            aria-label="Business seller"
            checked={businessChecked}
            onChange={(event) => {
              const next = event.target.checked;
              applySellerTypes(next, privateChecked);
            }}
          />
          <span>Business seller</span>
        </label>
        <label className="filters-sidebar__checkbox-row">
          <input
            ref={sellerPrivateRef}
            type="checkbox"
            aria-label="Private seller"
            checked={privateChecked}
            onChange={(event) => {
              const next = event.target.checked;
              applySellerTypes(businessChecked, next);
            }}
          />
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

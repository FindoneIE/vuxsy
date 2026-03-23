"use client";

import * as React from "react";
import CountySelect from "@/components/location/CountySelect";
import AreaSelect from "@/components/location/AreaSelect";
import { CATEGORIES } from "@/components/filters/categories";
import { useQuickSearch } from "@/hooks/useQuickSearch";

export default function HeroSearch() {
  const {
    q,
    setQ,
    category,
    setCategory,
    county,
    setCounty,
    area,
    setArea,
    activeTab,
    isLoading,
    listingCount,
    hasCategorySelection,
    onSearch,
  } = useQuickSearch();

  return (
    <form onSubmit={onSearch} style={{ marginTop: 18 }}>
      {/* Stacked vertical layout to match original hero card design */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          className="input"
          name="q"
          placeholder="Search keywords, e.g. plumber, lawn care"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="select"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <CountySelect
          value={county ?? ""}
          onChange={(v) => {
            setCounty(v || undefined);
            setArea(undefined);
          }}
          ariaLabel="County"
          className="select"
        />

        <AreaSelect
          county={county}
          value={area ?? ""}
          onChange={(v) => setArea(v || undefined)}
          ariaLabel="Area"
          placeholder="All areas"
          className="select"
        />

        <button
          type="submit"
          className="btn btn--primary"
          disabled={isLoading || (hasCategorySelection && listingCount === 0)}
          aria-busy={isLoading}
        >
          <span className="btn__content">
            {isLoading && <span className="spinner" aria-hidden />}
            {
              // Button label follows the active tab and shows count only after filters.
              (() => {
                const tab = activeTab === "/requests" ? "requests" : activeTab === "/marketplace" ? "marketplace" : "services";
                if (!hasCategorySelection || listingCount == null) return `Search ${tab}`;
                if (listingCount === 0) return `Search ${tab}`;
                return `Search ${listingCount} ${tab}`;
              })()
            }
          </span>
        </button>
      </div>
    </form>
  );
}

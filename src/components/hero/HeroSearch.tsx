"use client";

import * as React from "react";
import CountySelect from "@/components/location/CountySelect";
import AreaSelect from "@/components/location/AreaSelect";
import { CATEGORIES_BY_MODE } from "@/components/filters/categories";
import { useQuickSearch } from "@/hooks/useQuickSearch";

export default function HeroSearch() {
  const [mode, setMode] = React.useState<"services" | "help" | "market">("services");
  const {
    q,
    setQ,
    category,
    setCategory,
    county,
    setCounty,
    area,
    setArea,
    selectTab,
    isLoading,
    listingCount,
    hasCategorySelection,
    onSearch,
  } = useQuickSearch({ syncWithHeroTabs: false });

  const tabLabel = mode === "help" ? "requests" : mode === "market" ? "marketplace" : "services";
  const placeholder =
    mode === "services"
      ? "Search services, e.g. plumber, lawn care"
      : mode === "help"
      ? "Describe what you need help with"
      : "Search marketplace listings";
  const buttonText =
    mode === "services"
      ? "Search services"
      : mode === "help"
      ? "Post request"
      : "Search marketplace";
  const categories = CATEGORIES_BY_MODE[tabLabel];

  return (
    <form onSubmit={onSearch} style={{ marginTop: 18 }}>
      {/* Stacked vertical layout to match original hero card design */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Quick browse buttons: reintroduce Services / Requests / Marketplace shortcuts */}
        <div style={{ width: "100%", textAlign: "left" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>What are you looking for?</div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
          }}
        >
          <button
            type="button"
            className={`hero-tab ${mode === "services" ? "is-active" : ""}`}
            style={{ flex: 1, textAlign: "center", whiteSpace: "nowrap" }}
            onClick={() => {
              setMode("services");
              selectTab("/services");
            }}
          >
            Find services
          </button>

          <button
            type="button"
            className={`hero-tab ${mode === "help" ? "is-active" : ""}`}
            style={{ flex: 1, textAlign: "center", whiteSpace: "nowrap" }}
            onClick={() => {
              setMode("help");
              selectTab("/requests");
            }}
          >
            Get help
          </button>

          <button
            type="button"
            className={`hero-tab ${mode === "market" ? "is-active" : ""}`}
            style={{ flex: 1, textAlign: "center", whiteSpace: "nowrap" }}
            onClick={() => {
              setMode("market");
              selectTab("/marketplace");
            }}
          >
            Find a marketplace
          </button>
        </div>
        <input
          className="input"
          name="q"
          placeholder={placeholder}
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
          {categories.map((c) => (
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
          className="btn btn-primary"
          disabled={isLoading || (hasCategorySelection && listingCount === 0)}
          aria-busy={isLoading}
        >
          <span className="btn__content">
            {isLoading && <span className="spinner" aria-hidden />}
            {buttonText}
          </span>
        </button>
      </div>
    </form>
  );
}

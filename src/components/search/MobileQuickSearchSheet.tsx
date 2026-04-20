"use client";

import * as React from "react";
import { XIcon } from "@/components/ui/Icon";
import CountySelect from "@/components/location/CountySelect";
import AreaSelect from "@/components/location/AreaSelect";
import { CATEGORIES_BY_MODE } from "@/components/filters/categories";
import { useQuickSearch } from "@/hooks/useQuickSearch";

type MobileQuickSearchSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function MobileQuickSearchSheet({ open, onClose }: MobileQuickSearchSheetProps) {
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
    selectTab,
    isLoading,
    listingCount,
    hasCategorySelection,
    onSearch,
  } = useQuickSearch({ syncWithHeroTabs: false });

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const tabLabel =
    activeTab === "/requests"
      ? "requests"
      : activeTab === "/marketplace"
      ? "marketplace"
      : "services";
  const categories = CATEGORIES_BY_MODE[tabLabel];

  return (
    <div className="mobile-search-sheet is-open" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="mobile-search-sheet__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-search-sheet__header">
          <div />
          <button
            className="mobile-search-sheet__close"
            type="button"
            aria-label="Close search"
            onClick={onClose}
          >
            <XIcon size={28} />
          </button>
        </div>

        {/* Quick browse buttons: mirror desktop — heading + 3 shortcuts */}
        <div style={{ width: "100%", textAlign: "left", marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>What are you looking for?</div>
        </div>
        <div className="mobile-search-sheet__tabs" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`mobile-search-sheet__tab ${activeTab === "/services" ? "is-active" : ""}`}
            onClick={() => selectTab("/services")}
          >
            Find a services
          </button>

          <button
            type="button"
            className={`mobile-search-sheet__tab ${activeTab === "/requests" ? "is-active" : ""}`}
            onClick={() => selectTab("/requests")}
          >
            Find a request
          </button>

          <button
            type="button"
            className={`mobile-search-sheet__tab ${activeTab === "/marketplace" ? "is-active" : ""}`}
            onClick={() => selectTab("/marketplace")}
          >
            Find a marketplace
          </button>
        </div>

        <form
          onSubmit={(e) => {
            onSearch(e);
            onClose();
          }}
          className="mobile-search-sheet__form"
        >
          <input
            ref={inputRef}
            className="input"
            name="q"
            placeholder={`Search ${tabLabel}, e.g. plumber, lawn care`}
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
            className="btn btn--primary"
            disabled={isLoading || (hasCategorySelection && listingCount === 0)}
            aria-busy={isLoading}
          >
            <span className="btn__content">
              {isLoading && <span className="spinner" aria-hidden />}
              {(() => {
                if (!hasCategorySelection || listingCount == null) return `Search ${tabLabel}`;
                if (listingCount === 0) return `Search ${tabLabel}`;
                return `Search ${listingCount} ${tabLabel}`;
              })()}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import CountySelect from "@/components/location/CountySelect";
import AreaSelect from "@/components/location/AreaSelect";
import { CATEGORIES } from "@/components/filters/categories";
import { useQuickSearch, QuickSearchTab } from "@/hooks/useQuickSearch";

const TABS: { label: string; value: QuickSearchTab }[] = [
  { label: "Services", value: "/services" },
  { label: "Requests", value: "/requests" },
  { label: "Marketplace", value: "/marketplace" },
];

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
  } = useQuickSearch();

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

  return (
    <div className="mobile-search-sheet is-open" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="mobile-search-sheet__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-search-sheet__header">
          <div>
            <p className="mobile-search-sheet__title">Quick search</p>
            <p className="mobile-search-sheet__subtitle">Find listings fast</p>
          </div>
          <button
            className="mobile-search-sheet__close"
            type="button"
            aria-label="Close search"
            onClick={onClose}
          >
            <XIcon size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="mobile-search-sheet__tabs" role="tablist" aria-label="Search mode">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              className={`mobile-search-sheet__tab${activeTab === tab.value ? " is-active" : ""}`}
              onClick={() => selectTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
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

"use client";

import * as React from "react";
import { XIcon } from "@/components/ui/Icon";
import CountySelect from "@/components/location/CountySelect";
import AreaSelect from "@/components/location/AreaSelect";
import { CATEGORIES_BY_MODE } from "@/components/filters/categories";
import { useQuickSearch } from "@/hooks/useQuickSearch";
import { modalBackdropClass } from "@/lib/layout/constants";

type MobileQuickSearchSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function MobileQuickSearchSheet({ open, onClose }: MobileQuickSearchSheetProps) {
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
    <>
      <div
        className={`mobile-menu mobile-menu--fullscreen fixed inset-0 isolate z-50 duration-100 ${modalBackdropClass} is-open`}
        onClick={onClose}
        aria-hidden
      />
      <div className="mobile-search-sheet is-open" role="dialog" aria-modal="true">
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
            <XIcon size={28} weight="regular" />
          </button>
        </div>
        {/* Quick browse buttons: mirror desktop — heading + 3 shortcuts */}
        <div style={{ width: "100%", textAlign: "left", marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>What are you looking for?</div>
        </div>
        <div className="mobile-search-sheet__tabs" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`mobile-search-sheet__tab ${mode === "services" ? "is-active" : ""}`}
            onClick={() => {
              setMode("services");
              selectTab("/services");
            }}
          >
            Find services
          </button>

          <button
            type="button"
            className={`mobile-search-sheet__tab ${mode === "help" ? "is-active" : ""}`}
            onClick={() => {
              setMode("help");
              selectTab("/requests");
            }}
          >
            Get help
          </button>

          <button
            type="button"
            className={`mobile-search-sheet__tab ${mode === "market" ? "is-active" : ""}`}
            onClick={() => {
              setMode("market");
              selectTab("/marketplace");
            }}
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
            className="btn btn-primary primary-action-button"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            <span className="btn__content">
              {isLoading && <span className="spinner" aria-hidden />}
              {buttonText}
            </span>
          </button>
        </form>
        </div>
      </div>
    </>
  );
}

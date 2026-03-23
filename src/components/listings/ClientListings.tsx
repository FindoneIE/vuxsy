"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import ListingsGrid from "@/components/listings/ListingsGrid";
import ListingsList from "@/components/listings/ListingsList";
import ListingViewToggle from "@/components/listings/ListingViewToggle";
import ResultsHeader from "@/components/listings/ResultsHeader";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import { XIcon } from "lucide-react";
import { useListingViewMode } from "@/hooks/useListingViewMode";
import type { Listing } from "@/types/listing";

type ListingApiResponse = {
  items?: Listing[];
  count?: number;
};

type ClientListingsProps = {
  mode?: "services" | "requests" | "marketplace";
  filters?: React.ReactNode;
  mobileFilters?: React.ReactNode;
};

export default function ClientListings({ mode = "services", filters, mobileFilters }: ClientListingsProps) {
  const searchParams = useSearchParams();
  const paramsKey = searchParams?.toString() ?? "";

  const drawerFilters = mobileFilters ?? filters;

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);

  const [items, setItems] = React.useState<Listing[]>([]);
  const { mode: viewMode, setMode: setViewMode } = useListingViewMode();

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const handleChange = () => {
      if (mediaQuery.matches) {
        setIsMobileFiltersOpen(false);
      }
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  React.useEffect(() => {
    let mounted = true;
  const qs = paramsKey;

    console.log("CLIENT LISTINGS FETCH:", { mode, query: qs });

    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/${mode}${qs ? `?${qs}` : ""}`);
        if (!res.ok) {
          // treat non-OK as empty result set
          if (!mounted) return;
          setItems([]);
          return;
        }

        const ct = res.headers.get("content-type") || "";
        let data: ListingApiResponse | null = null;

        if (ct.includes("application/json")) {
          try {
            data = (await res.json()) as ListingApiResponse;
          } catch {
            // JSON parsing failed - treat as empty
            if (!mounted) return;
            setItems([]);
            return;
          }
        } else {
          // Non-JSON response (placeholder or plain text) - treat as empty
          if (!mounted) return;
          setItems([]);
          return;
        }

  if (!mounted) return;
  console.log("CLIENT LISTINGS RESULT:", { count: data.items?.length ?? 0 });
  setItems(data.items ?? []);
      } catch {
        // network or other error - swallow to avoid console SyntaxError spam
        if (!mounted) return;
        setItems([]);
      }
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(id);
    };
  }, [mode, paramsKey]);

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <ResultsHeader mode={mode} />
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
          <div className="flex items-center">
            {drawerFilters ? (
              <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-(--color-accent) bg-(--color-accent) px-3 text-xs font-medium text-white lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  showCloseButton={false}
                  className="filters-drawer bg-white h-full max-h-screen overflow-y-auto gap-3 border-r-0 shadow-none lg:hidden"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  {React.isValidElement<{
                    headerActions?: React.ReactNode;
                    onCategoryChange?: (category: string | null) => void;
                  }>(drawerFilters)
                    ? React.cloneElement(drawerFilters, {
                        headerActions: (
                          <SheetClose asChild>
                            <button type="button" className="app-close-button" aria-label="Close filters">
                              <XIcon className="app-close-icon" strokeWidth={2} />
                            </button>
                          </SheetClose>
                        ),
                        onCategoryChange: () => {
                          setIsMobileFiltersOpen(false);
                        },
                      })
                    : drawerFilters}
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <ListingViewToggle value={viewMode} onChange={setViewMode} />
            <select
              className="select listing-sort-select"
              defaultValue="relevance"
              aria-label="Sort by"
            >
              <option value="relevance">Best match</option>
              <option value="newest">Newest</option>
              <option value="price_low">Low to High</option>
              <option value="price_high">High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {items.length === 0 ? null : viewMode === "grid" ? (
        <ListingsGrid items={items} />
      ) : (
        <ListingsList items={items} />
      )}
    </div>
  );
}

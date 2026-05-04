"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import ListingsGrid from "@/components/listings/ListingsGrid";
import ListingsList from "@/components/listings/ListingsList";
import ListingViewToggle from "@/components/listings/ListingViewToggle";
import ResultsHeader from "@/components/listings/ResultsHeader";
import PromotedCarousel from "@/components/listings/PromotedCarousel";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, XIcon } from "@/components/ui/Icon";
import { useListingViewMode } from "@/hooks/useListingViewMode";
import type { Listing } from "@/types/listing";

type ListingApiResponse = {
  items?: Listing[];
  listings?: Listing[];
  data?: Listing[];
  count?: number;
};

type ClientListingsProps = {
  mode?: "services" | "requests" | "marketplace";
  filters?: React.ReactNode;
  mobileFilters?: React.ReactNode;
  promotedListings?: Listing[];
};

const listingsCache = new Map<string, Listing[]>();
const listingsInFlight = new Map<string, Promise<Listing[]>>();
const promotedCache = new Map<string, Listing[]>();
const promotedInFlight = new Map<string, Promise<Listing[]>>();

export default function ClientListings({
  mode = "services",
  filters,
  mobileFilters,
  promotedListings,
}: ClientListingsProps) {
  const searchParams = useSearchParams();
  const paramsKey = searchParams?.toString() ?? "";

  const drawerFilters = mobileFilters ?? filters;

  const selectedCategory = searchParams?.get("category") ?? null;

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);
  const [visiblePromotedListings, setVisiblePromotedListings] = React.useState<Listing[]>(
    promotedListings ?? []
  );

  const [listings, setListings] = React.useState<Listing[]>([]);
  const { mode: viewMode, setMode: setViewMode } = useListingViewMode();
  const perfRef = React.useRef({
    category: "",
    start: 0,
    listingsFetchCount: 0,
    promotedFetchCount: 0,
    countsFetchCount: 0,
    pageRouteHit: false,
    listingsDone: false,
    promotedDone: false,
  });

  const filteredListings = React.useMemo(() => listings, [listings]);

  React.useEffect(() => {
    if (!promotedListings) return;
    const category = selectedCategory && selectedCategory !== "all" ? selectedCategory : null;
    if (category) return;
    const listingType =
      mode === "services" ? "service" : mode === "requests" ? "request" : "marketplace";
    const cacheKey = `${listingType}:${category ?? "all"}`;
    promotedCache.set(cacheKey, promotedListings);
  }, [mode, promotedListings, selectedCategory]);

  const logSummaryIfReady = React.useCallback(() => {
    const perf = perfRef.current;
    if (!perf.start || !perf.listingsDone || !perf.promotedDone) return;
  }, []);

  React.useEffect(() => {
    const handleCountsFetch = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: string }>).detail;
      if (!detail || detail.mode !== mode) return;
      perfRef.current.countsFetchCount += 1;
    };

    window.addEventListener("listing:counts-fetch", handleCountsFetch as EventListener);
    return () => window.removeEventListener("listing:counts-fetch", handleCountsFetch as EventListener);
  }, [mode]);

  React.useEffect(() => {
    const handleCategoryClick = (event: Event) => {
      const detail = (event as CustomEvent<{ category?: string | null; navigationMethod?: string }>).detail;
      if (!detail) return;
      const categoryLabel = detail.category ?? "all";
      perfRef.current = {
        category: categoryLabel,
        start: performance.now(),
        listingsFetchCount: 0,
        promotedFetchCount: 0,
        countsFetchCount: perfRef.current.countsFetchCount,
        pageRouteHit: detail.navigationMethod === "router.push",
        listingsDone: false,
        promotedDone: false,
      };
    };

    window.addEventListener("listing:category-click", handleCategoryClick as EventListener);
    return () => window.removeEventListener("listing:category-click", handleCategoryClick as EventListener);
  }, []);


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
    const cacheKey = `${mode}?${qs}`;

    const cached = listingsCache.get(cacheKey);
    if (cached) {
      queueMicrotask(() => setListings(cached));
      return () => {
        mounted = false;
      };
    }

    const inflight = listingsInFlight.get(cacheKey);
    if (inflight) {
      inflight
        .then((resolvedListings) => {
          if (!mounted) return;
          setListings(resolvedListings);
        })
        .catch(() => {
          if (!mounted) return;
          setListings([]);
        })
        .finally(() => {
          if (!mounted) return;
          perfRef.current.listingsDone = true;
          logSummaryIfReady();
        });
      return () => {
        mounted = false;
      };
    }

    const id = window.setTimeout(async () => {
      perfRef.current.listingsFetchCount += 1;
      try {
        const requestPromise = (async () => {
          const res = await fetch(`/api/${mode}${qs ? `?${qs}` : ""}`);
          if (!res.ok) {
            return [] as Listing[];
          }

          const ct = res.headers.get("content-type") || "";
          let data: ListingApiResponse | null = null;

          if (ct.includes("application/json")) {
            try {
              data = (await res.json()) as ListingApiResponse;
            } catch {
              return [] as Listing[];
            }
          } else {
            return [] as Listing[];
          }

          const resolvedListings = Array.isArray(data?.items)
            ? data?.items
            : Array.isArray(data?.listings)
            ? data?.listings
            : Array.isArray(data?.data)
            ? data?.data
            : Array.isArray(data)
            ? (data as Listing[])
            : [];
          listingsCache.set(cacheKey, resolvedListings);
          return resolvedListings;
        })();

        listingsInFlight.set(cacheKey, requestPromise);
        const resolvedListings = await requestPromise;
        listingsInFlight.delete(cacheKey);

        if (!mounted) return;
        setListings(resolvedListings);
      } catch {
        // network or other error - swallow to avoid console SyntaxError spam
        if (!mounted) return;
        setListings([]);
      } finally {
        perfRef.current.listingsDone = true;
        logSummaryIfReady();
      }
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(id);
    };
  }, [logSummaryIfReady, mode, paramsKey]);

  React.useEffect(() => {
    let active = true;
    const category = selectedCategory && selectedCategory !== "all" ? selectedCategory : null;
    const listingType =
      mode === "services" ? "service" : mode === "requests" ? "request" : "marketplace";
    const cacheKey = `${listingType}:${category ?? "all"}`;

    const cached = promotedCache.get(cacheKey);
    if (cached) {
      queueMicrotask(() => setVisiblePromotedListings(cached));
      perfRef.current.promotedDone = true;
      logSummaryIfReady();
      return () => {
        active = false;
      };
    }

    const inflight = promotedInFlight.get(cacheKey);
    if (inflight) {
      inflight
        .then((promotedWithCategory) => {
          if (active) setVisiblePromotedListings(promotedWithCategory);
        })
        .catch(() => {
          if (active) setVisiblePromotedListings([]);
        })
        .finally(() => {
          perfRef.current.promotedDone = true;
          logSummaryIfReady();
        });
      return () => {
        active = false;
      };
    }

    const fetchPromoted = async () => {
      perfRef.current.promotedFetchCount += 1;
      try {
        const requestPromise = (async () => {
          const params = new URLSearchParams();
          if (mode) params.set("listingType", listingType);
          if (category) params.set("category", category);

          const res = await fetch(`/api/promoted-listings?${params.toString()}`);
          if (!res.ok) {
            return [] as Listing[];
          }

          const data = (await res.json()) as { items?: Listing[] };
          const promotedWithCategory = data.items ?? [];
          promotedCache.set(cacheKey, promotedWithCategory);
          return promotedWithCategory;
        })();

        promotedInFlight.set(cacheKey, requestPromise);
        const promotedWithCategory = await requestPromise;
        promotedInFlight.delete(cacheKey);
        if (active) setVisiblePromotedListings(promotedWithCategory);
      } catch {
        if (active) setVisiblePromotedListings([]);
      } finally {
        perfRef.current.promotedDone = true;
        logSummaryIfReady();
      }
    };

    fetchPromoted();
    return () => {
      active = false;
    };
  }, [logSummaryIfReady, mode, selectedCategory]);

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <ResultsHeader mode={mode} count={filteredListings.length} />
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
                              <XIcon className="app-close-icon" weight="regular" />
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
              defaultValue="newest"
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

      {visiblePromotedListings && visiblePromotedListings.length > 0 ? (
        <PromotedCarousel listings={visiblePromotedListings} />
      ) : null}

      {filteredListings.length === 0 ? null : viewMode === "grid" ? (
        <ListingsGrid items={filteredListings} />
      ) : (
        <ListingsList items={filteredListings} />
      )}
    </div>
  );
}

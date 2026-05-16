"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  initialListings?: Listing[];
  initialCount?: number;
  initialParamsKey?: string;
  initialViewMode?: "grid" | "list";
};

type ListingSortOption = "relevance" | "newest" | "price_low" | "price_high";

const SORT_OPTIONS: ReadonlyArray<ListingSortOption> = [
  "relevance",
  "newest",
  "price_low",
  "price_high",
];

const listingsCache = new Map<string, Listing[]>();
const listingsInFlight = new Map<string, Promise<Listing[]>>();
const promotedCache = new Map<string, Listing[]>();
const promotedInFlight = new Map<string, Promise<Listing[]>>();
let clientListingsRenderCount = 0;

function normalizeParamsKey(value: string): string {
  const params = new URLSearchParams(value);
  params.sort();
  return params.toString();
}

export default function ClientListings({
  mode = "services",
  filters,
  mobileFilters,
  promotedListings,
  initialListings,
  initialParamsKey,
  initialViewMode = "grid",
}: ClientListingsProps) {
  const DEV = process.env.NODE_ENV !== "production";
  const renderCount = ++clientListingsRenderCount;
  const enableListingProbe = DEV;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsKey = searchParams?.toString() ?? "";
  const normalizedParamsKey = React.useMemo(
    () => normalizeParamsKey(paramsKey),
    [paramsKey]
  );
  const normalizedInitialParamsKey = React.useMemo(
    () => normalizeParamsKey(initialParamsKey ?? ""),
    [initialParamsKey]
  );
  const ssrListings = React.useMemo(() => initialListings ?? [], [initialListings]);

  const drawerFilters = mobileFilters ?? filters;

  const selectedCategory = searchParams?.get("category") ?? null;
  const sortParam = searchParams?.get("sort") ?? null;
  const selectedSort: ListingSortOption = SORT_OPTIONS.includes(sortParam as ListingSortOption)
    ? (sortParam as ListingSortOption)
    : "newest";

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);
  const [visiblePromotedListings, setVisiblePromotedListings] = React.useState<Listing[]>(
    promotedListings ?? []
  );

  const [listings, setListings] = React.useState<Listing[]>(() => ssrListings);
  const { mode: viewMode, setMode: setViewMode } = useListingViewMode(initialViewMode);
  const shouldSeedFromSSRRef = React.useRef(true);
  const listingsContainerRef = React.useRef<HTMLDivElement | null>(null);

  const sampleLayoutMetrics = React.useCallback(
    (phase: string, extra?: Record<string, unknown>) => {
      if (!enableListingProbe || typeof window === "undefined") return;

      const bodyScrollHeight = document.body?.scrollHeight ?? null;
  const mainOffsetHeight = (document.querySelector("main") as HTMLElement | null)?.offsetHeight ?? null;
      const listingsContainerOffsetHeight = listingsContainerRef.current?.offsetHeight ?? null;
  const footerOffsetTop = (document.querySelector("footer") as HTMLElement | null)?.offsetTop ?? null;
      const scrollY = window.scrollY;

      console.debug("[listing-probe]", {
        route: pathname,
        mode,
        phase,
        paramsKey: normalizedParamsKey,
        bodyScrollHeight,
        mainOffsetHeight,
        listingsContainerOffsetHeight,
        footerOffsetTop,
        scrollY,
        ...extra,
      });
    },
    [enableListingProbe, mode, normalizedParamsKey, pathname]
  );

  const scheduleLayoutSample = React.useCallback(
    (phase: string, extra?: Record<string, unknown>) => {
      if (!enableListingProbe || typeof window === "undefined") return;
      queueMicrotask(() => {
        window.requestAnimationFrame(() => {
          sampleLayoutMetrics(phase, extra);
        });
      });
    },
    [enableListingProbe, sampleLayoutMetrics]
  );
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
  const countForHeader = filteredListings.length;

  if (DEV) {
    console.debug("[mount-trace] ClientListings render", {
      mode,
  renderCount,
      normalizedParamsKey,
      normalizedInitialParamsKey,
      listingsLength: listings.length,
      filteredListingsLength: filteredListings.length,
      promotedLength: visiblePromotedListings.length,
    });
    if (typeof performance !== "undefined") {
      performance.mark(`ClientListings:render:${renderCount}`);
    }
  }

  React.useEffect(() => {
    if (!enableListingProbe) return;
    scheduleLayoutSample("first-render");
  }, [enableListingProbe, scheduleLayoutSample]);

  React.useEffect(() => {
    if (!DEV) return;
    console.debug("[mount-trace] ClientListings mount", {
      mode,
      normalizedParamsKey,
      listingsLength: listings.length,
    });
    return () => {
      console.debug("[mount-trace] ClientListings unmount", { mode });
    };
  }, [DEV, listings.length, mode, normalizedParamsKey]);

  const handleSortChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextSort = event.target.value as ListingSortOption;
      if (!SORT_OPTIONS.includes(nextSort)) return;

      const nextParams = new URLSearchParams(searchParams?.toString() ?? "");

      if (nextSort === "newest") {
        nextParams.delete("sort");
      } else {
        nextParams.set("sort", nextSort);
      }

      const query = nextParams.toString();
      const basePath = pathname ?? "/";
      router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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
    if (!enableListingProbe || typeof window === "undefined") return;

    const handleCountsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: string }>).detail;
      if (!detail || detail.mode !== mode) return;
      scheduleLayoutSample("after-sidebar-counts-update");
    };

    window.addEventListener("listing:counts-updated", handleCountsUpdated as EventListener);
    return () => {
      window.removeEventListener("listing:counts-updated", handleCountsUpdated as EventListener);
    };
  }, [enableListingProbe, mode, scheduleLayoutSample]);

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
    const cacheKey = `${mode}?${normalizedParamsKey}`;
    const seedKey = `${mode}?${normalizedInitialParamsKey}`;

    if (shouldSeedFromSSRRef.current) {
      // State is already initialized from `ssrListings` in useState's
      // initializer, so we intentionally do NOT call setListings here —
      // a redundant identical state set would cause an extra commit and
      // a visible double-paint on first render. We still warm the cache
      // so revisits via in-app navigation can skip the fetch.
      listingsCache.set(seedKey, ssrListings);
      if (cacheKey === seedKey) {
        listingsCache.set(cacheKey, ssrListings);
      }
      scheduleLayoutSample("after-ssr-seed-applied", {
        listingsLength: ssrListings.length,
      });
      shouldSeedFromSSRRef.current = false;
      perfRef.current.listingsDone = true;
      logSummaryIfReady();
      return () => {
        mounted = false;
      };
    }

    const cached = listingsCache.get(cacheKey);
    if (cached) {
      queueMicrotask(() => {
        if (!mounted) return;
        setListings(cached);
        scheduleLayoutSample("after-client-listings-state-update", {
          source: "listings-cache",
          listingsLength: cached.length,
        });
      });
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
          scheduleLayoutSample("after-client-listings-state-update", {
            source: "listings-inflight",
            listingsLength: resolvedListings.length,
          });
        })
        .catch(() => {
          if (!mounted) return;
          setListings([]);
          scheduleLayoutSample("after-client-listings-state-update", {
            source: "listings-inflight-error",
            listingsLength: 0,
          });
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

    perfRef.current.listingsFetchCount += 1;
    const fetchListings = async () => {
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
        scheduleLayoutSample("after-client-listings-state-update", {
          source: "listings-fetch",
          listingsLength: resolvedListings.length,
        });
      } catch {
        if (!mounted) return;
        setListings([]);
        scheduleLayoutSample("after-client-listings-state-update", {
          source: "listings-fetch-error",
          listingsLength: 0,
        });
      } finally {
        perfRef.current.listingsDone = true;
        logSummaryIfReady();
      }
    };

    fetchListings();

    return () => {
      mounted = false;
    };
  }, [
    logSummaryIfReady,
    mode,
    normalizedInitialParamsKey,
    normalizedParamsKey,
    paramsKey,
    scheduleLayoutSample,
    ssrListings,
  ]);

  React.useEffect(() => {
    let active = true;
    const category = selectedCategory && selectedCategory !== "all" ? selectedCategory : null;
    const listingType =
      mode === "services" ? "service" : mode === "requests" ? "request" : "marketplace";
    const cacheKey = `${listingType}:${category ?? "all"}`;

    const cached = promotedCache.get(cacheKey);
    if (cached) {
      queueMicrotask(() => {
        if (!active) return;
        setVisiblePromotedListings(cached);
        scheduleLayoutSample("after-promoted-update", {
          source: "promoted-cache",
          promotedLength: cached.length,
        });
      });
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
          if (!active) return;
          setVisiblePromotedListings(promotedWithCategory);
          scheduleLayoutSample("after-promoted-update", {
            source: "promoted-inflight",
            promotedLength: promotedWithCategory.length,
          });
        })
        .catch(() => {
          if (!active) return;
          setVisiblePromotedListings([]);
          scheduleLayoutSample("after-promoted-update", {
            source: "promoted-inflight-error",
            promotedLength: 0,
          });
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
        if (active) {
          setVisiblePromotedListings(promotedWithCategory);
          scheduleLayoutSample("after-promoted-update", {
            source: "promoted-fetch",
            promotedLength: promotedWithCategory.length,
          });
        }
      } catch {
        if (active) {
          setVisiblePromotedListings([]);
          scheduleLayoutSample("after-promoted-update", {
            source: "promoted-fetch-error",
            promotedLength: 0,
          });
        }
      } finally {
        perfRef.current.promotedDone = true;
        logSummaryIfReady();
      }
    };

    fetchPromoted();
    return () => {
      active = false;
    };
  }, [logSummaryIfReady, mode, scheduleLayoutSample, selectedCategory]);

  return (
    <div ref={listingsContainerRef} className="w-full min-w-0">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
  <ResultsHeader mode={mode} count={countForHeader} />
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
              value={selectedSort}
              onChange={handleSortChange}
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

      {filteredListings.length === 0 ? (
        <div className="rounded-xl border border-slate-200/70 bg-white p-6 text-sm text-slate-600">
          No listings found.
        </div>
      ) : viewMode === "grid" ? (
        <ListingsGrid items={filteredListings} wrap={false} />
      ) : (
        <ListingsList items={filteredListings} />
      )}
    </div>
  );
}

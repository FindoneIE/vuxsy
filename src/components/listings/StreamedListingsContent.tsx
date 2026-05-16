import { cookies } from "next/headers";
import ClientListings from "@/components/listings/ClientListings";
import { getPromotedListings } from "@/lib/listings/getPromotedListings";
import { getListings } from "@/lib/listings/getListings";
import {
  canonicalizeSearchParams,
  getListingsParamsFromSearchParams,
  resolveRouteSearchParams,
  toURLSearchParams,
  type RouteSearchParamsInput,
} from "@/lib/listings/searchParams";
import type { Listing } from "@/types/listing";

type ListingViewMode = "grid" | "list";

async function readInitialViewMode(): Promise<ListingViewMode> {
  try {
    const store = await cookies();
    const value = store.get("listingViewMode")?.value;
    return value === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

type Mode = "services" | "requests" | "marketplace";

const toListingType = (mode: Mode): "service" | "request" | "marketplace" =>
  mode === "services" ? "service" : mode === "requests" ? "request" : "marketplace";

/**
 * Architectural-fix: this module USED to export an async server component
 * (`<StreamedListingsContent>`) that was rendered as a child of a sync page.
 * Next.js wraps such async children in an implicit Suspense boundary so the
 * shell can flush early — which produced a visible flash (empty middle area
 * + footer-first paint until the boundary resolved and `$RC` revealed the
 * hidden `<div hidden id="S:0">` payload).
 *
 * The pattern is now split:
 *   1. `getListingsPageData(...)` — async data loader called at the page
 *      level (the page itself is async so awaiting here happens BEFORE any
 *      JSX is returned; no async child remains in the render tree).
 *   2. `ListingsPageContent(...)` — pure synchronous component that takes
 *      the resolved data and renders `<ClientListings>`.
 *
 * Result: the page returns synchronous JSX after all awaits; Next has no
 * async grandchild to wrap in an implicit boundary; the entire content tree
 * is flushed in a single response with no hidden stream segment.
 */

export type ListingsPageData = {
  mode: Mode;
  initialListings: Listing[];
  promotedListings: Listing[];
  initialParamsKey: string;
  initialViewMode: ListingViewMode;
};

export async function getListingsPageData(
  mode: Mode,
  searchParams: RouteSearchParamsInput | undefined
): Promise<ListingsPageData> {
  const listingType = toListingType(mode);

  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const listingQueryParams = getListingsParamsFromSearchParams(resolvedSearchParams);
  const initialParamsKey = canonicalizeSearchParams(
    toURLSearchParams(resolvedSearchParams)
  );

  const listingResult = await getListings({
    ...listingQueryParams,
    listingType,
  });
  const initialListings = listingResult.items as Listing[];

  let promotedListings: Listing[] = [];
  try {
    promotedListings = await getPromotedListings({ listingType });
  } catch (error) {
    console.error(`Failed to load promoted ${mode} listings:`, error);
  }

  const initialViewMode = await readInitialViewMode();

  return {
    mode,
    initialListings,
    promotedListings,
    initialParamsKey,
    initialViewMode,
  };
}

type ListingsPageContentProps = {
  data: ListingsPageData;
  filters: React.ReactNode;
  mobileFilters: React.ReactNode;
};

/**
 * Synchronous renderer — receives already-resolved data and renders the
 * client listings tree. Must NOT be async (that would re-introduce the
 * implicit Suspense boundary we are eliminating).
 */
export default function ListingsPageContent({
  data,
  filters,
  mobileFilters,
}: ListingsPageContentProps) {
  return (
    <ClientListings
      mode={data.mode}
      filters={filters}
      mobileFilters={mobileFilters}
      promotedListings={data.promotedListings}
      initialListings={data.initialListings}
      initialCount={data.initialListings.length}
      initialParamsKey={data.initialParamsKey}
      initialViewMode={data.initialViewMode}
    />
  );
}


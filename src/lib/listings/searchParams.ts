import type { GetListingsParams, ListingSortOption } from "@/lib/listings/getListings";

const SORT_OPTIONS: ReadonlyArray<ListingSortOption> = [
  "relevance",
  "best_match",
  "newest",
  "price_low",
  "price_high",
];

const SELLER_TYPE_OPTIONS = new Set(["business", "private"] as const);

export type RouteSearchParams =
  | Record<string, string | string[] | undefined>
  | undefined;

export type RouteSearchParamsInput = RouteSearchParams | Promise<RouteSearchParams>;

export async function resolveRouteSearchParams(
  searchParams?: RouteSearchParamsInput
): Promise<RouteSearchParams> {
  if (!searchParams) return undefined;
  return await searchParams;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function toURLSearchParams(searchParams?: RouteSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  if (!searchParams) return params;

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          params.append(key, item);
        }
      }
      continue;
    }

    if (typeof value === "string") {
      params.append(key, value);
    }
  }

  return params;
}

export function canonicalizeSearchParams(params: URLSearchParams): string {
  const clone = new URLSearchParams(params.toString());
  clone.sort();
  return clone.toString();
}

function resolveSort(value: string | null): ListingSortOption | undefined {
  if (!value) return undefined;
  return SORT_OPTIONS.includes(value as ListingSortOption)
    ? (value as ListingSortOption)
    : undefined;
}

function resolveSellerTypes(value: string | null): Array<"business" | "private"> {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is "business" | "private" =>
      SELLER_TYPE_OPTIONS.has(entry as "business" | "private")
    );
}

function resolveNumeric(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getListingsParamsFromSearchParams(
  searchParams?: RouteSearchParams
): Omit<GetListingsParams, "listingType"> {
  const raw = searchParams ?? {};

  const categoryId = first(raw.category);
  const county = first(raw.county);
  const area = first(raw.area);
  const sort = resolveSort(first(raw.sort) ?? null);
  const pageSize = resolveNumeric(first(raw.pageSize) ?? null);
  const sellerTypes = resolveSellerTypes(
    first(raw.seller_type) ?? first(raw.sellerType) ?? first(raw.seller) ?? null
  );
  const minPrice =
    resolveNumeric(first(raw.price_min) ?? null) ??
    resolveNumeric(first(raw.min_price) ?? null) ??
    resolveNumeric(first(raw.priceMin) ?? null) ??
    resolveNumeric(first(raw.min) ?? null);
  const maxPrice =
    resolveNumeric(first(raw.price_max) ?? null) ??
    resolveNumeric(first(raw.max_price) ?? null) ??
    resolveNumeric(first(raw.priceMax) ?? null) ??
    resolveNumeric(first(raw.max) ?? null);

  return {
    categoryId: categoryId ?? undefined,
    county: county ?? undefined,
    area: area ?? undefined,
    pageSize,
    sort,
    sellerTypes,
    minPrice,
    maxPrice,
  };
}

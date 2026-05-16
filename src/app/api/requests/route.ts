import { NextResponse } from "next/server";
import {
  getListings,
  type ListingRecord,
  type ListingSortOption,
} from "@/lib/listings/getListings";

const SORT_OPTIONS: ReadonlyArray<ListingSortOption> = [
  "relevance",
  "best_match",
  "newest",
  "price_low",
  "price_high",
];

const SELLER_TYPE_OPTIONS = new Set(["business", "private"] as const);

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

function serializeListing(item: ListingRecord) {
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(item)) {
    if (
      v &&
      typeof v === "object" &&
      "toDate" in v &&
      typeof (v as { toDate?: () => Date }).toDate === "function"
    ) {
      try {
        out[k] = (v as { toDate: () => Date }).toDate().toISOString();
      } catch {
        out[k] = String(v);
      }
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else {
      out[k] = v;
    }
  }

  return out;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("category") ?? undefined;
    const county = url.searchParams.get("county") ?? undefined;
    const area = url.searchParams.get("area") ?? undefined;
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20") || 20;
    const sort = resolveSort(url.searchParams.get("sort"));
    const sellerTypes = resolveSellerTypes(
      url.searchParams.get("seller_type") ??
        url.searchParams.get("sellerType") ??
        url.searchParams.get("seller")
    );
    const minPrice =
      resolveNumeric(url.searchParams.get("price_min")) ??
      resolveNumeric(url.searchParams.get("min_price")) ??
      resolveNumeric(url.searchParams.get("priceMin")) ??
      resolveNumeric(url.searchParams.get("min"));
    const maxPrice =
      resolveNumeric(url.searchParams.get("price_max")) ??
      resolveNumeric(url.searchParams.get("max_price")) ??
      resolveNumeric(url.searchParams.get("priceMax")) ??
      resolveNumeric(url.searchParams.get("max"));

    

    const result = await getListings({
      categoryId,
      county,
      area,
      pageSize,
      listingType: "request",
      sort,
      sellerTypes,
      minPrice,
      maxPrice,
    });

    const items = (result.items || []).map((it) => serializeListing(it));

    

    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    console.error("/api/requests error", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to load requests", details: err },
      { status: 500 }
    );
  }
}

export async function POST() {
  return new Response("create request");
}
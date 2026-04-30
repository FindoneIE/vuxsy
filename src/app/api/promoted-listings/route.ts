import { NextResponse } from "next/server";
import type { Listing, ListingType } from "@/types/listing";
import { getPromotedListings } from "@/lib/listings/getPromotedListings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_TYPES = new Set<ListingType>(["service", "request", "marketplace"]);

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

function serializeListing(item: Listing) {
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
    const listingTypeParam = url.searchParams.get("listingType") ?? undefined;
    const category = url.searchParams.get("category") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? "12") || 12;
    const listingType = listingTypeParam && VALID_TYPES.has(listingTypeParam as ListingType)
      ? (listingTypeParam as ListingType)
      : undefined;
    const supabase = await createSupabaseServerClient();
    let resolvedCategory = category ?? undefined;

    if (resolvedCategory && !isUuid(resolvedCategory)) {
      const { data: categoryRow, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", resolvedCategory)
        .maybeSingle();

      if (categoryError) {
        console.error("PROMOTED CATEGORY LOOKUP ERROR", categoryError);
      }

      resolvedCategory = categoryRow?.id ?? undefined;
    }

    if (category && !resolvedCategory) {
      return NextResponse.json({ items: [], count: 0 });
    }

    const items = await getPromotedListings({ listingType, category: resolvedCategory, limit });

    const serialized = items.map((item) => serializeListing(item));

    return NextResponse.json({ items: serialized, count: serialized.length });
  } catch (err) {
    console.error("/api/promoted-listings error", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to load promoted listings", details: err },
      { status: 500 }
    );
  }
}

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ListingType } from "@/types/listing";

export type CategoryCounts = Record<string, number>;

export async function getActiveCategoryCounts(
  listingType?: ListingType
): Promise<CategoryCounts> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("listings")
    .select("category_id, listing_type, categories ( slug )");

  if (listingType) {
    query = query.eq("listing_type", listingType);
  }

  query = query.eq("status", "active");

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const counts: CategoryCounts = {};

  const rows = (data ?? []) as {
    category_id?: string | null;
    categories?: { slug?: string | null } | null;
  }[];

  rows.forEach((item) => {
    const category = item.categories?.slug?.trim() || "";
    if (!category) return;
    counts[category] = (counts[category] ?? 0) + 1;
  });

  return counts;
}

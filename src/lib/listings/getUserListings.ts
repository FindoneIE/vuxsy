import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ListingType } from "@/types/listing";

export type UserListingRecord = {
  id: string;
  title?: string | null;
  category_id?: string | null;
  city?: string | null;
  status?: string | null;
  listing_type?: string | null;
  coverImage?: string | null;
  created_at?: unknown;
  updated_at?: unknown;
  last_promoted_at?: unknown;
};

export type GetUserListingsParams = {
  userId: string;
  listingType?: ListingType;
};

export async function getUserListings({ userId, listingType }: GetUserListingsParams) {
  const supabase = createSupabaseBrowserClient();
  const baseSelect =
    "id, title, category_id, city, status, listing_type, created_at, updated_at, last_promoted_at";

  let query = supabase
    .from("listings")
    .select(baseSelect)
    .eq("user_id", userId)
    .order("last_promoted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (listingType) {
    query = query.eq("listing_type", listingType);
  }

  let { data, error } = await query;

  if (error) {
    console.warn("GET USER LISTINGS FAILED", {
      userId,
      listingType,
      query: {
        select: baseSelect,
        order: ["last_promoted_at desc", "created_at desc"],
      },
      error,
    });

    const message = String(error.message ?? "");
    if (message.includes("last_promoted_at")) {
      const fallbackSelect =
        "id, title, category_id, city, status, listing_type, created_at, updated_at";
      let fallbackQuery = supabase
        .from("listings")
        .select(fallbackSelect)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (listingType) {
        fallbackQuery = fallbackQuery.eq("listing_type", listingType);
      }

  const fallbackResult = await fallbackQuery;
  data = fallbackResult.data as typeof data;
      error = fallbackResult.error;

      if (error) {
        console.warn("GET USER LISTINGS FALLBACK FAILED", {
          userId,
          listingType,
          query: {
            select: fallbackSelect,
            order: ["created_at desc"],
          },
          error,
        });
        return [];
      }
    } else {
      return [];
    }
  }

  const items = (data ?? []) as UserListingRecord[];

  if (items.length === 0) {
    return items;
  }

  const listingIds = items.map((item) => item.id).filter(Boolean);
  const { data: imageRows, error: imageError } = await supabase
    .from("listing_images")
    .select("listing_id, storage_path_600, storage_path_1800, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  if (imageError) {
    console.error("Failed to load listing images for dashboard:", imageError);
    return items;
  }

  const imageMap = new Map<
    string,
    {
      listing_id?: string | null;
      storage_path_600?: string | null;
      storage_path_1800?: string | null;
    }[]
  >();
  (imageRows ?? []).forEach((row) => {
    if (!row.listing_id) return;
    const existing = imageMap.get(row.listing_id) ?? [];
    existing.push(row);
    imageMap.set(row.listing_id, existing);
  });

  items.forEach((item) => {
    const rows = imageMap.get(item.id) ?? [];
    const firstHighRes = rows.find((row) => row.storage_path_1800)?.storage_path_1800 ?? null;
    const firstFallback = rows.find((row) => row.storage_path_600)?.storage_path_600 ?? null;
    const targetPath = firstHighRes ?? firstFallback;
    if (!targetPath) return;
    const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(targetPath);
    item.coverImage = publicData?.publicUrl ?? null;
  });

  return items;
}

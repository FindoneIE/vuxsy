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
};

export type GetUserListingsParams = {
  userId: string;
  listingType?: ListingType;
};

export async function getUserListings({ userId, listingType }: GetUserListingsParams) {
  const supabase = createSupabaseBrowserClient();

  let query = supabase
    .from("listings")
    .select("id, title, category_id, city, status, listing_type, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (listingType) {
    query = query.eq("listing_type", listingType);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const items = (data ?? []) as UserListingRecord[];

  if (items.length === 0) {
    return items;
  }

  const listingIds = items.map((item) => item.id).filter(Boolean);
  const { data: imageRows, error: imageError } = await supabase
    .from("listing_images")
    .select("listing_id, storage_path_600, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  if (imageError) {
    console.error("Failed to load listing images for dashboard:", imageError);
    return items;
  }

  const imageMap = new Map<string, { listing_id?: string | null; storage_path_600?: string | null }[]>();
  (imageRows ?? []).forEach((row) => {
    if (!row.listing_id) return;
    const existing = imageMap.get(row.listing_id) ?? [];
    existing.push(row);
    imageMap.set(row.listing_id, existing);
  });

  items.forEach((item) => {
    const rows = imageMap.get(item.id) ?? [];
    const firstImage = rows.find((row) => row.storage_path_600)?.storage_path_600 ?? null;
    if (!firstImage) return;
    const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(firstImage);
    item.coverImage = publicData?.publicUrl ?? null;
  });

  return items;
}

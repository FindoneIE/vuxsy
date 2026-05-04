import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ListingRecord } from "@/lib/listings/getListings";

type ListingImageRow = {
  listing_id?: string | null;
  storage_path_600?: string | null;
  storage_path_1800?: string | null;
  sort_order?: number | null;
};

export async function getSavedListings(userId: string): Promise<ListingRecord[]> {
  const supabase = await createSupabaseServerClient();

  const { data: savedRows, error: savedError } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (savedError) {
    console.error("SAVED LISTINGS FETCH ERROR", savedError);
    return [];
  }

  const savedListingIds = (savedRows ?? [])
    .map((row) => row.listing_id)
    .filter((value): value is string => Boolean(value));

  if (savedListingIds.length === 0) {
    return [];
  }

  const baseSelect =
    "id, title, description, price, city, category_id, user_id, created_at, updated_at, contact_email, contact_phone, status, listing_type, promoted_until";

  const { data: listingRows, error: listingError } = await supabase
    .from("listings")
    .select(baseSelect)
    .in("id", savedListingIds)
    .eq("status", "active");

  if (listingError) {
    console.error("SAVED LISTINGS DETAILS ERROR", listingError);
    return [];
  }

  const listingMap = new Map<string, ListingRecord>();
  (listingRows ?? []).forEach((row) => {
    if (!row?.id) return;
    listingMap.set(row.id as string, row as ListingRecord);
  });

  const items = savedListingIds
    .map((id) => listingMap.get(id))
    .filter((value): value is ListingRecord => Boolean(value))
    .map((item) => ({
      ...item,
      savedByCurrentUser: true,
    }));

  if (items.length === 0) {
    return [];
  }

  const { data: imageRows, error: imageError } = await supabase
    .from("listing_images")
    .select("listing_id, storage_path_600, storage_path_1800, sort_order")
    .in(
      "listing_id",
      items.map((item) => item.id).filter(Boolean)
    )
    .order("sort_order", { ascending: true });

  if (imageError) {
    console.error("SAVED LISTINGS IMAGES ERROR", imageError);
    return items;
  }

  if (imageRows && imageRows.length > 0) {
    const imageMap = new Map<string, ListingImageRow[]>();
    (imageRows as ListingImageRow[]).forEach((row) => {
      if (!row.listing_id) return;
      const existing = imageMap.get(row.listing_id) ?? [];
      existing.push(row);
      imageMap.set(row.listing_id, existing);
    });

    items.forEach((item) => {
      const rows = imageMap.get(item.id) ?? [];
      if (rows.length === 0) return;
      const images = rows
        .map((row) =>
          row.storage_path_600
            ? supabase.storage.from("uploads").getPublicUrl(row.storage_path_600).data
                ?.publicUrl ?? null
            : null
        )
        .filter((value): value is string => Boolean(value));
      const images1600 = rows
        .map((row) =>
          row.storage_path_1800
            ? supabase.storage.from("uploads").getPublicUrl(row.storage_path_1800).data
                ?.publicUrl ?? null
            : null
        )
        .filter((value): value is string => Boolean(value));

      item.images = images.length > 0 ? images : item.images;
      item.images1600 = images1600.length > 0 ? images1600 : item.images1600;
      item.coverImage = images[0] ?? item.coverImage ?? null;
      item.photoCount = rows.length;
    });
  }

  return items;
}

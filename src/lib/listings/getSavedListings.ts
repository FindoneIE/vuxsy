import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ListingRecord } from "@/lib/listings/getListings";
import { buildListingImageMap } from "@/lib/listings/listingImages";
import { withNormalizedPrice } from "@/lib/listings/normalizePrice";

type ListingImageRow = {
  listing_id?: string | null;
  image_url?: string | null;
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

  const baseSelect = "*";

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
      ...withNormalizedPrice(item),
      savedByCurrentUser: true,
    }));

  if (items.length === 0) {
    return [];
  }

  const { data: imageRows, error: imageError } = await supabase
    .from("listing_images")
    .select("listing_id, image_url, storage_path_600, storage_path_1800, sort_order")
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
    const imageMap = buildListingImageMap(supabase, imageRows as ListingImageRow[]);

    items.forEach((item) => {
      const imageData = imageMap.get(item.id);
      if (!imageData) return;
      item.images = imageData.images.length > 0 ? imageData.images : item.images;
      item.images1600 =
        imageData.images1600.length > 0 ? imageData.images1600 : item.images1600;
      item.coverImage = imageData.coverImage ?? item.coverImage ?? null;
      item.photoCount = imageData.photoCount;
    });
  }

  return items;
}

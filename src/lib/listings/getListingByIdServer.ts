import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Listing } from "@/types/listing";
import { buildListingImageMap } from "@/lib/listings/listingImages";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && value && "toDate" in value) {
    try {
      const maybeDate = (value as { toDate?: () => Date }).toDate?.();
      return maybeDate ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getListingByIdServer(listingId: string): Promise<Listing | null> {
  if (!listingId || typeof listingId !== "string") {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*, youtube_url")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { data: imageRows, error: imageError } = await supabase
    .from("listing_images")
    .select("listing_id, image_url, storage_path_600, storage_path_1800, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (imageError) {
    console.error("Failed to load listing images:", imageError);
  }

  const imageMap = buildListingImageMap(
    supabase,
    (imageRows ?? []) as {
      listing_id?: string | null;
      image_url?: string | null;
      storage_path_600?: string | null;
      storage_path_1800?: string | null;
      sort_order?: number | null;
    }[]
  );
  const imageData = imageMap.get(listingId) ?? null;

  return {
    id: data.id,
    ...(data as Omit<Listing, "id">),
    images: imageData?.images.length ? imageData.images : (data as Listing).images,
    images1600: imageData?.images1600.length
      ? imageData.images1600
      : (data as Listing).images1600,
    coverImage: imageData?.coverImage ?? (data as Listing).coverImage ?? null,
    photoCount: imageData?.photoCount || (data as Listing).photoCount,
    created_at: toDate(data.created_at),
    updated_at: toDate(data.updated_at),
  } as Listing;
}

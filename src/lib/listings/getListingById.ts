import type { Listing } from "@/types/listing";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function getListingById(
  listingId: string
): Promise<Listing | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*, youtube_url")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  let sellerType: Listing["sellerType"] = (data as Listing).sellerType ?? null;
  let seller: Listing["seller"] = (data as Listing).seller;

  const sellerId = (data as Listing).user_id;

  if (sellerId) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sellerId)
      .single();

    if (profileError) {
      console.warn("Seller profile fetch failed", {
        sellerId,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
    }

    if (profile) {
      const isBusiness = Boolean((profile as { is_business_seller?: boolean | null }).is_business_seller);
      sellerType = isBusiness ? "business" : "private";
      seller = profile as Listing["seller"];
    }
  }

  const { data: imageRows, error: imageError } = await supabase
    .from("listing_images")
    .select("listing_id, storage_path_600, storage_path_1800, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (imageError) {
    console.error("Failed to load listing images:", imageError);
  }

  const images = (imageRows ?? [])
    .map((row) =>
      row.storage_path_600
        ? supabase.storage.from("uploads").getPublicUrl(row.storage_path_600).data
            ?.publicUrl ?? null
        : null
    )
    .filter((value): value is string => Boolean(value));
  const images1600 = (imageRows ?? [])
    .map((row) =>
      row.storage_path_1800
        ? supabase.storage.from("uploads").getPublicUrl(row.storage_path_1800).data
            ?.publicUrl ?? null
        : null
    )
    .filter((value): value is string => Boolean(value));

  return {
    id: data.id,
    ...(data as Omit<Listing, "id">),
    seller,
    sellerType,
    images: images.length > 0 ? images : (data as Listing).images,
    images1600: images1600.length > 0 ? images1600 : (data as Listing).images1600,
    coverImage: images[0] ?? (data as Listing).coverImage ?? null,
    photoCount: images.length || (data as Listing).photoCount,
  } as Listing;
}
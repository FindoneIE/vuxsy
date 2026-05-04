import type { Listing } from "@/types/listing";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function hasValidSellerSnapshot(seller: Listing["seller"] | null) {
  if (!seller) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = seller as any;

  return Boolean(
    s.displayName ||
      s.display_name ||
      s.fullName ||
      s.full_name ||
      s.name ||
      s.companyName ||
      s.company_name
  );
}

type GetListingByIdOptions = {
  includeSavedStatus?: boolean;
  currentUserId?: string | null;
};

export async function getListingById(
  listingId: string,
  options: GetListingByIdOptions = {}
): Promise<Listing | null> {
  const supabase = createSupabaseBrowserClient();
  const includeSavedStatus = options.includeSavedStatus ?? true;
  let currentUserId = options.currentUserId ?? null;

  const { data, error } = await supabase
    .from("listings")
    .select("*, youtube_url")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // ✅ drošs initial state (bez TS erroriem)
  let sellerType = ((data as Listing).sellerType ?? null) as Listing["sellerType"];
  let seller = ((data as Listing).seller ?? null) as Listing["seller"] | null;

  const sellerId = (data as Listing).user_id;

  // ✅ tikai fallback, ja snapshot NAV derīgs
  const needsProfileFallback = !hasValidSellerSnapshot(seller);

  if (sellerId && needsProfileFallback) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sellerId)
      .maybeSingle();

    if (profile) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const isBusiness = Boolean(
        (profile as { is_business_seller?: boolean | null }).is_business_seller
      );

      sellerType = isBusiness ? "business" : "private";
      const fallbackProfileName = profile.id
        ? `User-${String(profile.id).slice(0, 6)}`
        : "User";
      const normalizedSeller = {
        ...profile,
        displayName:
          (profile as any).displayName ||
          (profile as any).display_name ||
          (profile as any).fullName ||
          (profile as any).full_name ||
          (profile as any).name ||
          (profile as any).username ||
          (profile as any).email ||
          fallbackProfileName,
        name:
          (profile as any).name ||
          (profile as any).username ||
          (profile as any).email ||
          fallbackProfileName,
      };

      seller = normalizedSeller as Listing["seller"];
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }
  }

  // 🔽 images
  const { data: imageRows } = await supabase
    .from("listing_images")
    .select(
      "listing_id, storage_path_600, storage_path_1800, sort_order"
    )
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  const images = (imageRows ?? [])
    .map((row) =>
      row.storage_path_600
        ? supabase.storage
            .from("uploads")
            .getPublicUrl(row.storage_path_600).data?.publicUrl ?? null
        : null
    )
    .filter((v): v is string => Boolean(v));

  const images1600 = (imageRows ?? [])
    .map((row) =>
      row.storage_path_1800
        ? supabase.storage
            .from("uploads")
            .getPublicUrl(row.storage_path_1800).data?.publicUrl ?? null
        : null
    )
    .filter((v): v is string => Boolean(v));

  let savedByCurrentUser = false;

  if (includeSavedStatus) {
    if (!currentUserId) {
      const { data: authData } = await supabase.auth.getUser();
      currentUserId = authData.user?.id ?? null;
    }

    if (currentUserId) {
      const { data: savedRow } = await supabase
        .from("saved_listings")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("listing_id", listingId)
        .maybeSingle();
      savedByCurrentUser = Boolean(savedRow);
    }
  }

  return {
    id: data.id,
    ...(data as Omit<Listing, "id">),
    savedByCurrentUser,

    // ✅ svarīgi – vienmēr padodam to pašu struktūru
    seller: seller as Listing["seller"],
    sellerType,

    images: images.length > 0 ? images : (data as Listing).images,
    images1600:
      images1600.length > 0
        ? images1600
        : (data as Listing).images1600,

    coverImage:
      images[0] ?? (data as Listing).coverImage ?? null,

    photoCount:
      images.length || (data as Listing).photoCount,
  } as Listing;
}
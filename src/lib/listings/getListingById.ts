import type { Listing } from "@/types/listing";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildListingImageMap } from "@/lib/listings/listingImages";
import { resolveDisplayNameValue } from "@/lib/display-name";
import { runtimeLog } from "@/lib/diagnostics/runtimeLog";

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

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

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

  if (sellerId) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, google_photo_url, county, area, is_business_seller")
      .eq("id", sellerId)
      .maybeSingle();

    runtimeLog("PUBLIC LISTING FETCH", {
      listingId,
      listingOwnerId: sellerId,
      sellerProfileLoaded: Boolean(ownerProfile),
      sellerProfileAvatarUrl: ownerProfile?.avatar_url ?? null,
    });

    if (ownerProfile) {
      const sellerRecord = ((seller ?? {}) as Record<string, unknown>);

      const resolvedDisplayName =
        resolveDisplayNameValue(
          asTrimmedString(sellerRecord.displayName),
          asTrimmedString(sellerRecord.display_name),
          asTrimmedString(sellerRecord.fullName),
          asTrimmedString(sellerRecord.full_name),
          asTrimmedString(sellerRecord.name),
          asTrimmedString(sellerRecord.username),
          asTrimmedString(sellerRecord.email),
          ownerProfile.display_name ?? null
        ) ?? "User";

      const resolvedAvatarUrl =
        asTrimmedString(ownerProfile.avatar_url) ??
        asTrimmedString(sellerRecord.avatarUrl) ??
        asTrimmedString(sellerRecord.avatar_url) ??
        null;

      const avatarSourceUsed = asTrimmedString(ownerProfile.avatar_url)
        ? "ownerProfile"
        : asTrimmedString(sellerRecord.avatarUrl) || asTrimmedString(sellerRecord.avatar_url)
          ? "listingSellerSnapshot"
          : "fallback";

      const resolvedGooglePhotoUrl =
        asTrimmedString(ownerProfile.google_photo_url) ??
        asTrimmedString(sellerRecord.googlePhotoUrl) ??
        asTrimmedString(sellerRecord.google_photo_url) ??
        null;

      const resolvedCounty =
        asTrimmedString(sellerRecord.county) ??
        asTrimmedString(ownerProfile.county) ??
        null;

      const resolvedArea =
        asTrimmedString(sellerRecord.area) ??
        asTrimmedString(ownerProfile.area) ??
        null;

      const needsProfileFallback = !hasValidSellerSnapshot(seller);
      if (needsProfileFallback) {
        const isBusiness = Boolean(ownerProfile.is_business_seller);
        sellerType = isBusiness ? "business" : "private";
      }

      seller = {
        ...sellerRecord,
        displayName: resolvedDisplayName,
        display_name: resolvedDisplayName,
        name:
          resolveDisplayNameValue(
            asTrimmedString(sellerRecord.name),
            asTrimmedString(sellerRecord.username),
            asTrimmedString(sellerRecord.email),
            resolvedDisplayName
          ) ?? resolvedDisplayName,
        avatarUrl: resolvedAvatarUrl,
        avatar_url: resolvedAvatarUrl,
        googlePhotoUrl: resolvedGooglePhotoUrl,
        google_photo_url: resolvedGooglePhotoUrl,
        county: resolvedCounty,
        area: resolvedArea,
      } as Listing["seller"];

      runtimeLog("GET LISTING SELLER AVATAR MAP", {
        listingId,
        listingOwnerId: sellerId,
        authUserId: currentUserId,
        sellerSnapshotRaw: sellerRecord,
        ownerProfileAvatarUrl: ownerProfile.avatar_url ?? null,
        sellerSnapshotAvatarUrl:
          asTrimmedString(sellerRecord.avatarUrl) ?? asTrimmedString(sellerRecord.avatar_url),
        sellerSnapshotGooglePhotoUrl:
          asTrimmedString(sellerRecord.googlePhotoUrl) ??
          asTrimmedString(sellerRecord.google_photo_url),
        resolvedAvatarUrl,
        avatarSourceUsed,
      });
    }
  }

  // 🔽 images
  const { data: imageRows } = await supabase
    .from("listing_images")
    .select("listing_id, image_url, storage_path_600, storage_path_1800, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

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

    images: imageData?.images.length ? imageData.images : (data as Listing).images,
    images1600: imageData?.images1600.length
      ? imageData.images1600
      : (data as Listing).images1600,

    coverImage: imageData?.coverImage ?? (data as Listing).coverImage ?? null,

    photoCount: imageData?.photoCount || (data as Listing).photoCount,
  } as Listing;
}
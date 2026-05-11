import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Listing, ListingType } from "@/types/listing";
import { PROMOTED_MAX_ACTIVE } from "@/constants/listingPromotions";
import { buildListingImageMap } from "@/lib/listings/listingImages";

type GetPromotedListingsParams = {
  listingType?: ListingType;
  category?: string | null;
  limit?: number;
  enforceLimit?: boolean;
};

const MAX_LIMIT = 50;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

type ListingImageRow = {
  listing_id?: string | null;
  image_url?: string | null;
  storage_path_600?: string | null;
  storage_path_1800?: string | null;
  sort_order?: number | null;
};

export async function getPromotedListings({
  listingType,
  category,
  limit = PROMOTED_MAX_ACTIVE,
  enforceLimit = false,
}: GetPromotedListingsParams = {}): Promise<Listing[]> {
  const debugLogs =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
  const nowIso = new Date().toISOString();

  const supabase = await createSupabaseServerClient();
  const baseSelect =
    "id, title, description, price, city, category_id, user_id, created_at, updated_at, contact_email, contact_phone, status, listing_type, promoted_until, promotion_status, promotion_weight, last_promoted_at";

  let resolvedCategoryId = category ?? undefined;

  if (resolvedCategoryId && !isUuid(resolvedCategoryId)) {
    const { data: categoryRow, error } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", resolvedCategoryId)
      .maybeSingle();

    if (error) {
      console.warn("PROMOTED CATEGORY LOOKUP FAILED", {
        slug: resolvedCategoryId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    if (!categoryRow?.id) {
      if (debugLogs) {
        console.warn("PROMOTED CATEGORY SLUG NOT FOUND", {
          slug: resolvedCategoryId,
        });
      }
      return [];
    }
    resolvedCategoryId = categoryRow.id;
  }

  if (category && !resolvedCategoryId) {
    return [];
  }

  let query = supabase.from("listings").select(baseSelect);

  if (listingType) {
    query = query.or(`listing_type.eq.${listingType},listing_type.is.null`);
  }

  if (resolvedCategoryId && resolvedCategoryId !== "all") {
    query = query.eq("category_id", resolvedCategoryId);
  }

  query = query
    .eq("status", "active")
    .gt("promoted_until", nowIso)
    .or("promotion_status.is.null,promotion_status.eq.active")
    .order("promotion_weight", { ascending: false, nullsFirst: false })
    .order("last_promoted_at", { ascending: false, nullsFirst: false });

  if (enforceLimit) {
    query = query.limit(safeLimit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("PROMOTED QUERY ERROR FULL", error);
    console.warn("GET PROMOTED LISTINGS FAILED", {
      listingType,
      category: resolvedCategoryId ?? category,
      limit: safeLimit,
      error,
    });
    return [];
  }

  const items = (data ?? []) as Listing[];


  if (items.length > 0) {
    const listingIds = items.map((item) => item.id).filter(Boolean);
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id ?? null;

    if (currentUserId) {
      const { data: savedRows, error: savedError } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", currentUserId)
        .in("listing_id", listingIds);

      if (savedError) {
        console.warn("PROMOTED SAVED LOOKUP FAILED", savedError);
      } else {
        const savedSet = new Set(
          (savedRows ?? [])
            .map((row) => row.listing_id)
            .filter((value): value is string => Boolean(value))
        );
        items.forEach((item) => {
          item.savedByCurrentUser = savedSet.has(item.id);
        });
      }
    }

    const { data: imageRows, error: imageError } = await supabase
      .from("listing_images")
      .select("listing_id, image_url, storage_path_600, storage_path_1800, sort_order")
      .in("listing_id", listingIds)
      .order("sort_order", { ascending: true });

    if (imageError) {
      console.error("Failed to load promoted listing images:", imageError);
    } else if (imageRows && imageRows.length > 0) {
      const imageMap = buildListingImageMap(
        supabase,
        imageRows as ListingImageRow[]
      );

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
  }

  return items;
}

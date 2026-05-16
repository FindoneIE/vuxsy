import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ListingType } from "@/types/listing";
import { buildListingImageMap } from "@/lib/listings/listingImages";
import { withNormalizedPrice } from "@/lib/listings/normalizePrice";

export type GetListingsParams = {
  categoryId?: string;
  county?: string;
  area?: string;
  pageSize?: number;
  cursor?: number | null;
  listingType?: ListingType;
  sort?: ListingSortOption;
  sellerTypes?: Array<"business" | "private">;
  minPrice?: number;
  maxPrice?: number;
};

export type ListingSortOption =
  | "relevance"
  | "best_match"
  | "newest"
  | "price_low"
  | "price_high";

export type ListingRecord = {
  id: string;
  title?: string;
  description?: string;
  category_id?: string;
  city?: string;
  price?: number | null;
  sellerType?: string | null;
  currency?: string;
  user_id?: string;
  listing_type?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  coverImage?: string | null;
  images?: string[];
  images1600?: string[];
  photoCount?: number;
  status?: string;
  spotlightUntil?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  savedByCurrentUser?: boolean | null;
  [key: string]: unknown;
};

export type GetListingsResult = {
  items: ListingRecord[];
  nextCursor: number | null;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

type ListingImageRow = {
  listing_id?: string | null;
  image_url?: string | null;
  storage_path_600?: string | null;
  storage_path_1800?: string | null;
  sort_order?: number | null;
};

function cleanString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

export async function getListings({
  categoryId,
  county,
  area,
  pageSize = DEFAULT_PAGE_SIZE,
  cursor = null,
  listingType,
  sort = "newest",
  sellerTypes,
  minPrice,
  maxPrice,
}: GetListingsParams = {}): Promise<GetListingsResult> {
  const safePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
  const offset = typeof cursor === "number" && cursor >= 0 ? cursor : 0;

  const cleanCategory = cleanString(categoryId);
  const cleanCity = cleanString(county);
  void area;

  const supabase = await createSupabaseServerClient();
  let resolvedCategoryId = cleanCategory;

  if (cleanCategory && !isUuid(cleanCategory)) {
    const { data: category, error } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", cleanCategory)
      .maybeSingle();

    if (error) {
      console.warn("CATEGORY LOOKUP FAILED", {
        slug: cleanCategory,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    if (!category?.id) {
      console.warn("CATEGORY SLUG NOT FOUND, SKIPPING FILTER", {
        slug: cleanCategory,
      });
      resolvedCategoryId = undefined;
    } else {
      resolvedCategoryId = category.id;
    }
  }

  const baseSelect = "*";
  let query = supabase.from("listings").select(baseSelect);

  if (resolvedCategoryId) {
    query = query.eq("category_id", resolvedCategoryId);
  }

  if (cleanCity) {
    query = query.eq("city", cleanCity);
  }

  if (listingType) {
    query = query.eq("listing_type", listingType);
  }

  const effectiveSellerTypes = (sellerTypes ?? []).filter(
    (value): value is "business" | "private" => value === "business" || value === "private"
  );

  if (effectiveSellerTypes.length === 1) {
    query = query.eq("sellerType", effectiveSellerTypes[0]);
  }

  if (typeof minPrice === "number" && Number.isFinite(minPrice)) {
    query = query.gte("price", minPrice);
  }

  if (typeof maxPrice === "number" && Number.isFinite(maxPrice)) {
    query = query.lte("price", maxPrice);
  }

  query = query.eq("status", "active");

  const resolvedSort =
    sort === "price_low" || sort === "price_high" || sort === "newest"
      ? sort
      : "newest";

  if (resolvedSort === "price_low") {
    query = query
      .order("price", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  } else if (resolvedSort === "price_high") {
    query = query
      .order("price", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  } else {
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }

  query = query.range(offset, offset + safePageSize - 1);

  const { data, error } = await query;

  if (error) {
    console.warn("GET LISTINGS FAILED", {
      categoryId,
      county,
      area,
      listingType,
      sellerTypes: effectiveSellerTypes,
      minPrice,
      maxPrice,
      query: {
        select: baseSelect,
        order:
          resolvedSort === "price_low"
            ? ["price asc nulls last", "created_at desc", "id desc"]
            : resolvedSort === "price_high"
            ? ["price desc nulls last", "created_at desc", "id desc"]
            : ["created_at desc", "id desc"],
      },
      error,
    });

    return { items: [], nextCursor: null };
  }

  const items = ((data ?? []) as ListingRecord[]).map((item) => withNormalizedPrice(item));

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
        console.warn("SAVED LISTINGS LOOKUP FAILED", savedError);
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
      console.error("Failed to load listing images:", imageError);
    } else if (imageRows && imageRows.length > 0) {
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
  }
  const nextCursor = items.length === safePageSize ? offset + safePageSize : null;

  return {
    items,
    nextCursor,
  };
}
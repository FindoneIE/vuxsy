import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ListingType } from "@/types/listing";

export type GetListingsParams = {
  categoryId?: string;
  county?: string;
  area?: string;
  pageSize?: number;
  cursor?: number | null;
  listingType?: ListingType;
};

export type ListingRecord = {
  id: string;
  title?: string;
  description?: string;
  category_id?: string;
  city?: string;
  price?: number | null;
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

  const baseSelect =
    "id, title, description, price, city, category_id, user_id, created_at, updated_at, contact_email, contact_phone, status, listing_type";
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

  query = query.eq("status", "active");

  query = query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + safePageSize - 1);

  const { data, error } = await query;

  if (error) {
    console.warn("GET LISTINGS FAILED", {
      categoryId,
      county,
      area,
      listingType,
      query: {
        select: baseSelect,
        order: ["created_at desc", "id desc"],
      },
      error,
    });

    return { items: [], nextCursor: null };
  }

  const items = (data ?? []) as ListingRecord[];

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
      .select("listing_id, storage_path_600, storage_path_1800, sort_order")
      .in("listing_id", listingIds)
      .order("sort_order", { ascending: true });

    if (imageError) {
      console.error("Failed to load listing images:", imageError);
    } else if (imageRows && imageRows.length > 0) {
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
  }
  const nextCursor = items.length === safePageSize ? offset + safePageSize : null;

  return {
    items,
    nextCursor,
  };
}
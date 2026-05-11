import type { SupabaseClient } from "@supabase/supabase-js";

type ListingImageRow = {
  listing_id?: string | null;
  image_url?: string | null;
  storage_path_600?: string | null;
  storage_path_1800?: string | null;
  sort_order?: number | null;
};

type ListingImageMapValue = {
  images: string[];
  images1600: string[];
  coverImage: string | null;
  photoCount: number;
};

const resolveImageUrl = (
  supabase: SupabaseClient,
  row: ListingImageRow,
  variant: "thumb" | "large"
): string | null => {
  if (row.image_url) return row.image_url;

  const thumbPath = row.storage_path_600 ?? null;
  const largePath = row.storage_path_1800 ?? null;

  const getPublicUrl = (path: string | null) =>
    path
      ? supabase.storage.from("uploads").getPublicUrl(path).data?.publicUrl ?? null
      : null;

  const thumbUrl = getPublicUrl(thumbPath);
  const largeUrl = getPublicUrl(largePath);

  if (variant === "thumb") {
    return thumbUrl ?? largeUrl ?? null;
  }

  return largeUrl ?? thumbUrl ?? null;
};

export const buildListingImageMap = (
  supabase: SupabaseClient,
  rows: ListingImageRow[]
): Map<string, ListingImageMapValue> => {
  const map = new Map<string, ListingImageMapValue>();

  rows.forEach((row) => {
    if (!row.listing_id) return;
    const current = map.get(row.listing_id) ?? {
      images: [],
      images1600: [],
      coverImage: null,
      photoCount: 0,
    };

    const thumbUrl = resolveImageUrl(supabase, row, "thumb");
    const largeUrl = resolveImageUrl(supabase, row, "large");

    if (thumbUrl) {
      current.images.push(thumbUrl);
    }
    if (largeUrl) {
      current.images1600.push(largeUrl);
    }

    current.photoCount += 1;

    if (!current.coverImage) {
      current.coverImage = thumbUrl ?? largeUrl ?? null;
    }

    map.set(row.listing_id, current);
  });

  return map;
};

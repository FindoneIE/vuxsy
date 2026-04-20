import type { ListingInsert } from "@/types/listing";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

export async function createListing(data: ListingInsert) {
  const tableName = "listings";
  const supabase = createSupabaseBrowserClient();
  const now = new Date().toISOString();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error("Failed to read authenticated user", { cause: authError });
  }

  if (!user?.id) {
    throw new Error("No authenticated user available to create listing");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(`Failed to verify profile for user: ${user.id}`, {
      cause: profileError,
    });
  }

  if (!profile?.id) {
    throw new Error(`Profile not found for user: ${user.id}`);
  }
  if (process.env.NODE_ENV === "development") {
    console.log("CREATE LISTING RAW CATEGORY:", {
      category: (data as { category?: unknown }).category,
      category_id: data.category_id,
    });
  }

  const categorySlug = String(
    (data as { category?: unknown }).category ?? data.category_id ?? ""
  ).trim();
  let resolvedCategoryId = data.category_id ?? null;

  if (categorySlug && !isUuid(categorySlug)) {
    const { data: category, error } = await supabase
      .from("categories")
      .select("id, slug")
      .eq("slug", categorySlug)
      .single();

    if (error) {
      throw new Error(`Failed to resolve category slug: ${categorySlug}`, {
        cause: error,
      });
    }

    if (!category?.id) {
      throw new Error(`Invalid category slug provided: ${categorySlug}`);
    }

    if (!isUuid(category.id)) {
      throw new Error(`Resolved category id is not a UUID: ${category.id}`);
    }

    resolvedCategoryId = category.id;
  } else if (categorySlug && isUuid(categorySlug)) {
    resolvedCategoryId = categorySlug;
  }

  if (resolvedCategoryId && !isUuid(resolvedCategoryId)) {
    throw new Error(`category_id must be a UUID: ${categorySlug}`);
  }

  const payload: Record<string, unknown> = {
    title: data.title,
    description: data.description ?? null,
    price: data.price ?? null,
    youtube_url: (data as { youtubeUrl?: string | null }).youtubeUrl || null,
    category_id: resolvedCategoryId,
    county: data.county ?? null,
    area: data.area ?? null,
    user_id: user.id,
    created_at: now,
    updated_at: now,
    contact_email: data.contact_email ?? null,
    contact_phone: data.contact_phone ?? null,
    allow_messages: data.allow_messages ?? true,
    allow_email: data.allow_email ?? false,
    allow_phone: data.allow_phone ?? false,
    show_email_publicly: data.show_email_publicly ?? false,
    show_phone_publicly: data.show_phone_publicly ?? false,
  };

  if (data.status != null) {
    payload.status = data.status;
  }

  if (data.listing_type != null) {
    payload.listing_type = data.listing_type;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("CREATE LISTING PAYLOAD:", { table: tableName, payload });
  }

  const { data: inserted, error } = await supabase
    .from(tableName)
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("CREATE LISTING FAILED:", {
      table: tableName,
      error,
      payload,
    });
    const message = error.message ?? "Failed to create listing";
    throw new Error(message, { cause: error });
  }

  if (process.env.NODE_ENV === "development") {
    console.log("CREATE LISTING SUCCESS:", {
      table: tableName,
      id: inserted?.id,
    });
  }

  if (!inserted?.id) {
    throw new Error("Listing creation returned no id");
  }

  return inserted.id;
}
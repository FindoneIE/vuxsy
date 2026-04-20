import type { ListingUpdate } from "@/types/listing";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function updateListing(id: string, data: ListingUpdate) {
  const supabase = createSupabaseBrowserClient();
  const now = new Date().toISOString();
  const cleanPayload = {
    title: data.title ?? "",
    description: data.description ?? "",
    category_id: data.category_id ?? null,
    county: data.county ?? null,
    area: data.area ?? null,
    price: typeof data.price === "number" ? data.price : null,
    status: data.status ?? "active",
    listing_type: data.listing_type ?? "service",
    contact_email: data.contact_email ?? null,
    contact_phone: data.contact_phone ?? null,
  allow_messages: data.allow_messages ?? true,
  allow_email: data.allow_email ?? false,
  allow_phone: data.allow_phone ?? false,
  show_email_publicly: data.show_email_publicly ?? false,
  show_phone_publicly: data.show_phone_publicly ?? false,
    marketplace_condition:
      (data as { marketplaceCondition?: string | null }).marketplaceCondition ??
      (data as { marketplace_condition?: string | null }).marketplace_condition ??
      null,
    updated_at: now,
  };

  console.log("FINAL LISTINGS UPDATE PAYLOAD", cleanPayload);

  const { error } = await supabase
    .from("listings")
    .update(cleanPayload)
    .eq("id", id);

  if (error) {
    console.warn("Listing update failed", {
      id,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload: cleanPayload,
    });
    return { id, error };
  }
  return { id, error: null };
}

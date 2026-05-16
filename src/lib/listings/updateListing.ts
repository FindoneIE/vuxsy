import type { ListingUpdate } from "@/types/listing";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateTitleAndDescription } from "@/lib/listings/titleDescriptionValidation";

export async function updateListing(id: string, data: ListingUpdate) {
  const supabase = createSupabaseBrowserClient();
  const now = new Date().toISOString();
  const {
    normalizedTitle,
    normalizedDescription,
    titleError,
    descriptionError,
  } = validateTitleAndDescription(data.title ?? "", data.description ?? "");

  if (titleError || descriptionError) {
    return {
      id,
      error: {
        message: [titleError, descriptionError].filter(Boolean).join(" "),
        code: "VALIDATION_ERROR",
        details: null,
        hint: null,
      },
    };
  }

  const sellerSnapshot = (() => {
    if (!data.seller) return undefined;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const seller = data.seller as ListingUpdate["seller"] & Record<string, unknown>;
    const normalized = {
      displayName:
        seller.displayName ?? (seller as any).display_name ?? null,
      display_name:
        (seller as any).display_name ?? seller.displayName ?? null,
      fullName:
        seller.fullName ?? (seller as any).full_name ?? null,
      full_name:
        (seller as any).full_name ?? seller.fullName ?? null,
      name: seller.name ?? (seller as any).name ?? null,
      username: (seller as any).username ?? null,
      email: (seller as any).email ?? null,
      companyName:
        seller.companyName ?? (seller as any).company_name ?? null,
      company_name:
        (seller as any).company_name ?? seller.companyName ?? null,
      businessAddress:
        (seller as any).businessAddress ?? (seller as any).business_address ?? null,
      business_address:
        (seller as any).business_address ?? (seller as any).businessAddress ?? null,
      vatNumber:
        (seller as any).vatNumber ?? (seller as any).vat_number ?? null,
      vat_number:
        (seller as any).vat_number ?? (seller as any).vatNumber ?? null,
      registrationNumber:
        (seller as any).registrationNumber ?? (seller as any).registration_number ?? null,
      registration_number:
        (seller as any).registration_number ?? (seller as any).registrationNumber ?? null,
      isBusinessSeller:
        seller.isBusinessSeller ?? (seller as any).is_business_seller ?? null,
      is_business_seller:
        (seller as any).is_business_seller ?? seller.isBusinessSeller ?? null,
      county: seller.county ?? null,
      area: seller.area ?? null,
      avatarUrl:
        seller.avatarUrl ?? (seller as any).avatar_url ?? null,
      avatar_url:
        (seller as any).avatar_url ?? seller.avatarUrl ?? null,
      googlePhotoUrl:
        seller.googlePhotoUrl ?? (seller as any).google_photo_url ?? null,
      google_photo_url:
        (seller as any).google_photo_url ?? seller.googlePhotoUrl ?? null,
      contact_phone: (seller as any).contact_phone ?? null,
      contact_email: (seller as any).contact_email ?? null,
      website: seller.website ?? null,
      created_at: (seller as any).created_at ?? seller.createdAt ?? null,
      createdAt: seller.createdAt ?? (seller as any).created_at ?? null,
      type: seller.type ?? null,
      sellerType: (seller as any).sellerType ?? null,
      seller_type: (seller as any).seller_type ?? (seller as any).sellerType ?? null,
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return normalized;
  })();
  const cleanPayload: Record<string, unknown> = {
    title: normalizedTitle,
    description: normalizedDescription || null,
    category_id: data.category_id ?? null,
    county: data.county ?? null,
    area: data.area ?? null,
    price: typeof data.price === "number" ? data.price : null,
    listing_type: data.listing_type ?? "service",
    contact_email: data.contact_email ?? null,
    contact_phone: data.contact_phone ?? null,
  allow_messages: data.allow_messages ?? true,
  allow_email: data.allow_email ?? false,
  allow_phone: data.allow_phone ?? false,
  show_email_publicly: data.show_email_publicly ?? false,
  show_phone_publicly: data.show_phone_publicly ?? false,
    updated_at: now,
  };

  if (data.sellerType != null) {
    (cleanPayload as { sellerType?: ListingUpdate["sellerType"] | null }).sellerType =
      data.sellerType;
  }

  if (data.status != null) {
    (cleanPayload as { status?: ListingUpdate["status"] }).status = data.status;
  }

  if (sellerSnapshot) {
    (cleanPayload as { seller?: ListingUpdate["seller"] }).seller = sellerSnapshot;
  }

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

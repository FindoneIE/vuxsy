import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/user";

export const getAvatarSource = (profile: {
  avatarUrl?: string | null;
  googlePhotoUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
}) => {
  if (profile.avatarUrl) return "custom" as const;
  if (profile.googlePhotoUrl) return "google" as const;
  if (profile.displayName || profile.email) return "initials" as const;
  return "placeholder" as const;
};

export const resolveAvatarUrl = (
  avatarUrl?: string | null,
  googlePhotoUrl?: string | null
) => avatarUrl || googlePhotoUrl || null;

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
) => {
  const supabase = createSupabaseBrowserClient();
  const { role, ...safeUpdates } = updates;
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id: userId,
    updated_at: now,
  };

  void role;

  if ("displayName" in safeUpdates) payload.display_name = safeUpdates.displayName ?? null;
  if ("email" in safeUpdates) payload.email = safeUpdates.email ?? null;
  if ("phone" in safeUpdates) payload.phone = safeUpdates.phone ?? null;
  if ("city" in safeUpdates) payload.city = safeUpdates.city ?? null;
  if ("county" in safeUpdates) payload.county = safeUpdates.county ?? null;
  if ("area" in safeUpdates) payload.area = safeUpdates.area ?? null;
  if ("businessSeller" in safeUpdates)
    payload.is_business_seller = safeUpdates.businessSeller ?? null;
  if ("companyName" in safeUpdates) payload.company_name = safeUpdates.companyName ?? null;
  if ("businessAddress" in safeUpdates)
    payload.business_address = safeUpdates.businessAddress ?? null;
  if ("vatNumber" in safeUpdates) payload.vat_number = safeUpdates.vatNumber ?? null;
  if ("website" in safeUpdates) payload.website = safeUpdates.website ?? null;
  if ("registrationNumber" in safeUpdates)
    payload.company_registration_number = safeUpdates.registrationNumber ?? null;
  if ("avatarUrl" in safeUpdates) payload.avatar_url = safeUpdates.avatarUrl ?? null;
  if ("googlePhotoUrl" in safeUpdates) payload.google_photo_url = safeUpdates.googlePhotoUrl ?? null;
  if ("language" in safeUpdates) payload.language = safeUpdates.language ?? null;
  if ("emailNotifications" in safeUpdates)
    payload.email_notifications = safeUpdates.emailNotifications ?? null;
  if ("marketplaceAlerts" in safeUpdates)
    payload.marketplace_alerts = safeUpdates.marketplaceAlerts ?? null;
  if ("messageNotifications" in safeUpdates)
    payload.message_notifications = safeUpdates.messageNotifications ?? null;
  if ("createdAt" in safeUpdates) payload.created_at = safeUpdates.createdAt ?? null;
  if ("updatedAt" in safeUpdates) payload.updated_at = safeUpdates.updatedAt ?? now;

  console.info("TEMP LOG: profile save payload", payload);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, email, display_name, role, phone, city, county, area, is_business_seller, company_name, business_address, vat_number, website, company_registration_number, avatar_url, google_photo_url, language, email_notifications, marketplace_alerts, message_notifications, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    console.error("TEMP LOG: profile upsert error", error);
    throw error;
  }

  console.info("TEMP LOG: profile upsert result", data);
  return data;
};

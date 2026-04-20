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
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id: userId,
    updated_at: now,
  };

  if ("displayName" in updates) payload.display_name = updates.displayName ?? null;
  if ("email" in updates) payload.email = updates.email ?? null;
  if ("phone" in updates) payload.phone = updates.phone ?? null;
  if ("city" in updates) payload.city = updates.city ?? null;
  if ("county" in updates) payload.county = updates.county ?? null;
  if ("area" in updates) payload.area = updates.area ?? null;
  if ("businessSeller" in updates)
    payload.is_business_seller = updates.businessSeller ?? null;
  if ("companyName" in updates) payload.company_name = updates.companyName ?? null;
  if ("businessAddress" in updates)
    payload.business_address = updates.businessAddress ?? null;
  if ("vatNumber" in updates) payload.vat_number = updates.vatNumber ?? null;
  if ("website" in updates) payload.website = updates.website ?? null;
  if ("registrationNumber" in updates)
    payload.company_registration_number = updates.registrationNumber ?? null;
  if ("avatarUrl" in updates) payload.avatar_url = updates.avatarUrl ?? null;
  if ("googlePhotoUrl" in updates) payload.google_photo_url = updates.googlePhotoUrl ?? null;
  if ("language" in updates) payload.language = updates.language ?? null;
  if ("emailNotifications" in updates)
    payload.email_notifications = updates.emailNotifications ?? null;
  if ("marketplaceAlerts" in updates)
    payload.marketplace_alerts = updates.marketplaceAlerts ?? null;
  if ("messageNotifications" in updates)
    payload.message_notifications = updates.messageNotifications ?? null;
  if ("createdAt" in updates) payload.created_at = updates.createdAt ?? null;
  if ("updatedAt" in updates) payload.updated_at = updates.updatedAt ?? now;

  console.info("TEMP LOG: profile save payload", payload);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, email, display_name, phone, city, county, area, is_business_seller, company_name, business_address, vat_number, website, company_registration_number, avatar_url, google_photo_url, language, email_notifications, marketplace_alerts, message_notifications, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    console.error("TEMP LOG: profile upsert error", error);
    throw error;
  }

  console.info("TEMP LOG: profile upsert result", data);
  return data;
};

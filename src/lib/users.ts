import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildSellerSnapshotFromProfile } from "@/lib/listings/sellerSnapshot";
import { runtimeLog } from "@/lib/diagnostics/runtimeLog";
import type { Listing } from "@/types/listing";
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
  const hasAvatarUpdate =
    Object.prototype.hasOwnProperty.call(safeUpdates, "avatarUrl") ||
    Object.prototype.hasOwnProperty.call(safeUpdates, "googlePhotoUrl");
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

  let profileBefore: {
    avatar_url?: string | null;
    google_photo_url?: string | null;
  } | null = null;

  if (hasAvatarUpdate) {
    const { data: beforeRow } = await supabase
      .from("profiles")
      .select("avatar_url, google_photo_url")
      .eq("id", userId)
      .maybeSingle();

    profileBefore = beforeRow;
    runtimeLog("PROFILE AVATAR BEFORE", {
      userId,
      avatar_url: beforeRow?.avatar_url ?? null,
      google_photo_url: beforeRow?.google_photo_url ?? null,
    });
  }

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

  if (hasAvatarUpdate) {
    runtimeLog("PROFILE AVATAR AFTER", {
      userId,
      avatar_url: data?.avatar_url ?? null,
      google_photo_url: data?.google_photo_url ?? null,
      previous_avatar_url: profileBefore?.avatar_url ?? null,
      previous_google_photo_url: profileBefore?.google_photo_url ?? null,
    });
  }

  if (hasAvatarUpdate) {
    const hasExplicitAvatarUpdate = Object.prototype.hasOwnProperty.call(safeUpdates, "avatarUrl");
    const hasExplicitGooglePhotoUpdate = Object.prototype.hasOwnProperty.call(
      safeUpdates,
      "googlePhotoUrl"
    );

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id, seller, sellerType")
      .eq("user_id", userId);

    if (!listingsError && listings?.length) {
      await Promise.all(
        listings.map((listing) => {
          const existingSellerSnapshot =
            (listing.seller as Listing["seller"] | null) ?? null;

          runtimeLog("SELLER SNAPSHOT DB BEFORE", {
            listingId: listing.id,
            sellerSnapshot: existingSellerSnapshot,
            sellerAvatarUrl:
              (existingSellerSnapshot as { avatarUrl?: string | null; avatar_url?: string | null } | null)
                ?.avatarUrl ??
              (existingSellerSnapshot as { avatar_url?: string | null } | null)?.avatar_url ??
              null,
            sellerGooglePhotoUrl:
              (existingSellerSnapshot as {
                googlePhotoUrl?: string | null;
                google_photo_url?: string | null;
              } | null)?.googlePhotoUrl ??
              (existingSellerSnapshot as { google_photo_url?: string | null } | null)
                ?.google_photo_url ??
              null,
          });

          const { sellerSnapshot: nextSellerSnapshot, sellerType } =
            buildSellerSnapshotFromProfile(data, {
              sellerType: (listing as { sellerType?: Listing["sellerType"] | null }).sellerType ?? null,
              ...(hasExplicitAvatarUpdate
                ? {
                    avatarUrl:
                      (safeUpdates as { avatarUrl?: string | null }).avatarUrl ?? null,
                  }
                : {}),
              ...(hasExplicitGooglePhotoUpdate
                ? {
                    googlePhotoUrl:
                      (safeUpdates as { googlePhotoUrl?: string | null }).googlePhotoUrl ?? null,
                  }
                : {}),
              existingSeller: existingSellerSnapshot,
            });

          return supabase
            .from("listings")
            .update({
              seller: nextSellerSnapshot,
              sellerType,
            })
            .eq("id", listing.id)
            .select("id, seller")
            .maybeSingle()
            .then(({ data: updatedListing }) => {
              const updatedSeller =
                (updatedListing?.seller as Listing["seller"] | null) ?? null;

              runtimeLog("SELLER SNAPSHOT DB AFTER", {
                listingId: listing.id,
                sellerSnapshot: updatedSeller,
                sellerAvatarUrl:
                  (updatedSeller as {
                    avatarUrl?: string | null;
                    avatar_url?: string | null;
                  } | null)?.avatarUrl ??
                  (updatedSeller as { avatar_url?: string | null } | null)?.avatar_url ??
                  null,
                sellerGooglePhotoUrl:
                  (updatedSeller as {
                    googlePhotoUrl?: string | null;
                    google_photo_url?: string | null;
                  } | null)?.googlePhotoUrl ??
                  (updatedSeller as { google_photo_url?: string | null } | null)
                    ?.google_photo_url ??
                  null,
              });
            });
        })
      );
    }
  }

  console.info("TEMP LOG: profile upsert result", data);
  return data;
};

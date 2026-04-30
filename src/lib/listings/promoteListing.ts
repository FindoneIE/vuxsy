import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ListingType } from "@/types/listing";
import { PROMOTION_DURATION_HOURS } from "@/constants/listingPromotions";
import { canPromoteListing } from "@/lib/listings/promoteCooldown";

type PromoteListingOptions = {
  listingType?: ListingType;
  durationHours?: number;
};

export async function promoteListing(id: string, options: PromoteListingOptions = {}) {
  const supabase = createSupabaseBrowserClient();
  const nowIso = new Date().toISOString();
  const durationHours = (options.durationHours ?? PROMOTION_DURATION_HOURS) * 1;
  const promotedUntilIso = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  const debugLogs =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";

  const { data: existing, error: fetchError } = await supabase
    .from("listings")
    .select("created_at, last_promoted_at")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.warn("Promote listing lookup failed", {
      id,
      code: fetchError.code,
      message: fetchError.message,
      details: fetchError.details,
      hint: fetchError.hint,
    });
    return { error: fetchError, payload: null };
  }

  if (
    existing &&
    !canPromoteListing({
      createdAt: existing.created_at ?? null,
      lastPromotedAt: existing.last_promoted_at ?? null,
    })
  ) {
    return { error: { message: "Boost available in 24h" }, payload: null };
  }

  const payload: Record<string, unknown> = {
    updated_at: nowIso,
    last_promoted_at: nowIso,
    promoted_until: promotedUntilIso,
    promotion_status: "active",
    promotion_tier: "standard",
    promotion_weight: 1,
    promotion_source: "free",
  };

  if (options.listingType) {
    payload.listing_type = options.listingType;
  }

  if (debugLogs) {
    console.log("PROMOTE LISTING PAYLOAD", { id, payload });
  }

  const { error } = await supabase.from("listings").update(payload).eq("id", id);

  if (error) {
    console.warn("Promote listing failed", {
      id,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { error, payload: null };
  }

  if (debugLogs) {
    console.log("dashboard promote saved", id, promotedUntilIso, nowIso);
  }

  return { error: null, payload };
}

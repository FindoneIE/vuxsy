import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Listing } from "@/types/listing";

export async function updateListingStatus(
  id: string,
  status: Listing["status"],
  options: { bumpOnActivate?: boolean } = {}
) {
  const supabase = createSupabaseBrowserClient();
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status,
    updated_at: now,
  };

  if (options.bumpOnActivate && status === "active") {
    payload.last_promoted_at = now;
  }

  console.log("LISTING STATUS UPDATE PAYLOAD", { id, payload });

  const { error } = await supabase.from("listings").update(payload).eq("id", id);

  return { error };
}

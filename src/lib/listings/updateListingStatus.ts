import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Listing } from "@/types/listing";

export async function updateListingStatus(id: string, status: Listing["status"]) {
  const supabase = createSupabaseBrowserClient();
  const payload = {
    status,
    updated_at: new Date().toISOString(),
  };

  console.log("LISTING STATUS UPDATE PAYLOAD", { id, payload });

  const { error } = await supabase.from("listings").update(payload).eq("id", id);

  return { error };
}

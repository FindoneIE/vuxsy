import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function promoteListing(id: string) {
  const supabase = createSupabaseBrowserClient();

  const payload = {
    updated_at: new Date().toISOString(),
  };

  console.log("PROMOTE LISTING PAYLOAD", { id, payload });

  const { error } = await supabase.from("listings").update(payload).eq("id", id);

  if (error) {
    console.warn("Promote listing failed", {
      id,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { error };
  }

  return { error: null };
}

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function deleteListing(id: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) {
    throw error;
  }
  return true;
}

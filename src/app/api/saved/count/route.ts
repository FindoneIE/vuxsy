import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { count, error } = await supabase
      .from("saved_listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to load saved count" }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    console.error("/api/saved/count error", error);
    return NextResponse.json({ error: "Failed to load saved count" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TogglePayload = {
  listingId?: string;
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = (await req.json()) as TogglePayload;
    const listingId = payload.listingId?.trim();

    if (!listingId) {
      return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
    }

    const { data: listingRow, error: listingError } = await supabase
      .from("listings")
      .select("id")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError || !listingRow) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("saved_listings")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Failed to check saved" }, { status: 500 });
    }

    if (existing?.id) {
      const { error: deleteError } = await supabase
        .from("saved_listings")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        return NextResponse.json({ error: "Failed to remove saved listing" }, { status: 500 });
      }

      return NextResponse.json({ saved: false });
    }

    const { error: insertError } = await supabase.from("saved_listings").insert({
      user_id: user.id,
      listing_id: listingId,
    });

    if (insertError) {
      return NextResponse.json({ error: "Failed to save listing" }, { status: 500 });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("/api/saved/toggle error", error);
    return NextResponse.json({ error: "Failed to update saved listing" }, { status: 500 });
  }
}

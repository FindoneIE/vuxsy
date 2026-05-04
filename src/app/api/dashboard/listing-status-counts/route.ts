import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ListingType } from "@/types/listing";

const DEFAULT_COUNTS = {
  all: 0,
  active: 0,
  paused: 0,
  archived: 0,
  draft: 0,
  pending: 0,
  rejected: 0,
};

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const listingType = searchParams.get("listingType") as ListingType | null;

    let query = supabase
      .from("listings")
      .select("status", { count: "exact" })
      .eq("user_id", user.id);

    if (listingType) {
      query = query.eq("listing_type", listingType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to load listing counts" }, { status: 500 });
    }

    const counts = { ...DEFAULT_COUNTS };

    (data ?? []).forEach((row) => {
      const status = (row as { status?: string | null }).status ?? "active";
      if (status in counts) {
        counts[status as keyof typeof counts] += 1;
      }
      counts.all += 1;
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("/api/dashboard/listing-status-counts error", error);
    return NextResponse.json({ error: "Failed to load listing counts" }, { status: 500 });
  }
}

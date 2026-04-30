import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_REASONS = new Set([
  "Spam or misleading",
  "Scam or fraud",
  "Inappropriate content",
  "Duplicate listing",
  "Wrong category",
  "Offensive or abusive",
  "Other",
]);

type ReportPayload = {
  listingId?: string;
  reason?: string;
  message?: string | null;
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

    const payload = (await req.json()) as ReportPayload;
    const listingId = payload.listingId?.trim();
    const reason = payload.reason?.trim();
    const message = payload.message?.trim() || null;

    if (!listingId || !reason || !VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: "Invalid report payload" }, { status: 400 });
    }

    const { data: listingRow, error: listingError } = await supabase
      .from("listings")
      .select("id, user_id")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError || !listingRow) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listingRow.user_id && listingRow.user_id === user.id) {
      return NextResponse.json({ error: "You cannot report your own listing" }, { status: 403 });
    }

    const { error: insertError } = await supabase.from("listing_reports").insert({
      listing_id: listingId,
      reporter_id: user.id,
      reason,
      message,
    });

    if (insertError) {
      console.error("REPORT INSERT ERROR", insertError);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}

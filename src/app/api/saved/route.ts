import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSavedListings } from "@/lib/listings/getSavedListings";
import type { ListingRecord } from "@/lib/listings/getListings";

function serializeListing(item: ListingRecord) {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    if (
      value &&
      typeof value === "object" &&
      "toDate" in value &&
      typeof (value as { toDate?: () => Date }).toDate === "function"
    ) {
      try {
        out[key] = (value as { toDate: () => Date }).toDate().toISOString();
      } catch {
        out[key] = String(value);
      }
    } else if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  }

  return out;
}

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

    const items = await getSavedListings(user.id);
    const serialized = items.map((item) => serializeListing(item));

    return NextResponse.json({ items: serialized, count: serialized.length });
  } catch (error) {
    console.error("/api/saved error", error);
    return NextResponse.json(
      { error: "Failed to load saved listings" },
      { status: 500 }
    );
  }
}

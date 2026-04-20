import { NextResponse } from "next/server";
import { getListings, type ListingRecord } from "@/lib/listings/getListings";

function serializeListing(item: ListingRecord) {
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(item)) {
    if (
      v &&
      typeof v === "object" &&
      "toDate" in v &&
      typeof (v as { toDate?: () => Date }).toDate === "function"
    ) {
      try {
        out[k] = (v as { toDate: () => Date }).toDate().toISOString();
      } catch {
        out[k] = String(v);
      }
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else {
      out[k] = v;
    }
  }

  return out;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
  const categoryId = url.searchParams.get("category") ?? undefined;
    const county = url.searchParams.get("county") ?? undefined;
    const area = url.searchParams.get("area") ?? undefined;
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20") || 20;

    

    const result = await getListings({
      categoryId,
      county,
      area,
      pageSize,
      listingType: "marketplace",
    });

    const items = (result.items || []).map((it) => serializeListing(it));

    

    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    console.error("/api/marketplace error", err);
    return NextResponse.json(
      {
        error: (err as Error)?.message || "Failed to load marketplace listings",
        details: err,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return new Response("create marketplace");
}
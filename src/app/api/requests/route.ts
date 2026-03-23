import { getListings, type ListingRecord } from "@/lib/listings/getListings";

function serializeListing(item: ListingRecord) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) {
    if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate?: () => Date }).toDate === "function") {
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
    const category = url.searchParams.get("category") ?? undefined;
    const county = url.searchParams.get("county") ?? undefined;
    const area = url.searchParams.get("area") ?? undefined;
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20") || 20;

    console.log("API REQUESTS QUERY:", { category, county, area, pageSize });

    const result = await getListings({ type: "request", category, county, area, pageSize });

    const items = (result.items || []).map((it) => serializeListing(it));

    console.log("API REQUESTS RESULT:", { count: items.length });

    return new Response(JSON.stringify({ items, count: items.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("/api/requests error", err);
    return new Response(JSON.stringify({ error: "Failed to load requests" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST() {
  return new Response("create request");
}

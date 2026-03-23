import { getActiveListingCount, type ListingType } from "@/lib/listings/getActiveListingCount";

const MODE_TO_TYPE: Record<string, ListingType> = {
  services: "service",
  requests: "request",
  marketplace: "marketplace",
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "services";
    const type = MODE_TO_TYPE[mode] ?? "service";
    const category = url.searchParams.get("category") ?? undefined;
    const county = url.searchParams.get("county") ?? undefined;
    const area = url.searchParams.get("area") ?? undefined;

    const count = await getActiveListingCount({ type, category, county, area });

    return new Response(JSON.stringify({ count }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("/api/listing-count error", error);
    return new Response(JSON.stringify({ error: "Failed to load listing count" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

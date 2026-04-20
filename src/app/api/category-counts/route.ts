import { getActiveCategoryCounts } from "@/lib/listings/getActiveCategoryCounts";
import type { ListingType } from "@/types/listing";

function resolveListingType(mode?: string | null): ListingType | undefined {
  if (!mode) return undefined;
  if (mode === "marketplace") return "marketplace";
  if (mode === "services") return "service";
  if (mode === "requests") return "request";
  return undefined;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const listingType = resolveListingType(url.searchParams.get("mode"));
    const counts = await getActiveCategoryCounts(listingType);

    return new Response(JSON.stringify({ counts }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("/api/category-counts error", error);
    return new Response(JSON.stringify({ error: "Failed to load category counts" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

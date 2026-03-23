import { getActiveCategoryCounts, type ListingType } from "@/lib/listings/getActiveCategoryCounts";

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

    const counts = await getActiveCategoryCounts(type);

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

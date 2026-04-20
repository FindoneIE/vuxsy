import { getActiveListingCount } from "@/lib/listings/getActiveListingCount";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
  const categoryId = url.searchParams.get("category") ?? undefined;
    const county = url.searchParams.get("county") ?? undefined;
    const area = url.searchParams.get("area") ?? undefined;

  const count = await getActiveListingCount({ categoryId, county, area });

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

type ListingHrefInput = {
  id: string;
  type?: "service" | "request" | "marketplace";
  category?: string;
};

export function getListingHref({
  id,
  type,
  category,
}: ListingHrefInput) {
  const safeCategory = category ?? "general";

  if (type === "service") {
    return `/services/${safeCategory}/${id}`;
  }

  if (type === "request") {
    return `/requests/${safeCategory}/${id}`;
  }

  return `/marketplace/${safeCategory}/${id}`;
}
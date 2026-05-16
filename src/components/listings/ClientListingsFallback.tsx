import ListingsList from "@/components/listings/ListingsList";
import type { Listing } from "@/types/listing";

type ClientListingsFallbackProps = {
  mode: "services" | "requests" | "marketplace";
  items: Listing[];
};

export default function ClientListingsFallback({
  mode,
  items,
}: ClientListingsFallbackProps) {
  if (process.env.NODE_ENV !== "production") {
    const route = mode === "services" ? "/services" : mode === "requests" ? "/requests" : "/marketplace";
    console.debug("[mount-trace] ClientListingsFallback render", {
      route,
      mode,
      file: "src/components/listings/ClientListingsFallback.tsx",
      itemsLength: items.length,
    });
  }

  const noun = mode === "requests" ? "jobs" : "listings";

  return (
    <div className="w-full min-w-0" aria-hidden>
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">
            Loading {mode === "requests" ? "Get Help" : mode === "services" ? "Services" : "Marketplace"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {`${items.length.toLocaleString()} ${noun}`}
          </p>
        </div>
      </div>

      {items.length > 0 ? <ListingsList items={items} /> : null}
    </div>
  );
}

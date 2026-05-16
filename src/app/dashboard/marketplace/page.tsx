import { redirect } from "next/navigation";

// Opt out of prerendering: redirect target /dashboard/listings is dynamic
// (uses useSearchParams). The root Suspense boundary was removed (Fix 1).
export const dynamic = "force-dynamic";

export default function DashboardMarketplacePage() {
  redirect("/dashboard/listings?type=product");
}

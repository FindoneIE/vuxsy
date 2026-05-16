import DashboardListingsView from "@/components/dashboard/DashboardListingsView";

// Opt out of prerendering: DashboardListingsView uses useSearchParams(). The
// root src/app/loading.tsx Suspense boundary was removed (Fix 1). Dashboard
// is auth-gated and dynamic by nature.
export const dynamic = "force-dynamic";

export default function DashboardListingsPage() {
  return <DashboardListingsView title="My Listings" />;
}

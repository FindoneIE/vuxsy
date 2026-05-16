import DashboardMessages from "@/components/messages/DashboardMessages";

// Opt out of prerendering: transitively uses useSearchParams. Root Suspense
// boundary removed (Fix 1). Auth-gated.
export const dynamic = "force-dynamic";

export default function DashboardMessagesPage() {
  return <DashboardMessages />;
}

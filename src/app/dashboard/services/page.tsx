import { redirect } from "next/navigation";

// Opt out of prerendering: see src/app/dashboard/marketplace/page.tsx.
export const dynamic = "force-dynamic";

export default function DashboardServicesPage() {
  redirect("/dashboard/listings?type=service");
}

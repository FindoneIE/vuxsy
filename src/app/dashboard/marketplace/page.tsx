import { redirect } from "next/navigation";

export default function DashboardMarketplacePage() {
  redirect("/dashboard/listings?type=product");
}

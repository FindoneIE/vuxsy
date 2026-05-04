import { redirect } from "next/navigation";

export default function DashboardRequestsPage() {
  redirect("/dashboard/listings?type=request");
}

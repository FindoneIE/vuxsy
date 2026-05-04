import { redirect } from "next/navigation";

export default function DashboardServicesPage() {
  redirect("/dashboard/listings?type=service");
}

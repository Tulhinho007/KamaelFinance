import { DashboardOverview } from "./dashboard-overview";
import { getCurrentUserAction } from "@/lib/auth-actions";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUserAction();

  if (!user) {
    redirect("/login");
  }

  return <DashboardOverview />;
}

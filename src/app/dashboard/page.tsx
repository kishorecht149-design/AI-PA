import { HomeClient } from "@/components/HomeClient";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const userName = user?.name || "Kishore";

  return <HomeClient userName={userName} />;
}

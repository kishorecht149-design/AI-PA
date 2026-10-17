import { redirect } from "next/navigation";
import { HomeClient } from "@/components/HomeClient";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const userName = user.name || "Member";

  return <HomeClient userName={userName} />;
}

import { HomeClient } from "@/components/HomeClient";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();
  const userName = user?.name || "Kishore Kumar";

  return <HomeClient userName={userName} />;
}

import { CreativePortal } from "@/components/CreativePortal";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();

  return <CreativePortal currentUser={user} />;
}

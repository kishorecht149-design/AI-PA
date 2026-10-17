import { NextResponse } from "next/server";
import { resolveApiUserId } from "@/lib/auth";
import { getEseOverview } from "@/lib/ese/service";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const overview = await getEseOverview(userId);
    return NextResponse.json(overview);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load ESE overview" }, { status: 500 });
  }
}

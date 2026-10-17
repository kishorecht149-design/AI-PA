import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { cancelSubscription } from "@/lib/subscription";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await cancelSubscription(user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Subscription successfully cancelled. Your access continues until the end of the paid period.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to cancel subscription." },
      { status: 500 }
    );
  }
}

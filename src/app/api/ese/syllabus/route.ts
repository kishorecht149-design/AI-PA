import { NextResponse } from "next/server";
import { resolveApiUserId } from "@/lib/auth";
import { getEseSyllabusWithProgress } from "@/lib/ese/service";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const syllabus = await getEseSyllabusWithProgress(userId);
    return NextResponse.json(syllabus);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load ESE syllabus" }, { status: 500 });
  }
}

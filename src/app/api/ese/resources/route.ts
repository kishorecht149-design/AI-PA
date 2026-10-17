import { NextResponse } from "next/server";
import { resolveApiUserId, assertWorkspaceWriteAccess } from "@/lib/auth";
import { getEseResources, addOrClassifyEseResource } from "@/lib/ese/service";

export async function GET(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const resources = await getEseResources(userId, search);
    return NextResponse.json(resources);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load resources" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const body = await req.json();
    const { title, url, nodeId } = body;

    const result = await addOrClassifyEseResource(userId, title, url, nodeId);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to save resource" }, { status: 400 });
  }
}

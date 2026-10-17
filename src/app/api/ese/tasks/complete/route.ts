import { NextResponse } from "next/server";
import { resolveApiUserId, assertWorkspaceWriteAccess, getSessionUser } from "@/lib/auth";
import { completeEseTaskWithEvidence } from "@/lib/ese/service";
import { isValidGoogleDriveUrl, MANDATORY_ATTESTATION_TEXT } from "@/lib/ese/schedule-generator";

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const user = await getSessionUser();
    const submitterName = user?.name || "Student";

    const body = await req.json();
    const { taskId, driveUrl, attestationConfirmed } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
    }

    if (!driveUrl || !isValidGoogleDriveUrl(driveUrl)) {
      return NextResponse.json(
        {
          error: "Mandatory evidence required: Please provide a valid Google Drive file or document link (e.g. drive.google.com or docs.google.com).",
          code: "INVALID_DRIVE_URL",
        },
        { status: 400 }
      );
    }

    if (!attestationConfirmed) {
      return NextResponse.json(
        {
          error: `Mandatory attestation required: You must confirm: "${MANDATORY_ATTESTATION_TEXT}"`,
          code: "ATTESTATION_REQUIRED",
        },
        { status: 400 }
      );
    }

    const result = await completeEseTaskWithEvidence(
      userId,
      taskId,
      driveUrl,
      attestationConfirmed,
      submitterName
    );

    return NextResponse.json(result);
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to complete task" }, { status: 400 });
  }
}

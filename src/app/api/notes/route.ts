import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { assertWorkspaceWriteAccess } from "@/lib/subscription";

export async function GET(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    const where: any = { userId };
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { contentMarkdown: { contains: query } },
        { tags: { contains: query } },
      ];
    }

    const [notes, collections] = await Promise.all([
      prisma.note.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        include: {
          collection: true,
          course: { select: { code: true, name: true } },
          project: { select: { name: true } },
          researchProject: { select: { id: true, title: true } },
        },
      }),
      prisma.noteCollection.findMany({
        where: { userId },
      }),
    ]);

    return NextResponse.json({ notes, collections });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const body = await req.json();
    const { title, contentMarkdown, collectionId, courseId, projectId, researchProjectId, tags, isPinned } = body;

    let validCourseId = null;
    if (courseId) {
      const c = await prisma.course.findFirst({ where: { id: courseId, userId } });
      if (c) validCourseId = c.id;
    }

    let validProjectId = null;
    if (projectId) {
      const p = await prisma.project.findFirst({ where: { id: projectId, userId } });
      if (p) validProjectId = p.id;
    }

    let validResearchProjectId = null;
    if (researchProjectId) {
      const rp = await prisma.researchProject.findFirst({ where: { id: researchProjectId, userId } });
      if (rp) validResearchProjectId = rp.id;
    }

    const note = await prisma.note.create({
      data: {
        userId,
        title: title || "Untitled Note",
        contentMarkdown: contentMarkdown || "",
        collectionId: collectionId || null,
        courseId: validCourseId,
        projectId: validProjectId,
        researchProjectId: validResearchProjectId,
        tags: tags || null,
        isPinned: !!isPinned,
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const body = await req.json();
    const { id, title, contentMarkdown, isPinned, courseId, projectId, researchProjectId } = body;

    if (!id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }

    const existing = await prisma.note.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
    }

    let validCourseId = undefined;
    if (courseId !== undefined) {
      if (courseId === null) validCourseId = null;
      else {
        const c = await prisma.course.findFirst({ where: { id: courseId, userId } });
        if (c) validCourseId = c.id;
      }
    }

    let validProjectId = undefined;
    if (projectId !== undefined) {
      if (projectId === null) validProjectId = null;
      else {
        const p = await prisma.project.findFirst({ where: { id: projectId, userId } });
        if (p) validProjectId = p.id;
      }
    }

    let validResearchProjectId = undefined;
    if (researchProjectId !== undefined) {
      if (researchProjectId === null) validResearchProjectId = null;
      else {
        const rp = await prisma.researchProject.findFirst({ where: { id: researchProjectId, userId } });
        if (rp) validResearchProjectId = rp.id;
      }
    }

    const updated = await prisma.note.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(contentMarkdown !== undefined && { contentMarkdown }),
        ...(isPinned !== undefined && { isPinned }),
        ...(validCourseId !== undefined && { courseId: validCourseId }),
        ...(validProjectId !== undefined && { projectId: validProjectId }),
        ...(validResearchProjectId !== undefined && { researchProjectId: validResearchProjectId }),
      },
    });

    return NextResponse.json({ note: updated });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.note.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

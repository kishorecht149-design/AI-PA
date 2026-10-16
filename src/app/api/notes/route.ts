import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

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

    const body = await req.json();
    const { title, contentMarkdown, collectionId, courseId, tags, isPinned } = body;

    const note = await prisma.note.create({
      data: {
        userId,
        title: title || "Untitled Note",
        contentMarkdown: contentMarkdown || "",
        collectionId: collectionId || null,
        courseId: courseId || null,
        tags: tags || null,
        isPinned: !!isPinned,
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, title, contentMarkdown, isPinned } = body;

    if (!id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }

    const existing = await prisma.note.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(contentMarkdown !== undefined && { contentMarkdown }),
        ...(isPinned !== undefined && { isPinned }),
      },
    });

    return NextResponse.json({ note: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.note.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

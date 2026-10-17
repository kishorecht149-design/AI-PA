import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { assertWorkspaceWriteAccess } from "@/lib/subscription";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sections = await prisma.customDashboardSection.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    const parsed = sections.map((s) => ({
      ...s,
      items: JSON.parse(s.itemsJson || "[]"),
    }));

    return NextResponse.json({ sections: parsed });
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
    const { title, description, category, icon, folders, items } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Section title is required" }, { status: 400 });
    }

    // Prepare initial items: if folders array provided, structure them as folder containers
    let initialItems: any[] = [];
    if (Array.isArray(items)) {
      initialItems = items;
    } else if (Array.isArray(folders)) {
      initialItems = folders.map((f: string, idx: number) => ({
        id: `folder_${Date.now()}_${idx}`,
        title: typeof f === "string" ? f : (f as any).title || "Folder",
        type: "folder",
        description: (f as any).description || `Curated ${typeof f === "string" ? f : (f as any).title}`,
        links: (f as any).links || [],
      }));
    }

    const created = await prisma.customDashboardSection.create({
      data: {
        userId,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || "resources",
        icon: icon || "Folder",
        itemsJson: JSON.stringify(initialItems),
      },
    });

    return NextResponse.json({
      section: {
        ...created,
        items: initialItems,
      },
      message: `Section "${created.title}" successfully created on your dashboard.`,
    });
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
    const { sectionId, action, folderTitle, linkTitle, linkUrl, linkNotes, items } = body;

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId is required" }, { status: 400 });
    }

    const section = await prisma.customDashboardSection.findFirst({
      where: { id: sectionId, userId },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    let currentItems = JSON.parse(section.itemsJson || "[]");

    if (action === "ADD_FOLDER" && folderTitle) {
      currentItems.push({
        id: `folder_${Date.now()}`,
        title: folderTitle.trim(),
        type: "folder",
        description: body.description || "",
        links: [],
      });
    } else if (action === "ADD_LINK" && folderTitle && linkTitle && linkUrl) {
      const folder = currentItems.find((f: any) => f.title.toLowerCase() === folderTitle.trim().toLowerCase());
      if (folder) {
        if (!Array.isArray(folder.links)) folder.links = [];
        folder.links.push({
          id: `link_${Date.now()}`,
          title: linkTitle.trim(),
          url: linkUrl.trim(),
          notes: linkNotes?.trim() || "",
          addedAt: new Date().toISOString(),
        });
      } else {
        // Create folder and add link
        currentItems.push({
          id: `folder_${Date.now()}`,
          title: folderTitle.trim(),
          type: "folder",
          description: "",
          links: [
            {
              id: `link_${Date.now()}`,
              title: linkTitle.trim(),
              url: linkUrl.trim(),
              notes: linkNotes?.trim() || "",
              addedAt: new Date().toISOString(),
            },
          ],
        });
      }
    } else if (action === "UPDATE_ITEMS" && Array.isArray(items)) {
      currentItems = items;
    }

    const updated = await prisma.customDashboardSection.update({
      where: { id: section.id },
      data: {
        itemsJson: JSON.stringify(currentItems),
        ...(body.title && { title: body.title.trim() }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });

    return NextResponse.json({
      section: {
        ...updated,
        items: currentItems,
      },
      message: "Dashboard section updated successfully.",
    });
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
    const sectionId = searchParams.get("sectionId");

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId query param is required" }, { status: 400 });
    }

    await prisma.customDashboardSection.deleteMany({
      where: { id: sectionId, userId },
    });

    return NextResponse.json({ success: true, message: "Section removed from dashboard." });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

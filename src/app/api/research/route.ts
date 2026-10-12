import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projects = await prisma.researchProject.findMany({
      where: { userId },
      include: {
        papers: {
          orderBy: { createdAt: "desc" },
          include: { citations: true },
        },
        experiments: {
          orderBy: { runTimestamp: "desc" },
        },
        datasets: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Save paper to research project
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { researchProjectId, title, authors, year, doi, arxivId, abstract, pdfUrl, source } = body;

    let targetProjectId = researchProjectId;
    if (!targetProjectId) {
      const firstProject = await prisma.researchProject.findFirst({ where: { userId } });
      targetProjectId = firstProject?.id;
    }

    if (!targetProjectId) {
      return NextResponse.json({ error: "No research project found" }, { status: 400 });
    }

    const paper = await prisma.researchPaper.create({
      data: {
        researchProjectId: targetProjectId,
        title,
        authors: Array.isArray(authors) ? authors.join(", ") : authors,
        year: year ? Number(year) : null,
        doi: doi || null,
        arxivId: arxivId || null,
        abstract: abstract || null,
        pdfUrl: pdfUrl || null,
        retrievedSource: source || "External",
      },
    });

    return NextResponse.json({ paper }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

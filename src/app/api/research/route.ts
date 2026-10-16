import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
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

// Save paper to research project OR create a new research project
export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // 1. Create a new Research Project
    if (body.action === "CREATE_PROJECT" || body.projectTitle) {
      const { projectTitle, abstract, hypotheses, targetVenue, description } = body;
      if (!projectTitle?.trim()) {
        return NextResponse.json({ error: "Project title is required" }, { status: 400 });
      }

      const project = await prisma.researchProject.create({
        data: {
          userId,
          title: projectTitle.trim(),
          description: description?.trim() || null,
          abstract: abstract?.trim() || null,
          hypotheses: hypotheses?.trim() || null,
          targetVenue: targetVenue?.trim() || null,
          status: "ACTIVE",
        },
        include: { papers: true, experiments: true, datasets: true },
      });

      return NextResponse.json({ success: true, project }, { status: 201 });
    }

    // Ingest paper into Notes workspace
    if (body.action === "INGEST_NOTE") {
      const { researchProjectId, title, authors, year, doi, arxivId, abstract, pdfUrl } = body;
      if (!title?.trim()) {
        return NextResponse.json({ error: "Title is required for note ingestion" }, { status: 400 });
      }

      const noteTitle = `Literature Review: ${title.trim().slice(0, 80)}`;
      const markdownContent = `# ${title.trim()}

> **Authors**: ${authors || "Unknown"}  
> **Publication Year**: ${year || new Date().getFullYear()}  
> **Source / ID**: ${arxivId ? `arXiv:${arxivId}` : doi ? `DOI:${doi}` : "Scholarly Publication"}  
${pdfUrl ? `> **Open Access PDF**: [View Document](${pdfUrl})` : ""}

---

## 1. Abstract & Executive Summary
${abstract || "No abstract provided in bibliographic index."}

## 2. Core Methodology & Contributions
- **Key Hypothesis**:
- **Experimental Setup / Datasets**:
- **Primary Finding**:

## 3. Critical Analysis & Limitations
- **Underlying Assumptions**:
- **Open Questions**:

## 4. Connection to Student Research
- [ ] Connect findings to active research project or codebase.
`;

      const note = await prisma.note.create({
        data: {
          userId,
          title: noteTitle,
          contentMarkdown: markdownContent,
          tags: "research,paper,literature-review",
          researchProjectId: researchProjectId || null,
        },
      });

      return NextResponse.json({ success: true, note }, { status: 201 });
    }

    // 2. Create a new Experiment
    if (body.action === "CREATE_EXPERIMENT" || body.experimentCode || (body.objective && !body.title)) {
      const {
        researchProjectId,
        experimentCode,
        objective,
        methodDescription,
        configJson,
        metricsJson,
        resultSummary,
        observations,
        limitations,
        isReproducible,
      } = body;

      if (!objective?.trim()) {
        return NextResponse.json({ error: "Experiment objective is required" }, { status: 400 });
      }

      let targetProjectId = researchProjectId;
      if (!targetProjectId) {
        const firstProject = await prisma.researchProject.findFirst({ where: { userId } });
        if (firstProject) {
          targetProjectId = firstProject.id;
        } else {
          const defaultProj = await prisma.researchProject.create({
            data: {
              userId,
              title: "Literature Review & Core Research",
              status: "ACTIVE",
            },
          });
          targetProjectId = defaultProj.id;
        }
      }

      const experiment = await prisma.experiment.create({
        data: {
          researchProjectId: targetProjectId,
          experimentCode: experimentCode?.trim() || `EXP-${Date.now().toString().slice(-4)}`,
          objective: objective.trim(),
          methodDescription: methodDescription?.trim() || "Empirical benchmarking run",
          configJson: typeof configJson === "object" ? JSON.stringify(configJson) : configJson?.trim() || null,
          metricsJson: typeof metricsJson === "object" ? JSON.stringify(metricsJson) : metricsJson?.trim() || null,
          resultSummary: resultSummary?.trim() || null,
          observations: observations?.trim() || null,
          limitations: limitations?.trim() || null,
          isReproducible: isReproducible !== false,
        },
      });

      return NextResponse.json({ success: true, experiment }, { status: 201 });
    }

    // 3. Add paper to a research project
    const { researchProjectId, title, authors, year, doi, arxivId, abstract, pdfUrl, source, readingStatus } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Paper title is required" }, { status: 400 });
    }

    let targetProjectId = researchProjectId;
    if (!targetProjectId) {
      const firstProject = await prisma.researchProject.findFirst({ where: { userId } });
      if (firstProject) {
        targetProjectId = firstProject.id;
      } else {
        const defaultProj = await prisma.researchProject.create({
          data: {
            userId,
            title: "Literature Review & Core Research",
            status: "ACTIVE",
          },
        });
        targetProjectId = defaultProj.id;
      }
    }

    const paper = await prisma.researchPaper.create({
      data: {
        researchProjectId: targetProjectId,
        title: title.trim(),
        authors: Array.isArray(authors) ? authors.join(", ") : authors || null,
        year: year ? Number(year) : null,
        doi: doi || null,
        arxivId: arxivId || null,
        abstract: abstract || null,
        pdfUrl: pdfUrl || null,
        retrievedSource: source || "External",
        readingStatus: readingStatus || "TO_READ",
      },
    });

    return NextResponse.json({ success: true, paper }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Update paper reading status, key takeaways, or project status
export async function PATCH(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { paperId, readingStatus, userKeyTakeaways, projectId, status, abstract, targetVenue } = body;

    // Update paper
    if (paperId) {
      const paper = await prisma.researchPaper.findUnique({
        where: { id: paperId },
        include: { researchProject: true },
      });

      if (!paper || paper.researchProject.userId !== userId) {
        return NextResponse.json({ error: "Paper not found or unauthorized" }, { status: 404 });
      }

      const updated = await prisma.researchPaper.update({
        where: { id: paperId },
        data: {
          ...(readingStatus && { readingStatus }),
          ...(userKeyTakeaways !== undefined && { userKeyTakeaways: userKeyTakeaways?.trim() || null }),
        },
      });

      return NextResponse.json({ success: true, paper: updated });
    }

    // Update project
    if (projectId) {
      const project = await prisma.researchProject.findFirst({
        where: { id: projectId, userId },
      });
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

      const updated = await prisma.researchProject.update({
        where: { id: projectId },
        data: {
          ...(status && { status }),
          ...(abstract !== undefined && { abstract: abstract?.trim() || null }),
          ...(targetVenue !== undefined && { targetVenue: targetVenue?.trim() || null }),
        },
      });

      return NextResponse.json({ success: true, project: updated });
    }

    return NextResponse.json({ error: "Provide paperId or projectId" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const paperId = searchParams.get("paperId");
    const experimentId = searchParams.get("experimentId");
    const projectId = searchParams.get("projectId");

    if (paperId) {
      const paper = await prisma.researchPaper.findUnique({
        where: { id: paperId },
        include: { researchProject: true },
      });
      if (!paper || paper.researchProject.userId !== userId) {
        return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
      }
      await prisma.researchPaper.delete({ where: { id: paperId } });
      return NextResponse.json({ success: true });
    }

    if (experimentId) {
      const exp = await prisma.experiment.findUnique({
        where: { id: experimentId },
        include: { researchProject: true },
      });
      if (!exp || exp.researchProject.userId !== userId) {
        return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
      }
      await prisma.experiment.delete({ where: { id: experimentId } });
      return NextResponse.json({ success: true });
    }

    if (projectId) {
      await prisma.researchProject.deleteMany({
        where: { id: projectId, userId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Provide paperId, experimentId, or projectId" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

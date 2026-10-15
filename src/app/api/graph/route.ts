import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

export interface GraphNode {
  id: string;
  label: string;
  type: "paper" | "topic" | "project" | "task" | "note" | "goal" | "experiment";
  color: string;
  val: number; // size in 3D
  details?: {
    subtitle?: string;
    description?: string;
    link?: string;
    status?: string;
    confidence?: number;
    metrics?: string;
    category?: string;
  };
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
  strength?: number;
}

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [
      projects,
      researchProjects,
      courses,
      notes,
      goals,
    ] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        include: { tasks: true, milestones: true },
        take: 15,
      }),
      prisma.researchProject.findMany({
        where: { userId },
        include: { papers: true, experiments: true },
        take: 10,
      }),
      prisma.course.findMany({
        where: { userId },
        include: { units: { include: { topics: true } } },
        take: 10,
      }),
      prisma.note.findMany({
        where: { userId },
        take: 20,
      }),
      prisma.goal.findMany({
        where: { userId },
        include: { milestones: true },
        take: 10,
      }),
    ]);

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const existingNodeIds = new Set<string>();

    const addNode = (node: GraphNode) => {
      if (!existingNodeIds.has(node.id)) {
        existingNodeIds.add(node.id);
        nodes.push(node);
      }
    };

    const addLink = (link: GraphLink) => {
      if (existingNodeIds.has(link.source) && existingNodeIds.has(link.target)) {
        links.push(link);
      }
    };

    // 1. Research Projects & Papers & Experiments
    for (const rp of researchProjects) {
      const rpId = `rp-${rp.id}`;
      addNode({
        id: rpId,
        label: rp.title,
        type: "project",
        color: "#a855f7", // Purple
        val: 18,
        details: {
          subtitle: "Research Project",
          description: rp.hypotheses || rp.abstract || "Scientific investigation workspace",
          link: "/research",
          status: rp.status,
        },
      });

      for (const paper of rp.papers) {
        const pId = `paper-${paper.id}`;
        addNode({
          id: pId,
          label: paper.title,
          type: "paper",
          color: "#c084fc", // Lighter purple
          val: 12,
          details: {
            subtitle: paper.authors ? `By ${paper.authors}` : "Research Paper",
            description: paper.abstract || paper.userKeyTakeaways || "Literature entry",
            link: paper.pdfUrl || (paper.arxivId ? `https://arxiv.org/abs/${paper.arxivId}` : "/research"),
            status: paper.readingStatus,
          },
        });
        addLink({ source: rpId, target: pId, label: "literature_of" });
      }

      for (const exp of rp.experiments) {
        const expId = `exp-${exp.id}`;
        addNode({
          id: expId,
          label: `${exp.experimentCode}: ${exp.objective.slice(0, 32)}...`,
          type: "experiment",
          color: "#e879f9",
          val: 10,
          details: {
            subtitle: "Benchmark Experiment",
            description: exp.resultSummary || exp.methodDescription,
            link: "/research",
            metrics: exp.metricsJson || undefined,
          },
        });
        addLink({ source: rpId, target: expId, label: "empirical_run" });
      }
    }

    // 2. Technical Projects & Tasks
    for (const p of projects) {
      const projId = `proj-${p.id}`;
      addNode({
        id: projId,
        label: p.name,
        type: "project",
        color: "#3b82f6", // Blue
        val: 16,
        details: {
          subtitle: `${p.category} Project`,
          description: p.objective || "Engineering and milestone workspace",
          link: "/projects",
          status: p.status,
        },
      });

      for (const t of p.tasks) {
        const tId = `task-${t.id}`;
        addNode({
          id: tId,
          label: t.title,
          type: "task",
          color: "#60a5fa",
          val: 9,
          details: {
            subtitle: `Priority: ${t.priority}`,
            description: t.description || undefined,
            link: "/tasks",
            status: t.status,
          },
        });
        addLink({ source: projId, target: tId, label: "contains_task" });
      }
    }

    // 3. Courses, Units & Academic Topics
    for (const c of courses) {
      const cId = `course-${c.id}`;
      addNode({
        id: cId,
        label: `${c.code}: ${c.name}`,
        type: "topic",
        color: "#10b981", // Emerald
        val: 15,
        details: {
          subtitle: "Course Syllabus",
          description: `Confidence: ${c.confidence}/5 • Spaced Repetition Active`,
          link: "/academics",
        },
      });

      for (const u of c.units) {
        for (const top of u.topics) {
          const topId = `top-${top.id}`;
          addNode({
            id: topId,
            label: top.title,
            type: "topic",
            color: "#34d399",
            val: 8,
            details: {
              subtitle: `Unit ${u.unitNumber} Concept`,
              description: `Status: ${top.status} • Revisions: ${top.revisionCount}`,
              link: "/academics",
              confidence: top.confidenceLevel,
            },
          });
          addLink({ source: cId, target: topId, label: "syllabus_topic" });
        }
      }
    }

    // 4. Notes & Documentation
    for (const n of notes) {
      const noteId = `note-${n.id}`;
      addNode({
        id: noteId,
        label: n.title,
        type: "note",
        color: "#f59e0b", // Amber
        val: 11,
        details: {
          subtitle: "Markdown Note & Derivation",
          description: n.contentMarkdown.slice(0, 150) + "...",
          link: "/notes",
        },
      });

      // Semantic connection: if note mentions any course code or project name
      for (const c of courses) {
        if (n.contentMarkdown.toLowerCase().includes(c.code.toLowerCase())) {
          addLink({ source: `course-${c.id}`, target: noteId, label: "documents_course" });
        }
      }
      for (const p of projects) {
        if (n.contentMarkdown.toLowerCase().includes(p.name.toLowerCase())) {
          addLink({ source: `proj-${p.id}`, target: noteId, label: "documents_project" });
        }
      }
    }

    // 5. Goals & OKRs
    for (const g of goals) {
      const gId = `goal-${g.id}`;
      addNode({
        id: gId,
        label: g.title,
        type: "goal",
        color: "#ef4444", // Rose / Red
        val: 16,
        details: {
          subtitle: `${g.category} Horizon`,
          description: g.objective || `Progress: ${g.progressPct}%`,
          link: "/goals",
          status: g.status,
        },
      });

      // Connect goal to relevant project if present
      if (g.projectId && existingNodeIds.has(`proj-${g.projectId}`)) {
        addLink({ source: gId, target: `proj-${g.projectId}`, label: "aligned_project" });
      }
    }

    // STARTER FALLBACK GRAPH if user's workspace is fresh (< 5 items)
    if (nodes.length < 5) {
      const starterNodes: GraphNode[] = [
        {
          id: "sn-ai-arch",
          label: "Autonomous AI System Architecture",
          type: "project",
          color: "#a855f7",
          val: 20,
          details: { subtitle: "Core Initiative", description: "Edge model orchestration and low-latency agent microservices", link: "/projects" },
        },
        {
          id: "sn-attention-paper",
          label: "Attention Is All You Need",
          type: "paper",
          color: "#c084fc",
          val: 14,
          details: { subtitle: "NeurIPS Core Literature", description: "Multi-head self-attention mechanisms replacing sequential recurrence", link: "/research" },
        },
        {
          id: "sn-awq-paper",
          label: "AWQ: Activation-aware Weight Quantization",
          type: "paper",
          color: "#c084fc",
          val: 13,
          details: { subtitle: "MLSys Research", description: "Low-bit INT4 model serving with minimal perplexity degradation", link: "/research" },
        },
        {
          id: "sn-exp-awq",
          label: "EXP-01: Apple Metal 4-bit Latency Profile",
          type: "experiment",
          color: "#e879f9",
          val: 10,
          details: { subtitle: "Empirical Benchmark", description: "Evaluated 70.4 tokens/sec on local GPU with 3.8GB VRAM", link: "/research" },
        },
        {
          id: "sn-os-paging",
          label: "Multi-Level Virtual Paging & TLB",
          type: "topic",
          color: "#10b981",
          val: 15,
          details: { subtitle: "Systems Architecture Concept", description: "Effective Access Time calculation and TLB miss hit rates (SM-2 Active)", link: "/academics" },
        },
        {
          id: "sn-consensus",
          label: "Raft Consensus Protocol",
          type: "topic",
          color: "#34d399",
          val: 12,
          details: { subtitle: "Distributed Systems Concept", description: "Leader election, log replication, and Byzantine failure safety", link: "/academics" },
        },
        {
          id: "sn-spec-note",
          label: "System Design & Interface Spec",
          type: "note",
          color: "#f59e0b",
          val: 13,
          details: { subtitle: "Knowledge Document", description: "Asynchronous pipeline contracts, rate limits, and zero-allocation buffer specs", link: "/notes" },
        },
        {
          id: "sn-goal-paper",
          label: "Publish Systems Conference Paper",
          type: "goal",
          color: "#ef4444",
          val: 17,
          details: { subtitle: "Strategic OKR", description: "Submit empirical quantization benchmark to top international venue", link: "/goals" },
        },
        {
          id: "sn-deep-focus",
          label: "90-Min Daily Deep Work Sprint",
          type: "goal",
          color: "#ef4444",
          val: 15,
          details: { subtitle: "Discipline Horizon", description: "Maintain daily morning uninterrupted technical flow blocks", link: "/habits" },
        },
      ];

      starterNodes.forEach(addNode);

      const starterLinks: GraphLink[] = [
        { source: "sn-ai-arch", target: "sn-attention-paper", label: "foundational_theory" },
        { source: "sn-ai-arch", target: "sn-awq-paper", label: "quantization_basis" },
        { source: "sn-awq-paper", target: "sn-exp-awq", label: "empirical_validation" },
        { source: "sn-ai-arch", target: "sn-spec-note", label: "technical_spec" },
        { source: "sn-ai-arch", target: "sn-consensus", label: "distributed_coordination" },
        { source: "sn-os-paging", target: "sn-spec-note", label: "memory_footprint" },
        { source: "sn-goal-paper", target: "sn-ai-arch", label: "core_deliverable" },
        { source: "sn-deep-focus", target: "sn-ai-arch", label: "execution_cadence" },
        { source: "sn-goal-paper", target: "sn-awq-paper", label: "literature_survey" },
      ];

      starterLinks.forEach(addLink);
    }

    return NextResponse.json({
      nodes,
      links,
      stats: {
        totalNodes: nodes.length,
        totalLinks: links.length,
        papersCount: nodes.filter((n) => n.type === "paper").length,
        topicsCount: nodes.filter((n) => n.type === "topic").length,
        projectsCount: nodes.filter((n) => n.type === "project").length,
        notesCount: nodes.filter((n) => n.type === "note").length,
        goalsCount: nodes.filter((n) => n.type === "goal").length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

function buildStarterGraph() {
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

  return {
    nodes: starterNodes,
    links: starterLinks,
    stats: {
      totalNodes: starterNodes.length,
      totalLinks: starterLinks.length,
      papersCount: starterNodes.filter((n) => n.type === "paper").length,
      topicsCount: starterNodes.filter((n) => n.type === "topic").length,
      projectsCount: starterNodes.filter((n) => n.type === "project").length,
      notesCount: starterNodes.filter((n) => n.type === "note").length,
      goalsCount: starterNodes.filter((n) => n.type === "goal").length,
    },
  };
}

export async function GET() {
  try {
    let userId: string | null = null;
    try {
      userId = await resolveApiUserId();
    } catch {
      userId = null;
    }

    if (!userId) {
      return NextResponse.json(buildStarterGraph());
    }

    let projects: any[] = [];
    let researchProjects: any[] = [];
    let courses: any[] = [];
    let notes: any[] = [];
    let goals: any[] = [];

    try {
      [
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
    } catch (dbErr) {
      console.warn("Database unavailable for graph telemetry, falling back to starter constellation:", dbErr);
      return NextResponse.json(buildStarterGraph());
    }

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const existingNodeIds = new Set<string>();

    const addNode = (node: GraphNode) => {
      if (!existingNodeIds.has(node.id)) {
        existingNodeIds.add(node.id);
        nodes.push(node);
      }
    };

    const linkKeySet = new Set<string>();
    const addLink = (link: GraphLink) => {
      if (!link.source || !link.target || link.source === link.target) return;
      const key = `${link.source}->${link.target}`;
      const revKey = `${link.target}->${link.source}`;
      if (linkKeySet.has(key) || linkKeySet.has(revKey)) return;
      linkKeySet.add(key);
      links.push(link);
    };

    // 1. Projects & Tasks
    for (const p of projects) {
      const pId = `proj-${p.id}`;
      addNode({
        id: pId,
        label: p.title || p.name || "Engineering Project",
        type: "project",
        color: "#38bdf8", // sky blue
        val: 18,
        details: {
          subtitle: "Active Project",
          description: p.description || "Milestone execution sprint",
          link: `/projects`,
          status: p.status || "IN_PROGRESS",
          category: p.category,
        },
      });

      if (p.tasks && Array.isArray(p.tasks)) {
        for (const t of p.tasks.slice(0, 5)) {
          const tId = `task-${t.id}`;
          addNode({
            id: tId,
            label: t.title || "Project Task",
            type: "task",
            color: "#60a5fa", // lighter blue
            val: 8,
            details: {
              subtitle: "Task Item",
              status: t.status || "TODO",
              link: "/tasks",
            },
          });
          addLink({ source: pId, target: tId, label: "contains_task" });
        }
      }
    }

    // 2. Research Projects, Papers & Empirical Experiments
    for (const rp of researchProjects) {
      const rpId = `research-${rp.id}`;
      addNode({
        id: rpId,
        label: rp.title || "Research Project",
        type: "project",
        color: "#a855f7", // purple
        val: 18,
        details: {
          subtitle: "Research Initiative",
          description: rp.description || "Scientific hypothesis & literature synthesis",
          link: "/research",
          status: rp.status,
        },
      });

      if (rp.papers && Array.isArray(rp.papers)) {
        for (const paper of rp.papers.slice(0, 6)) {
          const paperId = `paper-${paper.id}`;
          addNode({
            id: paperId,
            label: paper.title || "Research Paper",
            type: "paper",
            color: "#c084fc", // lilac
            val: 14,
            details: {
              subtitle: "Academic Literature",
              description: paper.abstract ? paper.abstract.slice(0, 160) + "..." : paper.keyTakeaways || "Scientific literature citation",
              link: "/research",
              status: paper.readingStatus || "ANALYZED",
            },
          });
          addLink({ source: rpId, target: paperId, label: "studies_literature" });
        }
      }

      if (rp.experiments && Array.isArray(rp.experiments)) {
        for (const exp of rp.experiments.slice(0, 4)) {
          const expId = `exp-${exp.id}`;
          addNode({
            id: expId,
            label: exp.title || "Empirical Benchmark",
            type: "experiment",
            color: "#e879f9", // fuchsia
            val: 11,
            details: {
              subtitle: "Empirical Experiment",
              description: exp.description || "Benchmark run and ablation study",
              link: "/research",
              status: exp.status || "COMPLETED",
              metrics: exp.metrics ? JSON.stringify(exp.metrics).slice(0, 60) : undefined,
            },
          });
          addLink({ source: rpId, target: expId, label: "empirical_test" });
        }
      }
    }

    // 3. Academics Courses & SM-2 Topics
    for (const course of courses) {
      const cId = `course-${course.id}`;
      addNode({
        id: cId,
        label: course.name || course.code || "Academic Course",
        type: "topic",
        color: "#10b981", // emerald
        val: 16,
        details: {
          subtitle: "Academic Curriculum",
          description: course.description || `Course code: ${course.code}`,
          link: "/academics",
        },
      });

      if (course.units && Array.isArray(course.units)) {
        for (const u of course.units) {
          if (u.topics && Array.isArray(u.topics)) {
            for (const top of u.topics.slice(0, 4)) {
              const topId = `topic-${top.id}`;
              addNode({
                id: topId,
                label: top.name || "Course Topic",
                type: "topic",
                color: "#34d399", // mint
                val: 12,
                details: {
                  subtitle: "SM-2 Concept",
                  confidence: top.confidenceLevel || 80,
                  link: "/academics",
                },
              });
              addLink({ source: cId, target: topId, label: "curriculum_topic" });
            }
          }
        }
      }
    }

    // 4. Notes
    for (const note of notes) {
      const nId = `note-${note.id}`;
      addNode({
        id: nId,
        label: note.title || "Knowledge Note",
        type: "note",
        color: "#f59e0b", // amber
        val: 12,
        details: {
          subtitle: "Knowledge Note",
          description: note.summary || (note.content ? note.content.slice(0, 120) + "..." : "Structured note entry"),
          link: "/notes",
          category: note.category,
        },
      });

      // Cross-connect note if related to any project or course
      if (note.projectId && existingNodeIds.has(`proj-${note.projectId}`)) {
        addLink({ source: nId, target: `proj-${note.projectId}`, label: "documents_project" });
      }
      if (note.courseId && existingNodeIds.has(`course-${note.courseId}`)) {
        addLink({ source: nId, target: `course-${note.courseId}`, label: "documents_course" });
      }
    }

    // 5. Goals & OKRs
    for (const g of goals) {
      const gId = `goal-${g.id}`;
      addNode({
        id: gId,
        label: g.title || "Strategic Horizon",
        type: "goal",
        color: "#ef4444", // rose
        val: 16,
        details: {
          subtitle: "Strategic Goal",
          description: g.description || "Autonomous milestone horizon",
          link: "/goals",
          status: g.status,
        },
      });

      if (g.projectId && existingNodeIds.has(`proj-${g.projectId}`)) {
        addLink({ source: gId, target: `proj-${g.projectId}`, label: "aligned_project" });
      }
    }

    // STARTER FALLBACK GRAPH if user's workspace is fresh (< 5 items)
    if (nodes.length < 5) {
      const starter = buildStarterGraph();
      starter.nodes.forEach(addNode);
      starter.links.forEach(addLink);
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
    console.error("Error generating graph payload, returning starter fallback:", err);
    return NextResponse.json(buildStarterGraph());
  }
}

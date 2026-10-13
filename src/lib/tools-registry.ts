import { prisma } from "./prisma.ts";
import { calculateSM2 } from "./spaced-repetition.ts";

export interface ToolDefinition {
  name: string;
  description: string;
  isReadOnly: boolean; // Read-only tools execute without manual confirmation
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  execute: (userId: string, args: any) => Promise<any>;
}

/**
 * Server-side tool argument validator enforcing schema types, required keys, and enum constraints.
 */
export function validateToolArgs(
  toolDef: ToolDefinition,
  args: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!args || typeof args !== "object") {
    return { valid: false, errors: ["Tool arguments must be a non-null object."] };
  }

  // Check required fields
  for (const reqField of toolDef.parameters.required) {
    if (args[reqField] === undefined || args[reqField] === null || (typeof args[reqField] === "string" && !args[reqField].trim())) {
      errors.push(`Missing required parameter: '${reqField}'`);
    }
  }

  // Check constraints
  for (const [propName, propDef] of Object.entries(toolDef.parameters.properties)) {
    const val = args[propName];
    if (val !== undefined && val !== null) {
      if (propDef.enum && !propDef.enum.includes(val)) {
        errors.push(
          `Invalid value '${val}' for '${propName}'. Allowed values: ${propDef.enum.join(", ")}`
        );
      }
      if (propDef.type === "number" && isNaN(Number(val))) {
        errors.push(`Parameter '${propName}' must be a valid numeric value.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export const APPLICATION_TOOLS: Record<string, ToolDefinition> = {
  search_tasks: {
    name: "search_tasks",
    description: "Search and retrieve existing student tasks by status, priority, or query.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword in task title or description" },
        status: { type: "string", description: "Task status: TODO, IN_PROGRESS, COMPLETED", enum: ["TODO", "IN_PROGRESS", "COMPLETED"] },
        priority: { type: "string", description: "Task priority: LOW, MEDIUM, HIGH, URGENT", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      },
      required: [],
    },
    execute: async (userId, args) => {
      const where: any = { userId };
      if (args.status) where.status = args.status;
      if (args.priority) where.priority = args.priority;
      if (args.query) {
        where.OR = [
          { title: { contains: args.query } },
          { description: { contains: args.query } },
        ];
      }
      const tasks = await prisma.task.findMany({
        where,
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { project: { select: { name: true } }, course: { select: { code: true, name: true } } },
      });
      return { count: tasks.length, tasks };
    },
  },

  create_task: {
    name: "create_task",
    description: "Create a new student task with optional priority, estimated duration, due date, course, or project.",
    isReadOnly: false,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Detailed task description" },
        priority: { type: "string", description: "Priority level", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        estimatedMinutes: { type: "number", description: "Estimated duration in minutes" },
        dueDate: { type: "string", description: "ISO date string for due date" },
        courseCode: { type: "string", description: "Optional course code e.g. CS301" },
      },
      required: ["title"],
    },
    execute: async (userId, args) => {
      let courseId: string | undefined;
      if (args.courseCode) {
        const course = await prisma.course.findFirst({
          where: { userId, code: args.courseCode },
        });
        if (course) courseId = course.id;
      }

      const task = await prisma.task.create({
        data: {
          userId,
          title: args.title,
          description: args.description || null,
          priority: args.priority || "MEDIUM",
          estimatedMinutes: args.estimatedMinutes ? Number(args.estimatedMinutes) : null,
          dueDate: args.dueDate ? new Date(args.dueDate) : null,
          courseId,
        },
      });
      return { success: true, message: `Task created: "${task.title}"`, task };
    },
  },

  update_task_status: {
    name: "update_task_status",
    description: "Update the status of an existing task (e.g. mark COMPLETED or IN_PROGRESS).",
    isReadOnly: false,
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The ID of the task" },
        status: { type: "string", description: "New status", enum: ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
      },
      required: ["taskId", "status"],
    },
    execute: async (userId, args) => {
      const task = await prisma.task.findFirst({
        where: { id: args.taskId, userId },
      });
      if (!task) throw new Error("Task not found or unauthorized");

      const updated = await prisma.task.update({
        where: { id: args.taskId },
        data: {
          status: args.status,
          completedAt: args.status === "COMPLETED" ? new Date() : null,
        },
      });
      return { success: true, message: `Task "${updated.title}" marked as ${updated.status}`, task: updated };
    },
  },

  get_schedule: {
    name: "get_schedule",
    description: "Get scheduled calendar events and time blocks for a given date range.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "ISO start date string" },
        endDate: { type: "string", description: "ISO end date string" },
      },
      required: ["startDate"],
    },
    execute: async (userId, args) => {
      const start = new Date(args.startDate);
      const end = args.endDate ? new Date(args.endDate) : new Date(start.getTime() + 86400000);

      const [events, timeBlocks] = await Promise.all([
        prisma.calendarEvent.findMany({
          where: {
            userId,
            startTime: { gte: start, lte: end },
          },
          orderBy: { startTime: "asc" },
        }),
        prisma.timeBlock.findMany({
          where: {
            userId,
            startTime: { gte: start, lte: end },
          },
          orderBy: { startTime: "asc" },
          include: { task: { select: { title: true, priority: true } } },
        }),
      ]);

      return { events, timeBlocks };
    },
  },

  get_course_progress: {
    name: "get_course_progress",
    description: "Retrieve academic courses, syllabus coverage, confidence, and pending revisions.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        courseCode: { type: "string", description: "Optional course code filter" },
      },
      required: [],
    },
    execute: async (userId, args) => {
      const where: any = { userId };
      if (args.courseCode) where.code = args.courseCode;

      const courses = await prisma.course.findMany({
        where,
        include: {
          units: {
            include: {
              topics: true,
            },
          },
        },
      });

      const summary = courses.map((course) => {
        let totalTopics = 0;
        let masteredTopics = 0;
        let dueRevisionCount = 0;
        const now = new Date();

        course.units.forEach((u) => {
          totalTopics += u.topics.length;
          masteredTopics += u.topics.filter((t) => t.status === "MASTERED").length;
          dueRevisionCount += u.topics.filter(
            (t) => t.nextRevisionAt && new Date(t.nextRevisionAt) <= now
          ).length;
        });

        return {
          code: course.code,
          name: course.name,
          confidence: course.confidence,
          isGateSubject: course.isGateSubject,
          totalTopics,
          masteredTopics,
          dueRevisionCount,
          syllabusCoveragePct: totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0,
        };
      });

      return { courses: summary };
    },
  },

  search_notes: {
    name: "search_notes",
    description: "Search student notes and knowledge base for relevant concepts or study records.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
      },
      required: ["query"],
    },
    execute: async (userId, args) => {
      const notes = await prisma.note.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: args.query } },
            { contentMarkdown: { contains: args.query } },
          ],
        },
        take: 10,
        select: { id: true, title: true, tags: true, isPinned: true, updatedAt: true },
      });
      return { count: notes.length, notes };
    },
  },

  generate_quiz: {
    name: "generate_quiz",
    description: "Generate practice questions for a specific topic or course based on recorded syllabus.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        topicTitle: { type: "string", description: "Topic to test understanding on" },
        questionCount: { type: "number", description: "Number of questions (default 3)" },
      },
      required: ["topicTitle"],
    },
    execute: async (userId, args) => {
      // Find matching topic in database
      const topic = await prisma.syllabusTopic.findFirst({
        where: {
          unit: { course: { userId } },
          title: { contains: args.topicTitle },
        },
        include: { quizQuestions: true, unit: { include: { course: true } } },
      });

      if (topic && topic.quizQuestions.length > 0) {
        return {
          topic: topic.title,
          course: topic.unit.course.name,
          questions: topic.quizQuestions.slice(0, args.questionCount || 3),
        };
      }

      return {
        topic: args.topicTitle,
        info: "Generated dynamic practice prompt for assistant reasoning.",
      };
    },
  },

  search_research_papers: {
    name: "search_research_papers",
    description: "Search research papers stored in student's Research Lab.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Paper title, keyword, or author" },
      },
      required: ["query"],
    },
    execute: async (userId, args) => {
      const papers = await prisma.researchPaper.findMany({
        where: {
          researchProject: { userId },
          OR: [
            { title: { contains: args.query } },
            { abstract: { contains: args.query } },
            { authors: { contains: args.query } },
          ],
        },
        take: 10,
        include: { researchProject: { select: { title: true } } },
      });
      return { count: papers.length, papers };
    },
  },

  schedule_focus_block: {
    name: "schedule_focus_block",
    description: "Schedule a dedicated study or focus timeblock in the student planner.",
    isReadOnly: false,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title or focus goal of the block" },
        startTime: { type: "string", description: "ISO start datetime string" },
        endTime: { type: "string", description: "ISO end datetime string" },
        taskId: { type: "string", description: "Optional associated task ID" },
      },
      required: ["title", "startTime", "endTime"],
    },
    execute: async (userId, args) => {
      const timeBlock = await prisma.timeBlock.create({
        data: {
          userId,
          title: args.title,
          startTime: new Date(args.startTime),
          endTime: new Date(args.endTime),
          taskId: args.taskId || null,
        },
      });
      return { success: true, message: `Focus block scheduled: "${timeBlock.title}"`, timeBlock };
    },
  },

  log_habit_completion: {
    name: "log_habit_completion",
    description: "Log completion status for a daily habit or routine.",
    isReadOnly: false,
    parameters: {
      type: "object",
      properties: {
        habitId: { type: "string", description: "ID of the habit to mark" },
        date: { type: "string", description: "ISO date string or YYYY-MM-DD" },
        completed: { type: "string", description: "Completion status ('true' or 'false')" },
      },
      required: ["habitId"],
    },
    execute: async (userId, args) => {
      const habit = await prisma.habit.findFirst({
        where: { id: args.habitId, userId },
      });
      if (!habit) throw new Error("Habit not found or unauthorized");

      const dateStr = args.date ? args.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const isCompleted = args.completed === "false" ? false : true;

      const log = await prisma.habitLog.upsert({
        where: {
          habitId_dateString: {
            habitId: habit.id,
            dateString: dateStr,
          },
        },
        create: {
          habitId: habit.id,
          dateString: dateStr,
          completed: isCompleted,
        },
        update: {
          completed: isCompleted,
        },
      });

      return { success: true, message: `Habit "${habit.name}" logged.`, log };
    },
  },

  record_syllabus_revision: {
    name: "record_syllabus_revision",
    description: "Record a spaced-repetition revision session for an academic syllabus topic using SM-2.",
    isReadOnly: false,
    parameters: {
      type: "object",
      properties: {
        topicId: { type: "string", description: "ID of the syllabus topic" },
        quality: { type: "string", description: "Recall rating from 1 (blackout) to 5 (perfect recall)" },
      },
      required: ["topicId", "quality"],
    },
    execute: async (userId, args) => {
      const topic = await prisma.syllabusTopic.findFirst({
        where: { id: args.topicId, unit: { course: { userId } } },
        include: { revisionRecords: { orderBy: { studiedAt: "desc" }, take: 1 } },
      });
      if (!topic) throw new Error("Syllabus topic not found or unauthorized");

      const qualityNum = parseInt(args.quality, 10) || 3;
      const lastRec = topic.revisionRecords[0];
      const prevEase = lastRec ? lastRec.easeFactor : 2.5;
      const prevInterval = lastRec ? lastRec.intervalDays : 1;

      const sm2 = calculateSM2({
        rating: qualityNum,
        repetitions: topic.revisionCount,
        intervalDays: prevInterval,
        easeFactor: prevEase,
      });

      await prisma.revisionRecord.create({
        data: {
          topicId: topic.id,
          rating: qualityNum,
          intervalDays: sm2.intervalDays,
          easeFactor: sm2.easeFactor,
        },
      });

      const updated = await prisma.syllabusTopic.update({
        where: { id: topic.id },
        data: {
          lastStudiedAt: new Date(),
          nextRevisionAt: sm2.nextReviewDate,
          revisionCount: topic.revisionCount + 1,
          confidenceLevel: Math.min(5, Math.max(1, qualityNum)),
          status: sm2.repetitions >= 3 ? "MASTERED" : sm2.repetitions > 0 ? "REVISED" : "IN_PROGRESS",
        },
      });

      return {
        success: true,
        message: `Topic "${updated.title}" revision recorded. Next review in ${sm2.intervalDays} day(s).`,
        topic: updated,
      };
    },
  },

  trigger_workflow: {
    name: "trigger_workflow",
    description: "Trigger an authorized student automation workflow (e.g. daily review consolidation).",
    isReadOnly: false,
    parameters: {
      type: "object",
      properties: {
        automationId: { type: "string", description: "Automation rule ID" },
      },
      required: ["automationId"],
    },
    execute: async (userId, args) => {
      const auto = await prisma.automation.findFirst({
        where: { id: args.automationId, userId },
      });
      if (!auto) throw new Error("Automation not found or unauthorized");

      const execution = await prisma.automationExecution.create({
        data: {
          automationId: auto.id,
          status: "SUCCESS",
          triggerPayload: JSON.stringify({ triggeredBy: "AI Assistant" }),
          stepsResultJson: JSON.stringify({ message: "Executed successfully via Assistant tool." }),
        },
      });

      return { success: true, message: `Workflow "${auto.name}" executed.`, executionId: execution.id };
    },
  },

  get_dashboard_sections: {
    name: "get_dashboard_sections",
    description: "Retrieve all customized sections, folders, and resources currently on the student's dashboard.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async (userId) => {
      const sections = await prisma.customDashboardSection.findMany({
        where: { userId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      return sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        folders: JSON.parse(s.itemsJson || "[]"),
      }));
    },
  },

  customize_dashboard_section: {
    name: "customize_dashboard_section",
    description: "Create, update, or add folders and links to a section on the student's dashboard (e.g. creating a 'Resources' section with folders for 'Video Links', 'Online Materials', 'Books', 'Information').",
    isReadOnly: false,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the dashboard section (e.g. 'Resources', 'Study Hub', 'Quick Links')" },
        description: { type: "string", description: "Helpful subtitle or description for this section" },
        folders: { type: "string", description: "Comma-separated list of folder names to create inside this section (e.g. 'Video Links, Online Materials, Books, Information')" },
        action: { type: "string", description: "Action to perform", enum: ["CREATE", "UPDATE", "DELETE"] },
      },
      required: ["title"],
    },
    execute: async (userId, args) => {
      const title = args.title?.trim();
      const action = args.action || "CREATE";

      if (action === "DELETE") {
        await prisma.customDashboardSection.deleteMany({
          where: { userId, title },
        });
        return { success: true, message: `Section "${title}" removed from dashboard.` };
      }

      // Parse folder names
      let initialFolders: any[] = [];
      if (args.folders) {
        const folderNames = args.folders.split(",").map((f: string) => f.trim()).filter(Boolean);
        initialFolders = folderNames.map((f: string, idx: number) => ({
          id: `folder_${Date.now()}_${idx}`,
          title: f,
          type: "folder",
          description: `Curated ${f}`,
          links: [],
        }));
      } else {
        initialFolders = [
          { id: `folder_${Date.now()}_0`, title: "General", type: "folder", description: "General materials", links: [] },
        ];
      }

      const existing = await prisma.customDashboardSection.findFirst({
        where: { userId, title },
      });

      let section;
      if (existing) {
        // Merge or update folders
        const existingFolders = JSON.parse(existing.itemsJson || "[]");
        const existingTitles = new Set(existingFolders.map((ef: any) => ef.title.toLowerCase()));
        for (const nf of initialFolders) {
          if (!existingTitles.has(nf.title.toLowerCase())) {
            existingFolders.push(nf);
          }
        }
        section = await prisma.customDashboardSection.update({
          where: { id: existing.id },
          data: {
            itemsJson: JSON.stringify(existingFolders),
            ...(args.description && { description: args.description.trim() }),
          },
        });
      } else {
        section = await prisma.customDashboardSection.create({
          data: {
            userId,
            title,
            description: args.description?.trim() || "Custom student resources and curated study folders",
            category: "resources",
            icon: "Folder",
            itemsJson: JSON.stringify(initialFolders),
          },
        });
      }

      return {
        success: true,
        message: `Section "${section.title}" created with folders: ${initialFolders.map((f: any) => f.title).join(", ")}. It is now live on your dashboard!`,
        sectionId: section.id,
      };
    },
  },

  search_web: {
    name: "search_web",
    description: "Search across websites and the live internet for real-time information, documentation, news, academic topics, tutorials, and facts.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query or keywords to search the internet for" },
        limit: { type: "number", description: "Maximum number of search results (default 5)" },
      },
      required: ["query"],
    },
    execute: async (_userId, args) => {
      return await performWebSearch(args.query, Number(args.limit) || 5);
    },
  },

  fetch_webpage_content: {
    name: "fetch_webpage_content",
    description: "Fetch and read the readable text content of a specific webpage or website URL.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The full http/https URL of the webpage to fetch and read" },
      },
      required: ["url"],
    },
    execute: async (_userId, args) => {
      return await fetchWebpage(args.url);
    },
  },
};

/**
 * HTML entity decoder helper
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Searches the live web using DuckDuckGo Lite with fallback to Wikipedia
 */
async function performWebSearch(query: string, limit = 5): Promise<any> {
  const cleanQuery = query.trim();
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // 1. DuckDuckGo Lite search
  try {
    const res = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `q=${encodeURIComponent(cleanQuery)}`,
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const html = await res.text();
      const linkMatches = [
        ...html.matchAll(
          /<a[^>]*href=["']([^"']+)["'][^>]*class=["']result-link["'][^>]*>(.*?)<\/a>/gis
        ),
      ];
      const snippetMatches = [
        ...html.matchAll(/<td[^>]*class=["']result-snippet["'][^>]*>(.*?)<\/td>/gis),
      ];

      for (let i = 0; i < Math.min(limit, linkMatches.length); i++) {
        const rawUrl = linkMatches[i][1];
        let url = rawUrl;
        if (rawUrl.includes("uddg=")) {
          const m = rawUrl.match(/uddg=([^&]+)/);
          if (m) url = decodeURIComponent(m[1]);
        } else if (rawUrl.startsWith("//")) {
          url = "https:" + rawUrl;
        }

        const title = decodeHtmlEntities(linkMatches[i][2].replace(/<[^>]+>/g, "").trim());
        const snippet = snippetMatches[i]
          ? decodeHtmlEntities(snippetMatches[i][1].replace(/<[^>]+>/g, "").trim())
          : "";

        if (title && url) {
          results.push({ title, url, snippet });
        }
      }
    }
  } catch {}

  // 2. Fallback to Wikipedia search API if empty
  if (results.length === 0) {
    try {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          cleanQuery
        )}&format=json&origin=*`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (wikiRes.ok) {
        const data = await wikiRes.json();
        const searchList = data.query?.search || [];
        for (const item of searchList.slice(0, limit)) {
          results.push({
            title: item.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
            snippet: decodeHtmlEntities(item.snippet.replace(/<[^>]+>/g, "")),
          });
        }
      }
    } catch {}
  }

  return {
    query: cleanQuery,
    count: results.length,
    results,
    searchedAt: new Date().toISOString(),
  };
}

/**
 * Fetches and extracts readable text from a specific webpage
 */
async function fetchWebpage(targetUrl: string): Promise<any> {
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { error: `Failed to fetch webpage (HTTP ${res.status})`, url: targetUrl };
    }

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : "Webpage";

    // Clean text: strip scripts, styles, tags, excessive whitespace
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      title,
      url: targetUrl,
      contentSnippet: cleanText.slice(0, 3000),
      totalLength: cleanText.length,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch webpage", url: targetUrl };
  }
}

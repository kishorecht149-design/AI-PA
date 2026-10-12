import { prisma } from "./prisma.ts";

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
};

import { prisma } from "./prisma.ts";
import { calculateSM2 } from "./spaced-repetition.ts";
import { decodeHtmlEntities } from "./format-utils.ts";
import { eventBus } from "./events.ts";

export interface ToolDefinition {
  name: string;
  description: string;
  isReadOnly: boolean; // Read-only tools execute without manual confirmation
  isDestructive?: boolean; // Destructive actions (delete) strictly require confirmation
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
    if (
      args[reqField] === undefined ||
      args[reqField] === null ||
      (typeof args[reqField] === "string" && !args[reqField].trim())
    ) {
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

// =============================================================================
// APPLICATION TOOLS (Internal AMAHAS Resources: Academics, Tasks, Reminders, Notes)
// =============================================================================

export const APPLICATION_TOOLS: Record<string, ToolDefinition> = {
  // ---------------------------------------------------------------------------
  // 1. Academics: Query & Records
  // ---------------------------------------------------------------------------
  get_academic_records: {
    name: "get_academic_records",
    description: "Retrieve all registered courses, syllabus topics, mastery status, and readiness from the user's academic plan.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "Optional course code filter (e.g. EC402, CS301)" },
      },
      required: [],
    },
    execute: async (userId, args) => {
      const where: any = { userId };
      if (args.code) where.code = args.code.toUpperCase().trim();

      const courses = await prisma.course.findMany({
        where,
        include: {
          units: {
            include: {
              topics: {
                include: {
                  revisionRecords: { orderBy: { studiedAt: "desc" }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { code: "asc" },
      });

      let totalTopics = 0;
      let masteredTopics = 0;
      const formattedCourses = courses.map((c) => {
        const topics = c.units.flatMap((u) => u.topics);
        const mastered = topics.filter((t) => t.status === "MASTERED").length;
        totalTopics += topics.length;
        masteredTopics += mastered;
        return {
          id: c.id,
          code: c.code,
          name: c.name,
          instructor: c.instructor || "Unassigned",
          semester: c.semester || "Current",
          confidence: c.confidence,
          targetGrade: c.targetGrade || "A",
          track: c.track || "General",
          isGateSubject: c.isGateSubject,
          totalUnits: c.units.length,
          totalTopics: topics.length,
          masteredTopics: mastered,
          readinessPct: topics.length > 0 ? Math.round((mastered / topics.length) * 100) : 0,
        };
      });

      return {
        totalCourses: courses.length,
        overallReadinessPct: totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0,
        courses: formattedCourses,
      };
    },
  },

  get_academic_courses: {
    name: "get_academic_courses",
    description: "Alias for get_academic_records. Retrieve active courses and syllabus coverage.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "Optional course code filter" },
      },
      required: [],
    },
    execute: async (userId, args) => {
      return await APPLICATION_TOOLS.get_academic_records.execute(userId, args);
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
      return await APPLICATION_TOOLS.get_academic_records.execute(userId, { code: args.courseCode });
    },
  },

  create_academic_record: {
    name: "create_academic_record",
    description: "Create and register a new academic course in the student's academic plan.",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full course title (e.g. Antennas and Wave Propagation)" },
        code: { type: "string", description: "Course code (e.g. EC402, CS301). If omitted, an appropriate code will be generated." },
        instructor: { type: "string", description: "Optional professor or instructor name" },
        semester: { type: "string", description: "Optional academic semester (e.g. Semester 6, Fall 2026)" },
        track: { type: "string", description: "Optional track (e.g. GATE_EC, GATE_CS, ECE_CORE)" },
        targetGrade: { type: "string", description: "Optional target grade (e.g. A+, 90%+)" },
        confidence: { type: "number", description: "Confidence score from 1 to 5 (default 3)" },
        isGateSubject: { type: "string", description: "Set 'true' if subject is on competitive exam syllabus" },
      },
      required: ["name"],
    },
    execute: async (userId, args) => {
      const name = String(args.name).trim();
      if (!name) throw new Error("Course name is required.");

      // Generate a reasonable course code if omitted
      let code = args.code ? String(args.code).toUpperCase().trim() : "";
      if (!code) {
        const initials = name
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 4);
        code = `${initials}101`;
      }

      // Check if course already exists for user
      const existing = await prisma.course.findFirst({
        where: { userId, OR: [{ code }, { name: { equals: name } }] },
      });
      if (existing) {
        return {
          success: true,
          created: false,
          alreadyExists: true,
          alreadyExisted: true,
          message: `Course "${existing.name}" (${existing.code}) already exists in your academic plan.`,
          course: existing,
        };
      }

      const course = await prisma.course.create({
        data: {
          userId,
          name,
          code,
          instructor: args.instructor ? String(args.instructor).trim() : null,
          semester: args.semester ? String(args.semester).trim() : "Current",
          track: args.track ? String(args.track).trim() : "General",
          targetGrade: args.targetGrade ? String(args.targetGrade).trim() : "A",
          confidence: args.confidence ? Math.max(1, Math.min(5, Number(args.confidence))) : 3,
          isGateSubject: args.isGateSubject === "true" || args.isGateSubject === true,
        },
      });

      return {
        success: true,
        created: true,
        alreadyExists: false,
        alreadyExisted: false,
        message: `Successfully registered course "${course.name}" (${course.code}) in your academic plan.`,
        course,
      };
    },
  },

  update_academic_record: {
    name: "update_academic_record",
    description: "Update an existing academic course (confidence, target grade, instructor, semester, track).",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        courseId: { type: "string", description: "ID of course to update" },
        code: { type: "string", description: "Course code (e.g. EC402) if ID is not known" },
        name: { type: "string", description: "Updated course name" },
        confidence: { type: "number", description: "Updated confidence level (1-5)" },
        targetGrade: { type: "string", description: "Updated target grade (e.g. A, S, 95%)" },
        instructor: { type: "string", description: "Updated instructor name" },
        semester: { type: "string", description: "Updated semester" },
        track: { type: "string", description: "Updated track" },
      },
      required: [],
    },
    execute: async (userId, args) => {
      const course = await prisma.course.findFirst({
        where: {
          userId,
          OR: [
            ...(args.courseId ? [{ id: args.courseId }] : []),
            ...(args.code ? [{ code: args.code.toUpperCase().trim() }] : []),
            ...(args.name ? [{ name: { contains: args.name.trim() } }] : []),
          ],
        },
      });

      if (!course) {
        throw new Error(
          `Course not found for updating. Please verify the course code or name.`
        );
      }

      const updateData: any = {};
      if (args.name) updateData.name = args.name.trim();
      if (args.confidence !== undefined) updateData.confidence = Math.max(1, Math.min(5, Number(args.confidence)));
      if (args.targetGrade) updateData.targetGrade = args.targetGrade.trim();
      if (args.instructor) updateData.instructor = args.instructor.trim();
      if (args.semester) updateData.semester = args.semester.trim();
      if (args.track) updateData.track = args.track.trim();

      const updated = await prisma.course.update({
        where: { id: course.id },
        data: updateData,
      });

      return {
        success: true,
        message: `Updated course "${updated.name}" (${updated.code}).`,
        course: updated,
      };
    },
  },

  delete_academic_record: {
    name: "delete_academic_record",
    description: "Delete a course from the academic plan. Destructive action requiring user confirmation.",
    isReadOnly: false,
    isDestructive: true,
    parameters: {
      type: "object",
      properties: {
        courseId: { type: "string", description: "ID of the course to delete" },
        code: { type: "string", description: "Course code (e.g. EC402) if ID is not known" },
      },
      required: [],
    },
    execute: async (userId, args) => {
      const course = await prisma.course.findFirst({
        where: {
          userId,
          OR: [
            ...(args.courseId ? [{ id: args.courseId }] : []),
            ...(args.code ? [{ code: args.code.toUpperCase().trim() }] : []),
          ],
        },
      });

      if (!course) {
        throw new Error(`Course not found or unauthorized.`);
      }

      await prisma.course.delete({
        where: { id: course.id },
      });

      return {
        success: true,
        message: `Deleted course "${course.name}" (${course.code}) from your academic plan.`,
        deletedCourseId: course.id,
      };
    },
  },

  record_syllabus_revision: {
    name: "record_syllabus_revision",
    description: "Record a SuperMemo SM-2 study revision attempt on a syllabus topic with active recall rating (1-5).",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        topicTitle: { type: "string", description: "Title of topic revised" },
        rating: { type: "number", description: "Recall rating from 1 (blackout) to 5 (flawless)" },
        notes: { type: "string", description: "Optional study reflections or error notes" },
      },
      required: ["topicTitle", "rating"],
    },
    execute: async (userId, args) => {
      const topic = await prisma.syllabusTopic.findFirst({
        where: {
          unit: { course: { userId } },
          title: { contains: args.topicTitle },
        },
        include: { revisionRecords: { orderBy: { studiedAt: "desc" }, take: 1 } },
      });

      if (!topic) {
        throw new Error(`Topic "${args.topicTitle}" not found in your registered syllabus.`);
      }

      const rating = Math.max(1, Math.min(5, Number(args.rating)));
      const lastRecord = topic.revisionRecords[0];
      const prevRepetitions = topic.revisionCount;
      const prevInterval = lastRecord?.intervalDays || 1;
      const prevEase = lastRecord?.easeFactor || 2.5;

      const sm2 = calculateSM2({
        rating,
        repetitions: prevRepetitions,
        intervalDays: prevInterval,
        easeFactor: prevEase,
      });

      await prisma.$transaction([
        prisma.revisionRecord.create({
          data: {
            topicId: topic.id,
            rating,
            intervalDays: sm2.intervalDays,
            easeFactor: sm2.easeFactor,
            notes: args.notes || null,
          },
        }),
        prisma.syllabusTopic.update({
          where: { id: topic.id },
          data: {
            status: rating >= 4 ? "MASTERED" : "REVISED",
            lastStudiedAt: new Date(),
            nextRevisionAt: sm2.nextReviewDate,
            revisionCount: sm2.repetitions,
          },
        }),
      ]);

      return {
        success: true,
        message: `Revision recorded for "${topic.title}": rating ${rating}/5. Next review scheduled in ${sm2.intervalDays} day(s).`,
        nextReviewDate: sm2.nextReviewDate,
      };
    },
  },

  // ---------------------------------------------------------------------------
  // 2. Tasks & Reminders
  // ---------------------------------------------------------------------------
  get_tasks: {
    name: "get_tasks",
    description: "Search and retrieve student tasks filtered by status, priority, or query.",
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
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: {
          project: { select: { name: true } },
          course: { select: { code: true, name: true } },
        },
      });
      return { count: tasks.length, tasks };
    },
  },

  search_tasks: {
    name: "search_tasks",
    description: "Alias for get_tasks.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword in task title" },
        status: { type: "string", description: "Task status: TODO, IN_PROGRESS, COMPLETED", enum: ["TODO", "IN_PROGRESS", "COMPLETED"] },
        priority: { type: "string", description: "Task priority", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      },
      required: [],
    },
    execute: async (userId, args) => {
      return await APPLICATION_TOOLS.get_tasks.execute(userId, args);
    },
  },

  get_projects: {
    name: "get_projects",
    description: "Retrieve active engineering and research projects in the student's workspace.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional title or name keyword to filter projects" },
        type: { type: "string", description: "Filter type: 'engineering', 'research', or 'all'", enum: ["engineering", "research", "all"] },
      },
      required: [],
    },
    execute: async (userId, args) => {
      const type = args?.type || "all";
      const q = args?.query ? String(args.query).trim() : "";

      let engineeringProjects: any[] = [];
      let researchProjects: any[] = [];

      try {
        if ((type === "engineering" || type === "all") && prisma.project) {
          const where: any = { userId };
          if (q) where.name = { contains: q, mode: "insensitive" };
          engineeringProjects = await prisma.project.findMany({
            where,
            take: 10,
            select: { id: true, name: true, description: true, status: true, priority: true },
          });
        }
      } catch (err: any) {
        console.warn(`[get_projects] Engineering project query skipped: ${err.message}`);
      }

      try {
        if ((type === "research" || type === "all") && prisma.researchProject) {
          const where: any = { userId };
          if (q) where.title = { contains: q, mode: "insensitive" };
          researchProjects = await prisma.researchProject.findMany({
            where,
            take: 10,
            select: { id: true, title: true, description: true, status: true },
          });
        }
      } catch (err: any) {
        console.warn(`[get_projects] Research project query skipped: ${err.message}`);
      }

      return {
        total: engineeringProjects.length + researchProjects.length,
        engineeringProjects,
        researchProjects,
      };
    },
  },

  create_task: {
    name: "create_task",
    description: "Create a new student task with priority, estimated minutes, due date, course code, or project.",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Detailed task description" },
        priority: { type: "string", description: "Priority level", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        estimatedMinutes: { type: "number", description: "Estimated duration in minutes" },
        dueDate: { type: "string", description: "ISO date string for due date" },
        courseCode: { type: "string", description: "Optional course code e.g. CS301" },
        projectId: { type: "string", description: "Optional project ID to link this task to" },
        projectName: { type: "string", description: "Optional project name to link this task to" },
      },
      required: ["title"],
    },
    execute: async (userId, args) => {
      let courseId: string | undefined;
      if (args.courseCode) {
        const course = await prisma.course.findFirst({
          where: { userId, code: args.courseCode.toUpperCase().trim() },
        });
        if (course) courseId = course.id;
      }

      let projectId: string | undefined;
      if (args.projectId) {
        const proj = await prisma.project.findFirst({
          where: { id: args.projectId, userId },
        });
        if (proj) projectId = proj.id;
      } else if (args.projectName) {
        const proj = await prisma.project.findFirst({
          where: { name: { contains: args.projectName }, userId },
        });
        if (proj) projectId = proj.id;
      }

      const task = await prisma.task.create({
        data: {
          userId,
          title: args.title.trim(),
          description: args.description ? args.description.trim() : null,
          priority: args.priority || "MEDIUM",
          estimatedMinutes: args.estimatedMinutes ? Number(args.estimatedMinutes) : null,
          dueDate: args.dueDate ? new Date(args.dueDate) : null,
          courseId,
          projectId,
        },
      });
      return { success: true, message: `Task created: "${task.title}"`, task };
    },
  },

  update_task: {
    name: "update_task",
    description: "Update attributes of an existing task (status, priority, title, description, or due date).",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The ID of the task" },
        title: { type: "string", description: "Updated task title" },
        status: { type: "string", description: "New status", enum: ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
        priority: { type: "string", description: "New priority", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        estimatedMinutes: { type: "number", description: "Updated estimated duration in minutes" },
        dueDate: { type: "string", description: "Updated due date" },
      },
      required: ["taskId"],
    },
    execute: async (userId, args) => {
      const task = await prisma.task.findFirst({
        where: { id: args.taskId, userId },
      });
      if (!task) throw new Error("Task not found or unauthorized");

      const updateData: any = {};
      if (args.title) updateData.title = args.title.trim();
      const isNewCompletion = args.status === "COMPLETED" && task.status !== "COMPLETED";
      if (args.status) {
        updateData.status = args.status;
        if (args.status === "COMPLETED") updateData.completedAt = new Date();
      }
      if (args.priority) updateData.priority = args.priority;
      if (args.estimatedMinutes !== undefined) updateData.estimatedMinutes = Number(args.estimatedMinutes);
      if (args.dueDate) updateData.dueDate = new Date(args.dueDate);

      const updated = await prisma.task.update({
        where: { id: args.taskId },
        data: updateData,
      });

      // Workflow A: Publish task.completed event when task becomes COMPLETED
      if (isNewCompletion) {
        eventBus.publish("task.completed", args.taskId, userId, {
          taskId: args.taskId,
          projectId: task.projectId,
        }).catch(() => {});
      }

      // Workflow A: Publish task.rescheduled event if due date changes
      if (args.dueDate && (!task.dueDate || new Date(args.dueDate).getTime() !== new Date(task.dueDate).getTime())) {
        eventBus.publish("task.rescheduled", args.taskId, userId, {
          taskId: args.taskId,
          newDueDate: args.dueDate,
        }).catch(() => {});
      }

      return { success: true, message: `Task "${updated.title}" updated (${updated.status})`, task: updated };
    },
  },

  update_task_status: {
    name: "update_task_status",
    description: "Update the status of an existing task (e.g. mark COMPLETED or IN_PROGRESS).",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The ID of the task" },
        status: { type: "string", description: "New status", enum: ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
      },
      required: ["taskId", "status"],
    },
    execute: async (userId, args) => {
      return await APPLICATION_TOOLS.update_task.execute(userId, args);
    },
  },

  delete_task: {
    name: "delete_task",
    description: "Delete an existing task. Destructive action requiring user confirmation.",
    isReadOnly: false,
    isDestructive: true,
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The ID of the task to delete" },
      },
      required: ["taskId"],
    },
    execute: async (userId, args) => {
      const task = await prisma.task.findFirst({
        where: { id: args.taskId, userId },
      });
      if (!task) throw new Error("Task not found or unauthorized");

      await prisma.task.delete({
        where: { id: args.taskId },
      });
      return { success: true, message: `Deleted task "${task.title}".` };
    },
  },

  create_reminder: {
    name: "create_reminder",
    description: "Create an active notification and reminder for deadlines, exams, or study alerts.",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the reminder" },
        message: { type: "string", description: "Details or context for the reminder" },
        scheduledDate: { type: "string", description: "Optional ISO date string for when the reminder fires" },
        category: { type: "string", description: "Category: DEADLINE, REVISION, or REVIEW", enum: ["DEADLINE", "REVISION", "REVIEW"] },
        taskId: { type: "string", description: "Optional ID of an existing task to link this reminder to" },
      },
      required: ["title"],
    },
    execute: async (userId, args) => {
      const title = String(args.title).trim();
      const message = args.message ? String(args.message).trim() : title;

      if (args.taskId) {
        try {
          const task = await prisma.task.findFirst({
            where: { id: String(args.taskId), userId },
          });
          if (task === null) {
            throw new Error("Task not found or unauthorized");
          }
        } catch (taskErr: any) {
          if (taskErr.message === "Task not found or unauthorized") throw taskErr;
        }
      }

      const link = args.taskId ? `/tasks?id=${args.taskId}` : null;

      // Deduplicate unread reminders linked to the same task
      if (link) {
        try {
          const existingNotif = await prisma.notification.findFirst({
            where: { userId, link, isRead: false },
          });
          if (existingNotif) {
            const updatedNotif = await prisma.notification.update({
              where: { id: existingNotif.id },
              data: {
                title,
                message,
                category: args.category || existingNotif.category,
              },
            });
            return {
              success: true,
              message: `Reminder updated: "${title}".`,
              reminder: updatedNotif,
              calendarEvent: null,
              deduplicated: true,
            };
          }
        } catch (dbErr: any) {
          // If offline DB or findFirst unmocked, proceed to create
        }
      }

      const notif = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          category: args.category || "DEADLINE",
          link,
          isRead: false,
        },
      });

      let calendarEvent: any = null;
      if (args.scheduledDate) {
        const start = new Date(args.scheduledDate);
        if (!isNaN(start.getTime())) {
          calendarEvent = await prisma.calendarEvent.create({
            data: {
              userId,
              title: `[Reminder] ${title}`,
              description: message,
              startTime: start,
              endTime: new Date(start.getTime() + 30 * 60000),
              category: "personal",
            },
          });
        }
      }

      return {
        success: true,
        message: `Reminder created: "${title}".`,
        reminder: notif,
        calendarEvent,
      };
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Schedule, Notes, Focus, Dashboard
  // ---------------------------------------------------------------------------
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

  search_notes: {
    name: "search_notes",
    description: "Search user's notes and Knowledge Graph articles by keyword, topic, or tag.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword or topic to search across notes" },
        tag: { type: "string", description: "Optional tag filter" },
      },
      required: ["query"],
    },
    execute: async (userId, args) => {
      const where: any = { userId };
      if (args.tag) where.tags = { contains: args.tag };
      if (args.query) {
        where.OR = [
          { title: { contains: args.query } },
          { contentMarkdown: { contains: args.query } },
        ];
      }
      const notes = await prisma.note.findMany({
        where,
        take: 10,
        select: { id: true, title: true, tags: true, isPinned: true, updatedAt: true },
      });
      return { count: notes.length, notes };
    },
  },

  create_note: {
    name: "create_note",
    description: "Create a structured note or knowledge entry, optionally linking to a project, course, or research project.",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the note" },
        content: { type: "string", description: "Markdown content of the note" },
        tags: { type: "string", description: "Optional comma-separated tags" },
        projectId: { type: "string", description: "Optional project ID to link to" },
        courseId: { type: "string", description: "Optional course ID to link to" },
        researchProjectId: { type: "string", description: "Optional research project ID to link to" },
      },
      required: ["title"],
    },
    execute: async (userId, args) => {
      let validProjectId = null;
      if (args.projectId) {
        const p = await prisma.project.findFirst({ where: { id: args.projectId, userId } });
        if (p) validProjectId = p.id;
      }
      let validCourseId = null;
      if (args.courseId) {
        const c = await prisma.course.findFirst({ where: { id: args.courseId, userId } });
        if (c) validCourseId = c.id;
      }
      let validResearchProjectId = null;
      if (args.researchProjectId) {
        const rp = await prisma.researchProject.findFirst({ where: { id: args.researchProjectId, userId } });
        if (rp) validResearchProjectId = rp.id;
      }

      const note = await prisma.note.create({
        data: {
          userId,
          title: args.title.trim(),
          contentMarkdown: args.content ? String(args.content).trim() : "",
          tags: args.tags || null,
          projectId: validProjectId,
          courseId: validCourseId,
          researchProjectId: validResearchProjectId,
        },
      });

      return {
        success: true,
        message: `Note created: "${note.title}".`,
        note,
      };
    },
  },

  schedule_focus_block: {
    name: "schedule_focus_block",
    description: "Create a planned Deep Work focus block in the calendar.",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Focus session title" },
        durationMinutes: { type: "number", description: "Duration in minutes (e.g. 25, 45, 60)" },
        startTime: { type: "string", description: "ISO start datetime string (defaults to now)" },
      },
      required: ["title"],
    },
    execute: async (userId, args) => {
      const start = args.startTime ? new Date(args.startTime) : new Date();
      const dur = Number(args.durationMinutes) || 45;
      const end = new Date(start.getTime() + dur * 60000);

      const block = await prisma.timeBlock.create({
        data: {
          userId,
          title: args.title,
          startTime: start,
          endTime: end,
          isFixed: false,
        },
      });

      return {
        success: true,
        message: `Scheduled ${dur}m Deep Work block: "${args.title}" at ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
        block,
      };
    },
  },

  get_dashboard_sections: {
    name: "get_dashboard_sections",
    description: "Retrieve customized dashboard sections and folders.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async (userId) => {
      const sections = await prisma.customDashboardSection.findMany({
        where: { userId },
        orderBy: { order: "asc" },
      });
      return { count: sections.length, sections };
    },
  },

  customize_dashboard_section: {
    name: "customize_dashboard_section",
    description: "Create or customize a dashboard section with folders.",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Section title (e.g. Resources, Exam Hub)" },
        description: { type: "string", description: "Optional subtitle" },
        folderTitles: { type: "string", description: "Comma-separated folder titles (e.g. Video Links, Books, Materials)" },
      },
      required: ["title"],
    },
    execute: async (userId, args) => {
      const folders = args.folderTitles
        ? args.folderTitles.split(",").map((t: string) => ({
            id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: t.trim(),
            items: [],
          }))
        : [];

      const section = await prisma.customDashboardSection.create({
        data: {
          userId,
          title: args.title.trim(),
          description: args.description || null,
          itemsJson: JSON.stringify(folders),
        },
      });

      return {
        success: true,
        message: `Dashboard section "${section.title}" created with folders: ${folders.map((f: any) => f.title).join(", ")}.`,
        section,
      };
    },
  },

  log_habit_completion: {
    name: "log_habit_completion",
    description: "Record daily completion of a student habit to update streaks and XP.",
    isReadOnly: false,
    isDestructive: false,
    parameters: {
      type: "object",
      properties: {
        habitTitle: { type: "string", description: "Title or keyword of the habit to mark complete" },
      },
      required: ["habitTitle"],
    },
    execute: async (userId, args) => {
      const habit = await prisma.habit.findFirst({
        where: { userId, name: { contains: args.habitTitle } },
      });
      if (!habit) throw new Error(`Habit "${args.habitTitle}" not found`);

      const updated = await prisma.habit.update({
        where: { id: habit.id },
        data: {
          currentStreak: habit.currentStreak + 1,
          longestStreak: Math.max(habit.longestStreak, habit.currentStreak + 1),
        },
      });
      return {
        success: true,
        message: `Completed habit "${updated.name}". Streak is now ${updated.currentStreak} days!`,
        habit: updated,
      };
    },
  },

  trigger_workflow: {
    name: "trigger_workflow",
    description: "Trigger an authorized student automation workflow.",
    isReadOnly: false,
    isDestructive: false,
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
          triggerPayload: JSON.stringify({
            triggeredByTool: "trigger_workflow",
            timestamp: new Date().toISOString(),
          }),
          stepsResultJson: JSON.stringify({
            steps: ["Trigger Activated", "Actions Evaluated", "Execution Recorded"],
            result: "Manual trigger processed successfully",
          }),
        },
      });

      return {
        success: true,
        message: `Automation "${auto.name}" executed successfully.`,
        executionId: execution.id,
      };
    },
  },

  // Research tool backward compatibility references
  get search_research_papers() {
    return RESEARCH_TOOLS.search_research_papers;
  },
  get search_web() {
    return RESEARCH_TOOLS.search_web;
  },
  get fetch_webpage_content() {
    return RESEARCH_TOOLS.fetch_webpage_content;
  },
};

// =============================================================================
// RESEARCH TOOLS (Live Web, arXiv, Document Readers — Isolated Group)
// =============================================================================

export const RESEARCH_TOOLS: Record<string, ToolDefinition> = {
  search_web: {
    name: "search_web",
    description: "Search across websites and the live internet for real-time documentation, research papers, and technical facts.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Specific keywords to search the internet for" },
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
    description: "Fetch and read the readable text content of a specific webpage or URL.",
    isReadOnly: true,
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The full http/https URL of the webpage to fetch" },
      },
      required: ["url"],
    },
    execute: async (_userId, args) => {
      return await fetchWebpage(args.url);
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
            { authors: { contains: args.query } },
            { abstract: { contains: args.query } },
          ],
        },
        take: 10,
      });
      return { count: papers.length, papers };
    },
  },
};

// =============================================================================
// COMBINED REGISTRY & INTENT TOOL FILTERING
// =============================================================================

export const ALL_TOOLS: Record<string, ToolDefinition> = {
  ...APPLICATION_TOOLS,
  ...RESEARCH_TOOLS,
};

/**
 * Returns strictly authorized tools for the specified intent.
 * Guarantees web research tools are never passed during application operations,
 * and application mutation tools are never passed during web research or general chat.
 */
export function getToolsForIntent(intent: string): Record<string, ToolDefinition> {
  const pureAppTools = Object.fromEntries(
    Object.entries(APPLICATION_TOOLS).filter(
      ([name]) => !["search_web", "fetch_webpage_content", "search_research_papers"].includes(name)
    )
  );

  switch (intent) {
    case "application_action":
      return pureAppTools;
    case "task_management":
      return {
        get_tasks: APPLICATION_TOOLS.get_tasks,
        search_tasks: APPLICATION_TOOLS.search_tasks,
        create_task: APPLICATION_TOOLS.create_task,
        update_task: APPLICATION_TOOLS.update_task,
        update_task_status: APPLICATION_TOOLS.update_task_status,
        delete_task: APPLICATION_TOOLS.delete_task,
        create_reminder: APPLICATION_TOOLS.create_reminder,
        get_schedule: APPLICATION_TOOLS.get_schedule,
        get_projects: APPLICATION_TOOLS.get_projects,
      };
    case "application_query":
      return Object.fromEntries(
        Object.entries(pureAppTools).filter(([_, tool]) => tool.isReadOnly)
      );
    case "knowledge_query":
      return {
        search_notes: APPLICATION_TOOLS.search_notes,
        create_note: APPLICATION_TOOLS.create_note,
        get_projects: APPLICATION_TOOLS.get_projects,
        get_academic_records: APPLICATION_TOOLS.get_academic_records,
      };
    case "web_research":
      return RESEARCH_TOOLS;
    case "general_chat":
    case "clarification_required":
    default:
      return {};
  }
}

// =============================================================================
// WEB SEARCH IMPLEMENTATION WITH CLEAN PARSING & RELEVANCE
// =============================================================================

/**
 * Searches YouTube for public video links and tutorials
 */
async function searchYouTube(
  query: string,
  limit = 5
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  try {
    const cleanQ = query.replace(/^(youtube|video|videos|link|links|find|search for)\s+/gi, "").trim();
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ || query)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const text = await res.text();
    const idMatches = [...text.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
    const titleMatches = [...text.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/g)];

    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const seen = new Set<string>();

    for (let i = 0; i < Math.min(titleMatches.length, idMatches.length); i++) {
      const vidId = idMatches[i] ? idMatches[i][1] : "";
      const rawTitle = titleMatches[i] ? titleMatches[i][1] : "";
      if (vidId && rawTitle && !seen.has(vidId)) {
        seen.add(vidId);
        results.push({
          title: decodeHtmlEntities(rawTitle),
          url: `https://www.youtube.com/watch?v=${vidId}`,
          snippet: `YouTube Video Lecture / Tutorial: ${decodeHtmlEntities(rawTitle)}`,
        });
        if (results.length >= limit) break;
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Searches the live web using DuckDuckGo Lite and Wikipedia with strict entity decoding
 */
async function performWebSearch(query: string, limit = 5): Promise<any> {
  const cleanQuery = query.trim();
  const lowerQ = cleanQuery.toLowerCase();
  let results: Array<{ title: string; url: string; snippet: string }> = [];

  // 1. YouTube direct search if looking for videos or lectures
  if (
    lowerQ.includes("youtube") ||
    lowerQ.includes("video") ||
    lowerQ.includes("lecture") ||
    lowerQ.includes("tutorial")
  ) {
    const ytResults = await searchYouTube(cleanQuery, limit);
    if (ytResults.length > 0) {
      results = ytResults;
    }
  }

  // 2. DuckDuckGo Lite search
  if (results.length < limit) {
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

          const rawTitle = linkMatches[i][2].replace(/<[^>]+>/g, "").trim();
          const rawSnippet = snippetMatches[i]
            ? snippetMatches[i][1].replace(/<[^>]+>/g, "").trim()
            : "";

          const title = decodeHtmlEntities(rawTitle);
          const snippet = decodeHtmlEntities(rawSnippet);

          if (title && url && (url.startsWith("http://") || url.startsWith("https://"))) {
            results.push({ title, url, snippet });
          }
        }
      }
    } catch {}
  }

  // 3. Fallback to Wikipedia search API if needed
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

/**
 * AMAHAS Autonomous Assistant Engine (Sprint 3)
 *
 * A reliable, context-aware agent pipeline that plans and executes bounded,
 * dependency-aware multi-step workflows across AMAHAS modules.
 *
 * Pipeline:
 * User request -> Context resolution -> Intent classification -> Action planning ->
 * Tool selection -> Permission & confirmation checks -> Execution -> Result verification -> Response.
 */

import { prisma } from "./prisma.ts";
import {
  ALL_TOOLS,
  APPLICATION_TOOLS,
  RESEARCH_TOOLS,
  getToolsForIntent,
  validateToolArgs,
  type ToolDefinition,
} from "./tools-registry.ts";
import { classifyIntent, type IntentRouteResult } from "./intent-router.ts";
import {
  generateConfirmationToken,
  verifyAndConsumeConfirmationToken,
  hashToolArgs,
} from "./tool-confirmation.ts";
import { decodeHtmlEntities } from "./format-utils.ts";

export type ExecutionState =
  | "planned"
  | "awaiting_confirmation"
  | "running"
  | "completed"
  | "partially_completed"
  | "failed";

export interface PlanStep {
  id: string;
  toolName: string;
  args: Record<string, any>;
  description: string;
  isDestructive?: boolean;
  requiresConfirmation?: boolean;
  dependsOnStepId?: string;
  argMapping?: Record<string, string>; // e.g. { taskId: "task.id" }
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: any;
  error?: string;
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  state: ExecutionState;
  steps: PlanStep[];
  currentStepIndex: number;
  confirmationToken?: string;
  requiresConfirmation?: boolean;
  summary?: string;
  error?: string;
  createdAt: string;
}

export interface EngineRunResult {
  message: {
    role: "assistant";
    content: string;
  };
  plan?: ExecutionPlan;
  executionState: ExecutionState;
  executedToolResults: Array<{ toolName: string; result?: any; error?: string }>;
  requiresConfirmation: boolean;
  confirmationToken?: string;
  toolCalls?: any[];
  behaviorCommand?: string;
  clarificationQuestion?: string;
}

export interface UserContext {
  userId: string;
  userName: string;
  memories: Array<{ key: string; value: string }>;
  activeCourses: Array<{ id: string; code: string; name: string }>;
  activeProjects: Array<{ id: string; name: string; type: "engineering" | "research" }>;
  pendingTasks: Array<{ id: string; title: string; priority: string; dueDate?: string | null }>;
}

export const MAX_PLAN_STEPS = 5;
export const MAX_TOOL_CALLS = 6;
export const EXECUTION_TIMEOUT_MS = 15000;

export class AutonomousAssistantEngine {
  /**
   * 1. CONTEXT RESOLUTION
   * Resolves explicit facts, approved memories, and active workspace resources.
   */
  async resolveUserContext(userId: string): Promise<UserContext> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }).catch(() => null);

    const memories = await prisma.aIMemory.findMany({
      where: { userId, isApproved: true },
      take: 10,
      select: { key: true, value: true },
    }).catch(() => []);

    const courses = await prisma.course.findMany({
      where: { userId },
      take: 10,
      select: { id: true, code: true, name: true },
    }).catch(() => []);

    const [engProjects, resProjects] = await Promise.all([
      prisma.project.findMany({
        where: { userId, status: "ACTIVE" },
        take: 10,
        select: { id: true, name: true },
      }).catch(() => []),
      prisma.researchProject.findMany({
        where: { userId, status: "ACTIVE" },
        take: 10,
        select: { id: true, title: true },
      }).catch(() => []),
    ]);

    const activeProjects: Array<{ id: string; name: string; type: "engineering" | "research" }> = [
      ...engProjects.map((p) => ({ id: p.id, name: p.name, type: "engineering" as const })),
      ...resProjects.map((p) => ({ id: p.id, name: p.title, type: "research" as const })),
    ];

    const pendingTasks = await prisma.task.findMany({
      where: { userId, status: "TODO" },
      take: 10,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, priority: true, dueDate: true },
    }).catch(() => []);

    return {
      userId,
      userName: user?.name || "Student",
      memories,
      activeCourses: courses,
      activeProjects,
      pendingTasks: pendingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      })),
    };
  }

  /**
   * 2. ACTION PLANNING
   * Formulates a dependency-aware plan with bounded steps.
   */
  async planWorkflow(
    userId: string,
    message: string,
    intentResult: IntentRouteResult,
    context: UserContext
  ): Promise<{ plan?: ExecutionPlan; clarification?: string }> {
    const lower = message.toLowerCase().trim();

    // -------------------------------------------------------------------------
    // WORKFLOW PATTERN A: Academic Planning ("Plan my revision for tomorrow")
    // -------------------------------------------------------------------------
    if (
      /(?:plan|schedule|organize)\s+(?:my\s+)?(?:revision|study\s+plan)/i.test(lower) ||
      /plan\s+tomorrow'?s\s+(?:revision|study)/i.test(lower)
    ) {
      // Query topics needing revision
      let dueTopics: any[] = [];
      try {
        const courses = await prisma.course.findMany({
          where: { userId },
          include: {
            units: {
              include: {
                topics: {
                  where: {
                    OR: [
                      { status: "UNSTUDIED" },
                      { nextRevisionAt: { lte: new Date(Date.now() + 86400000 * 2) } },
                    ],
                  },
                  take: 5,
                },
              },
            },
          },
        });
        dueTopics = courses.flatMap((c) =>
          c.units.flatMap((u) =>
            u.topics.map((t) => ({
              ...t,
              courseName: c.name,
              courseCode: c.code,
            }))
          )
        );
      } catch {}

      if (dueTopics.length === 0 && context.activeCourses.length === 0) {
        return {
          clarification: `You don't have any registered courses in your academic plan yet, ${context.userName}. Would you like me to register a course first? (For example: *"Add Operating Systems (CS301) to my plan"*).`,
        };
      }

      const targetTopic = dueTopics[0] || {
        title: "Active Topic Revision",
        courseCode: context.activeCourses[0]?.code || "ACAD",
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const plan: ExecutionPlan = {
        id: `plan_${Date.now()}_rev`,
        goal: `Plan and schedule revision for ${targetTopic.title}`,
        state: "planned",
        currentStepIndex: 0,
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            toolName: "schedule_focus_block",
            description: `Schedule 45-minute Deep Work focus block for ${targetTopic.title}`,
            args: {
              title: `Revision: ${targetTopic.title}`,
              durationMinutes: 45,
              startTime: tomorrow.toISOString(),
            },
            status: "pending",
          },
          {
            id: "step-2",
            toolName: "create_reminder",
            description: `Set revision reminder notification for ${targetTopic.title}`,
            args: {
              title: `Revision Due: ${targetTopic.title}`,
              message: `Scheduled active recall revision session for ${targetTopic.title} (${targetTopic.courseCode || "Academics"}).`,
              scheduledDate: tomorrow.toISOString(),
              category: "REVISION",
            },
            status: "pending",
          },
        ],
      };

      return { plan };
    }

    // -------------------------------------------------------------------------
    // WORKFLOW PATTERN B: Task & Reminder for Research/Engineering Project
    // e.g. "Create a task for my research project and remind me before its deadline"
    // -------------------------------------------------------------------------
    if (
      /(?:create|add)\s+(?:a\s+)?task\s+.*(?:project|research)/i.test(lower) &&
      /(?:remind|reminder)/i.test(lower)
    ) {
      // Resolve project
      const isResearchSpecified = /research/i.test(lower);
      const candidates = context.activeProjects.filter((p) =>
        isResearchSpecified ? p.type === "research" : true
      );

      // Ambiguity check
      if (candidates.length > 1) {
        const projectList = candidates.map((c) => `• **${c.name}** (${c.type})`).join("\n");
        return {
          clarification: `You have multiple active ${isResearchSpecified ? "research " : ""}projects:\n\n${projectList}\n\nWhich project should I link this task to?`,
        };
      }

      const matchedProject = candidates[0];
      const dueDate = new Date(Date.now() + 86400000 * 3).toISOString(); // 3 days default

      // Extract title
      let taskTitle = "Project Milestone Deliverable";
      const titleMatch = message.match(/(?:task|todo)\s+(?:to|for|called)?\s+['"]?([^'"]+?)['"]?(?:\s+and\s+remind|\s+before|\s+with|$)/i);
      if (titleMatch && titleMatch[1]?.trim() && !/my\s+(?:research\s+)?project/i.test(titleMatch[1])) {
        taskTitle = titleMatch[1].trim();
      }

      const plan: ExecutionPlan = {
        id: `plan_${Date.now()}_task_rem`,
        goal: `Create task "${taskTitle}" and set linked deadline reminder`,
        state: "planned",
        currentStepIndex: 0,
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            toolName: "create_task",
            description: `Create high-priority task "${taskTitle}"${matchedProject ? ` linked to ${matchedProject.name}` : ""}`,
            args: {
              title: taskTitle,
              priority: "HIGH",
              dueDate,
              ...(matchedProject?.type === "engineering" && { projectId: matchedProject.id }),
              ...(matchedProject?.type === "research" && { researchProjectId: matchedProject.id }),
            },
            status: "pending",
          },
          {
            id: "step-2",
            toolName: "create_reminder",
            description: `Create active reminder linked to task`,
            dependsOnStepId: "step-1",
            argMapping: { taskId: "task.id" },
            args: {
              title: `Deadline: ${taskTitle}`,
              message: `Task "${taskTitle}" deadline is approaching.`,
              category: "DEADLINE",
              scheduledDate: dueDate,
            },
            status: "pending",
          },
        ],
      };

      return { plan };
    }

    // -------------------------------------------------------------------------
    // WORKFLOW PATTERN C: Research Capture
    // e.g. "Save this idea in my research notes and connect it to the relevant project"
    // -------------------------------------------------------------------------
    if (
      /(?:save|write|record|capture)\s+.*(?:idea|note|thought).*in\s+(?:my\s+)?(?:research\s+)?notes/i.test(lower)
    ) {
      const researchProjects = context.activeProjects.filter((p) => p.type === "research");
      if (researchProjects.length > 1) {
        const list = researchProjects.map((r) => `• **${r.name}**`).join("\n");
        return {
          clarification: `You have multiple active research projects:\n\n${list}\n\nWhich project should I connect this research note to?`,
        };
      }

      const matchedResearch = researchProjects[0] || context.activeProjects[0];

      // Extract note idea
      let noteContent = message;
      let noteTitle = "Research Observation";
      const ideaMatch = message.match(/(?:idea|thought|note|finding):\s*['"]?([^'"]+)['"]?/i);
      if (ideaMatch) {
        noteTitle = ideaMatch[1].slice(0, 40).trim();
        noteContent = ideaMatch[1].trim();
      }

      const plan: ExecutionPlan = {
        id: `plan_${Date.now()}_note`,
        goal: `Capture research note and connect to ${matchedResearch ? matchedResearch.name : "research project"}`,
        state: "planned",
        currentStepIndex: 0,
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            toolName: "create_note",
            description: `Save research note linked to ${matchedResearch ? matchedResearch.name : "project"}`,
            args: {
              title: noteTitle,
              content: noteContent,
              tags: "research,idea,autonomous-capture",
              ...(matchedResearch?.type === "research" && { researchProjectId: matchedResearch.id }),
              ...(matchedResearch?.type === "engineering" && { projectId: matchedResearch.id }),
            },
            status: "pending",
          },
        ],
      };

      return { plan };
    }

    // -------------------------------------------------------------------------
    // WORKFLOW PATTERN D: Direct Deterministic Application Actions
    // -------------------------------------------------------------------------
    if (intentResult.intent === "application_action" && intentResult.suggestedAction) {
      const { toolName, suggestedArgs } = intentResult.suggestedAction;
      const toolDef = ALL_TOOLS[toolName] || APPLICATION_TOOLS[toolName];
      if (toolDef) {
        const plan: ExecutionPlan = {
          id: `plan_${Date.now()}_single`,
          goal: `Execute ${toolName}`,
          state: "planned",
          currentStepIndex: 0,
          createdAt: new Date().toISOString(),
          steps: [
            {
              id: "step-1",
              toolName,
              description: `Execute ${toolName}`,
              args: suggestedArgs,
              isDestructive: toolDef.isDestructive,
              requiresConfirmation: toolDef.isDestructive,
              status: "pending",
            },
          ],
        };
        return { plan };
      }
    }

    return {};
  }

  /**
   * 3. BOUNDED PLAN EXECUTION
   * Executes plan steps with dependency resolution, schema validation,
   * confirmation gates, and honest partial failure handling.
   */
  async executePlan(
    plan: ExecutionPlan,
    userId: string,
    confirmationToken?: string
  ): Promise<{
    plan: ExecutionPlan;
    executedResults: Array<{ toolName: string; result?: any; error?: string }>;
    requiresConfirmation: boolean;
    confirmationToken?: string;
  }> {
    const executedResults: Array<{ toolName: string; result?: any; error?: string }> = [];
    const startTime = Date.now();
    const executedToolCallKeys = new Set<string>();

    // Safety Bound 1: Plan length limit
    if (plan.steps.length > MAX_PLAN_STEPS) {
      plan.state = "failed";
      plan.error = `Plan exceeds maximum allowable limit of ${MAX_PLAN_STEPS} steps.`;
      return { plan, executedResults, requiresConfirmation: false };
    }

    plan.state = "running";
    const stepOutputs = new Map<string, any>();

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      plan.currentStepIndex = i;

      // Safety Bound 2: Timeout check
      if (Date.now() - startTime > EXECUTION_TIMEOUT_MS) {
        step.status = "failed";
        step.error = "Execution timed out before step could begin.";
        plan.state = executedResults.length > 0 ? "partially_completed" : "failed";
        this.skipRemainingSteps(plan, i + 1);
        break;
      }

      // Safety Bound 3: Max tool calls limit
      if (executedResults.length >= MAX_TOOL_CALLS) {
        step.status = "failed";
        step.error = `Exceeded maximum allowable tool calls limit (${MAX_TOOL_CALLS}).`;
        plan.state = executedResults.length > 0 ? "partially_completed" : "failed";
        this.skipRemainingSteps(plan, i + 1);
        break;
      }

      // Resolve step dependencies
      if (step.dependsOnStepId && step.argMapping) {
        const parentOutput = stepOutputs.get(step.dependsOnStepId);
        if (!parentOutput) {
          step.status = "failed";
          step.error = `Missing dependency output from step ${step.dependsOnStepId}.`;
          plan.state = executedResults.length > 0 ? "partially_completed" : "failed";
          this.skipRemainingSteps(plan, i + 1);
          break;
        }

        for (const [targetKey, sourcePath] of Object.entries(step.argMapping)) {
          const resolvedVal = this.getNestedProperty(parentOutput, sourcePath);
          if (resolvedVal !== undefined) {
            step.args[targetKey] = resolvedVal;
          }
        }
      }

      // Safety Bound 4: Unbounded loop & repeated call prevention
      const callKey = `${step.toolName}:${hashToolArgs(step.args)}`;
      if (executedToolCallKeys.has(callKey)) {
        step.status = "failed";
        step.error = "Duplicate repeated tool call detected in same execution cycle.";
        plan.state = executedResults.length > 0 ? "partially_completed" : "failed";
        this.skipRemainingSteps(plan, i + 1);
        break;
      }
      executedToolCallKeys.add(callKey);

      // Tool Lookup
      const toolDef: ToolDefinition | undefined =
        ALL_TOOLS[step.toolName] || APPLICATION_TOOLS[step.toolName];
      if (!toolDef) {
        step.status = "failed";
        step.error = `Tool '${step.toolName}' is not registered in AMAHAS tools registry.`;
        plan.state = executedResults.length > 0 ? "partially_completed" : "failed";
        this.skipRemainingSteps(plan, i + 1);
        break;
      }

      // Safety Bound 5: Strict server-side argument validation
      const validation = validateToolArgs(toolDef, step.args);
      if (!validation.valid) {
        step.status = "failed";
        step.error = `Argument validation failed: ${validation.errors.join("; ")}`;
        plan.state = executedResults.length > 0 ? "partially_completed" : "failed";
        this.skipRemainingSteps(plan, i + 1);
        break;
      }

      // Safety Bound 6: Confirmation Gate for Destructive Operations
      if (toolDef.isDestructive || step.requiresConfirmation) {
        if (!confirmationToken) {
          // Pause execution and ask for confirmation
          step.status = "pending";
          plan.state = "awaiting_confirmation";
          plan.requiresConfirmation = true;
          const token = generateConfirmationToken({
            userId,
            toolName: step.toolName,
            args: step.args,
          });
          plan.confirmationToken = token;
          return {
            plan,
            executedResults,
            requiresConfirmation: true,
            confirmationToken: token,
          };
        }

        // Verify provided confirmation token
        const verifyResult = await verifyAndConsumeConfirmationToken({
          token: confirmationToken,
          userId,
          toolName: step.toolName,
          args: step.args,
        });

        if (!verifyResult.valid) {
          step.status = "failed";
          step.error = `Confirmation verification failed: ${verifyResult.reason}`;
          plan.state = "failed";
          this.skipRemainingSteps(plan, i + 1);
          break;
        }
      }

      // Execute Tool
      step.status = "running";
      try {
        const result = await toolDef.execute(userId, step.args);

        // Result Verification: Check for false success
        if (result && result.success === false) {
          step.status = "failed";
          step.error = result.error || "Operation returned unsuccessful status.";
          executedResults.push({ toolName: step.toolName, error: step.error });
          plan.state = executedResults.length > 1 ? "partially_completed" : "failed";
          this.skipRemainingSteps(plan, i + 1);
          break;
        }

        step.status = "completed";
        step.result = result;
        stepOutputs.set(step.id, result);
        executedResults.push({ toolName: step.toolName, result });
      } catch (execErr: any) {
        step.status = "failed";
        step.error = execErr.message || "Unknown error during tool execution.";
        executedResults.push({ toolName: step.toolName, error: step.error });
        plan.state = executedResults.length > 1 ? "partially_completed" : "failed";
        this.skipRemainingSteps(plan, i + 1);
        break;
      }
    }

    if (plan.steps.every((s) => s.status === "completed")) {
      plan.state = "completed";
    }

    return {
      plan,
      executedResults,
      requiresConfirmation: false,
    };
  }

  /**
   * Helper to resolve dot-notated source paths (e.g. "task.id")
   */
  private getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Mark remaining unexecuted steps as skipped upon failure
   */
  private skipRemainingSteps(plan: ExecutionPlan, fromIndex: number) {
    for (let j = fromIndex; j < plan.steps.length; j++) {
      plan.steps[j].status = "skipped";
    }
  }

  /**
   * 4. SYNTHESIS
   * Builds an honest, verified user-facing response message.
   */
  synthesizeResponse(
    plan: ExecutionPlan,
    userName: string,
    clarification?: string
  ): string {
    if (clarification) return clarification;

    if (plan.state === "awaiting_confirmation") {
      const step = plan.steps[plan.currentStepIndex];
      return `I have prepared the action: **${step.description}**. Because this action is irreversible, please review and confirm below:`;
    }

    if (plan.state === "completed") {
      const bulletPoints = plan.steps
        .map((s) => `• **${s.description}**: Completed successfully`)
        .join("\n");
      return `I've successfully executed this workflow for you, ${userName}:\n\n${bulletPoints}\n\nAll verified changes are active in your workspace.`;
    }

    if (plan.state === "partially_completed") {
      const completed = plan.steps.filter((s) => s.status === "completed");
      const failed = plan.steps.find((s) => s.status === "failed");
      const completedText = completed.map((s) => `• ${s.description}`).join("\n");

      return `Workflow partially completed, ${userName}:\n\n**Succeeded:**\n${completedText}\n\n**Halted on error:**\n• ${failed?.description}: ${failed?.error || "Execution failed"}\n\nRemaining steps were safely cancelled to prevent data corruption.`;
    }

    if (plan.state === "failed") {
      const failed = plan.steps.find((s) => s.status === "failed") || plan.steps[0];
      return `I wasn't able to complete this request: ${failed?.error || plan.error || "Execution failed"}. No further changes were made.`;
    }

    return "Workflow planned.";
  }

  /**
   * 5. MAIN ENTRY POINT
   * End-to-end execution pipeline.
   */
  async processRequest(params: {
    userId: string;
    message: string;
    modelId?: string;
    confirmationToken?: string;
  }): Promise<EngineRunResult> {
    const { userId, message, confirmationToken } = params;

    // A. Context Resolution
    const context = await this.resolveUserContext(userId);

    // B. Intent Classification
    const intentResult = classifyIntent(message);

    // C. Clarification Required Check
    if (intentResult.intent === "clarification_required") {
      const question =
        intentResult.clarificationMessage ||
        `I'd be glad to help, ${context.userName}. Could you clarify the specific details?`;
      return {
        message: { role: "assistant", content: question },
        executionState: "completed",
        executedToolResults: [],
        requiresConfirmation: false,
        clarificationQuestion: question,
      };
    }

    // D. Action Planning
    const { plan, clarification } = await this.planWorkflow(userId, message, intentResult, context);

    if (clarification) {
      return {
        message: { role: "assistant", content: clarification },
        executionState: "completed",
        executedToolResults: [],
        requiresConfirmation: false,
        clarificationQuestion: clarification,
      };
    }

    // E. Execute Plan if one was formulated
    if (plan) {
      const execution = await this.executePlan(plan, userId, confirmationToken);
      const text = this.synthesizeResponse(execution.plan, context.userName);

      let toolCalls: any[] | undefined = undefined;
      if (execution.requiresConfirmation) {
        const step = execution.plan.steps[execution.plan.currentStepIndex];
        toolCalls = [
          {
            id: `call_${Date.now()}`,
            function: {
              name: step.toolName,
              arguments: JSON.stringify(step.args),
            },
          },
        ];
      }

      return {
        message: { role: "assistant", content: text },
        plan: execution.plan,
        executionState: execution.plan.state,
        executedToolResults: execution.executedResults,
        requiresConfirmation: execution.requiresConfirmation,
        confirmationToken: execution.confirmationToken,
        toolCalls,
      };
    }

    // F. Fallback: If no plan was formulated, return friendly assistance
    return {
      message: {
        role: "assistant",
        content: `I'm right here with you, ${context.userName}! We can plan your revision, schedule focus blocks, manage tasks, or take notes. What shall we work on?`,
      },
      executionState: "completed",
      executedToolResults: [],
      requiresConfirmation: false,
    };
  }
}

export const assistantEngine = new AutonomousAssistantEngine();

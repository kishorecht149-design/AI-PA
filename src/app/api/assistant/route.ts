import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { assertWorkspaceWriteAccess } from "@/lib/subscription";
import { aiGateway } from "@/lib/ai-gateway";
import { ALL_TOOLS, APPLICATION_TOOLS, validateToolArgs } from "@/lib/tools-registry";
import { inferBehaviorFromContent } from "@/components/assistant/behaviorDirector";
import {
  generateConfirmationToken,
  verifyAndConsumeConfirmationToken,
} from "@/lib/tool-confirmation";

// Sliding window rate limiter to protect ₹0 infrastructure tier
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Max 30 requests/minute per user

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
}

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [conversation, memories] = await Promise.all([
      prisma.conversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      }),
      prisma.aIMemory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      conversation,
      memories,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Enforce rate limiting
    if (isRateLimited(userId)) {
      return NextResponse.json(
        {
          error:
            "Request rate limit exceeded (maximum 30 messages per minute). Please pause briefly before sending another message.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, modelId, conversationId, executeConfirmedTool } = body;
    const activeModelId = String(modelId || body.model || "openrouter/free").slice(0, 100);

    // Direct confirmation execution of a mutating tool with strict validation and idempotency
    if (executeConfirmedTool) {
      const { toolName, args, idempotencyKey, confirmationToken } = executeConfirmedTool;
      const toolDef = ALL_TOOLS[toolName] || APPLICATION_TOOLS[toolName];
      if (!toolDef) {
        return NextResponse.json({ error: `Unknown tool '${toolName}'` }, { status: 400 });
      }

      if (!toolDef.isReadOnly) {
        await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));
      }

      // 1. Strict server-side parameter validation
      const validation = validateToolArgs(toolDef, args);
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Tool argument validation failed", details: validation.errors },
          { status: 400 }
        );
      }

      // 2. Cryptographic confirmation verification for destructive operations
      if (toolDef.isDestructive) {
        if (!confirmationToken) {
          return NextResponse.json(
            { error: "Cryptographic confirmation token is required for destructive operations." },
            { status: 403 }
          );
        }
        const verifyResult = await verifyAndConsumeConfirmationToken({
          token: confirmationToken,
          userId,
          toolName,
          args,
        });
        if (!verifyResult.valid) {
          return NextResponse.json(
            { error: `Confirmation verification failed: ${verifyResult.reason}` },
            { status: 403 }
          );
        }
      }

      // 3. Prevent duplicate execution when a request is retried
      if (idempotencyKey) {
        const existingAudit = await prisma.auditEvent.findFirst({
          where: {
            userId,
            action: `TOOL_MUTATION:${idempotencyKey}`,
          },
        });
        if (existingAudit?.detailsJson) {
          try {
            const cachedResult = JSON.parse(existingAudit.detailsJson);
            return NextResponse.json({
              success: true,
              toolResult: cachedResult,
              isIdempotentReplay: true,
            });
          } catch {}
        }
      }

      // 4. Execute tool
      const toolResult = await toolDef.execute(userId, args);

      // 5. Record audit event for verification & idempotency
      if (idempotencyKey) {
        await prisma.auditEvent.create({
          data: {
            userId,
            action: `TOOL_MUTATION:${idempotencyKey}`,
            detailsJson: JSON.stringify(toolResult),
          },
        });
      }

      return NextResponse.json({ success: true, toolResult });
    }

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required and must be non-empty." }, { status: 400 });
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: "Message exceeds maximum allowed limit of 4000 characters." },
        { status: 400 }
      );
    }

    // Get or create conversation (enforcing userId ownership)
    let conv = conversationId
      ? await prisma.conversation.findFirst({ where: { id: conversationId, userId } })
      : await prisma.conversation.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          userId,
          title: message.substring(0, 30),
          modelUsed: activeModelId,
        },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        role: "user",
        content: message.trim(),
      },
    });

    // Load recent history (most recent 20 messages in chronological order)
    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const formattedHistory = recentMessages.reverse().map((m) => ({
      role: m.role as any,
      content: m.content,
    }));

    // Send to AI Gateway
    const response = await aiGateway.chat({
      userId,
      messages: formattedHistory,
      modelId: activeModelId,
    });

    // Save assistant response & derive autonomous behavior command
    const rawContent = response.message.content || "I'm right here with you! What shall we work on today?";
    const { cleanedText, command: behaviorCommand } = inferBehaviorFromContent(
      rawContent,
      message,
      response.executedToolResults
    );

    const savedMsg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        role: "assistant",
        content: cleanedText,
        toolCallsJson: response.toolCalls ? JSON.stringify(response.toolCalls) : null,
      },
    });

    let confirmationToken: string | undefined = undefined;
    if (response.requiresConfirmation && response.toolCalls && response.toolCalls.length > 0) {
      const firstCall = response.toolCalls[0];
      const toolName = firstCall.function?.name;
      let args = {};
      try {
        args = JSON.parse(firstCall.function?.arguments || "{}");
      } catch {}
      confirmationToken = generateConfirmationToken({
        userId,
        toolName,
        args,
      });
    }

    const finalConfirmationToken = confirmationToken || response.confirmationToken;
    const executionState =
      response.executionState ||
      (response.requiresConfirmation ? "awaiting_confirmation" : "completed");

    return NextResponse.json({
      message: savedMsg,
      behaviorCommand,
      toolCalls: response.toolCalls,
      requiresConfirmation: response.requiresConfirmation,
      confirmationToken: finalConfirmationToken,
      executedToolResults: response.executedToolResults,
      executionState,
      plan: response.plan,
    });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Memory deletion endpoint
export async function DELETE(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertWorkspaceWriteAccess(userId, req.headers.get("x-support-session-id"));

    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get("memoryId");
    if (!memoryId) return NextResponse.json({ error: "Memory ID required" }, { status: 400 });

    await prisma.aIMemory.deleteMany({
      where: { id: memoryId, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.status === 403 || err.code === "WORKSPACE_READ_ONLY") {
      return NextResponse.json({ error: err.message, code: "WORKSPACE_READ_ONLY" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { aiGateway } from "@/lib/ai-gateway";
import { APPLICATION_TOOLS } from "@/lib/tools-registry";

export async function GET() {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
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
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { message, modelId, conversationId, executeConfirmedTool } = body;

    // Direct confirmation execution of a mutating tool
    if (executeConfirmedTool) {
      const { toolName, args } = executeConfirmedTool;
      const toolDef = APPLICATION_TOOLS[toolName];
      if (!toolDef) {
        return NextResponse.json({ error: "Unknown tool" }, { status: 400 });
      }
      const toolResult = await toolDef.execute(userId, args);
      return NextResponse.json({ success: true, toolResult });
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get or create conversation
    let conv = conversationId
      ? await prisma.conversation.findUnique({ where: { id: conversationId } })
      : await prisma.conversation.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          userId,
          title: message.substring(0, 30),
          modelUsed: modelId || "openrouter/free",
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

    // Load recent history
    const history = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      take: 8,
    });

    const formattedHistory = history.map((m) => ({
      role: m.role as any,
      content: m.content,
    }));

    // Send to AI Gateway
    const response = await aiGateway.chat({
      userId,
      messages: formattedHistory,
      modelId: modelId || "openrouter/free",
    });

    // Save assistant response
    const assistantContent = response.message.content || "Action proposed below:";
    const savedMsg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        role: "assistant",
        content: assistantContent,
        toolCallsJson: response.toolCalls ? JSON.stringify(response.toolCalls) : null,
      },
    });

    return NextResponse.json({
      message: savedMsg,
      toolCalls: response.toolCalls,
      requiresConfirmation: response.requiresConfirmation,
      executedToolResults: response.executedToolResults,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Memory deletion endpoint
export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    const userId = user?.id || (await prisma.user.findFirst())?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get("memoryId");
    if (!memoryId) return NextResponse.json({ error: "Memory ID required" }, { status: 400 });

    await prisma.aIMemory.deleteMany({
      where: { id: memoryId, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

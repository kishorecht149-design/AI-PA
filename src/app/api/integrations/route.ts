import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { CONNECTOR_CATALOG, testConnector } from "@/lib/integrations/connectors";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await prisma.integrationAccount.findMany({
      where: { userId },
    });

    const statusMap = new Map(accounts.map((a) => [a.provider, a]));

    const connectors = CONNECTOR_CATALOG.map((meta) => {
      const account = statusMap.get(meta.provider);
      return {
        ...meta,
        status: account?.status || "NOT_CONFIGURED",
        lastSyncAt: account?.lastSyncAt,
        lastError: account?.lastError,
      };
    });

    return NextResponse.json({ connectors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST endpoint to test connection or configure
export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { provider, apiKey, endpoint } = body;

    const testResult = await testConnector(provider, { apiKey, endpoint });

    const updated = await prisma.integrationAccount.upsert({
      where: {
        userId_provider: { userId, provider },
      },
      update: {
        status: testResult.success ? "CONNECTED" : "ERROR",
        endpointUrl: endpoint || null,
        lastSyncAt: testResult.success ? new Date() : null,
        lastError: testResult.success ? null : testResult.message,
      },
      create: {
        userId,
        provider,
        status: testResult.success ? "CONNECTED" : "ERROR",
        endpointUrl: endpoint || null,
        lastSyncAt: testResult.success ? new Date() : null,
        lastError: testResult.success ? null : testResult.message,
      },
    });

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      account: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

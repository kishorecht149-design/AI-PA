import { NextResponse } from "next/server";
import { providerManager } from "@/lib/providers";
import { KNOWN_FREE_MODELS } from "@/lib/ai-gateway";

export async function GET() {
  try {
    const health = await providerManager.checkHealth();
    const ollamaHealth = health.ollama;

    const localModels = (ollamaHealth?.models || []).map((m: string) => ({
      id: `ollama/${m}`,
      name: `${m} (Local Mac)`,
      isLocal: true,
    }));

    const cloudModels = KNOWN_FREE_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      isLocal: false,
    }));

    return NextResponse.json({
      ollamaAvailable: Boolean(ollamaHealth?.available),
      ollamaMessage: ollamaHealth?.message || "",
      localModels,
      cloudModels,
    });
  } catch (err: any) {
    return NextResponse.json({
      ollamaAvailable: false,
      ollamaMessage: err.message,
      localModels: [],
      cloudModels: KNOWN_FREE_MODELS,
    });
  }
}

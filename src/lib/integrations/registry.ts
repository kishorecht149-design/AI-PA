/**
 * AMAHAS AI Operating System — Service Integration Registry
 *
 * All external and companion services are registered here with strict security boundaries,
 * ₹0 infrastructure budget considerations, and disabled-by-default status.
 */

export interface ServiceIntegrationDefinition {
  id: string;
  name: string;
  role: string;
  specificCapability: string;
  executionMode: "LOCAL_ONLY" | "REMOTE_ONLY" | "HYBRID";
  isEnabledByDefault: boolean;
  isNecessaryForInitialRelease: boolean;
  apiProtocol: string;
  authRequirements: string;
  resourceRequirements: {
    minimumRam: string;
    recommendedGpu: string;
    diskSpace: string;
  };
  license: string;
  securityBoundary: string;
  failureMode: string;
  duplicateAnalysisNotes: string;
}

export const FUTURE_SERVICE_REGISTRY: Record<string, ServiceIntegrationDefinition> = {
  ollama: {
    id: "ollama",
    name: "Ollama",
    role: "Local Model Inference",
    specificCapability:
      "Runs quantized open weights (Llama 3.2, Qwen 2.5, DeepSeek R1) locally on Apple Silicon (Metal) with 100% offline privacy and zero per-token cloud costs.",
    executionMode: "LOCAL_ONLY",
    isEnabledByDefault: false,
    isNecessaryForInitialRelease: true, // Implemented as local provider in Phase 4
    apiProtocol: "REST (Native /api/chat or OpenAI-compatible /v1/chat/completions)",
    authRequirements: "None by default; bound strictly to 127.0.0.1 loopback.",
    resourceRequirements: {
      minimumRam: "8 GB unified memory (3B-8B parameter models)",
      recommendedGpu: "Apple Silicon M-series unified GPU",
      diskSpace: "2.0 GB - 5.0 GB per downloaded model",
    },
    license: "MIT License",
    securityBoundary:
      "Strict loopback isolation. Unauthenticated daemon must never be exposed directly to public internet without mTLS or Tailscale tunnel.",
    failureMode:
      "When Ollama daemon is offline or host is unreachable, AMAHAS falls back smoothly to OpenRouter free models.",
    duplicateAnalysisNotes:
      "Core local inference engine. Not duplicate; complements OpenRouter cloud free tier.",
  },

  langflow: {
    id: "langflow",
    name: "Langflow",
    role: "Visual AI Workflows & Prototyping",
    specificCapability:
      "Drag-and-drop visual graph designer for multi-step reasoning pipelines, prompt experimentation, and agent chain prototyping.",
    executionMode: "LOCAL_ONLY",
    isEnabledByDefault: false,
    isNecessaryForInitialRelease: false,
    apiProtocol: "REST API / Webhook trigger (/api/v1/run/<flow_id>)",
    authRequirements: "Bearer API Key generated per flow",
    resourceRequirements: {
      minimumRam: "4 GB RAM",
      recommendedGpu: "CPU only",
      diskSpace: "1.5 GB Docker image / Python venv",
    },
    license: "MIT License",
    securityBoundary:
      "Read-only workflow execution. Model cannot modify flow canvas or execute arbitrary Python nodes without developer approval.",
    failureMode:
      "Workflow execution timeout reverts to built-in AMAHAS local heuristics.",
    duplicateAnalysisNotes:
      "Candidate pipeline designer. Overlaps with Dify; Langflow is preferred for rapid developer prototyping, Dify for turnkey end-user apps.",
  },

  n8n: {
    id: "n8n",
    name: "n8n",
    role: "Approved External Automations & Webhooks",
    specificCapability:
      "Event-driven student life automations (e.g. syncing calendar events, notifying on exam deadline changes, archiving completed project summaries to local storage).",
    executionMode: "HYBRID",
    isEnabledByDefault: false,
    isNecessaryForInitialRelease: false,
    apiProtocol: "Webhook POST & REST API v1",
    authRequirements: "n8n API Key (X-N8N-API-KEY) or secret webhook header token",
    resourceRequirements: {
      minimumRam: "2 GB RAM (Node.js runtime)",
      recommendedGpu: "CPU only",
      diskSpace: "500 MB Docker image + SQLite storage",
    },
    license: "Sustainable Use License / Fair-code (Community Edition is free self-hosted)",
    securityBoundary:
      "Outbound webhook trigger only. Assistant cannot execute arbitrary JavaScript or alter n8n workflow definitions without credentials.",
    failureMode:
      "Webhook failure logs audit record and retries up to 3 times with exponential backoff without interrupting the chat thread.",
    duplicateAnalysisNotes:
      "Specialized in multi-service external integrations (Email, Calendar, GitHub, Notion). Distinct from LLM orchestration.",
  },

  dify: {
    id: "dify",
    name: "Dify",
    role: "Candidate AI Application & RAG Engine",
    specificCapability:
      "Turnkey LLM application builder with enterprise-grade RAG indexing, prompt management, and multi-model routing.",
    executionMode: "HYBRID",
    isEnabledByDefault: false,
    isNecessaryForInitialRelease: false,
    apiProtocol: "REST API (/v1/chat-messages, /v1/completion-messages)",
    authRequirements: "App-specific API Bearer token",
    resourceRequirements: {
      minimumRam: "8 GB RAM (Multi-container stack with Redis, PostgreSQL, Celery, Vector DB)",
      recommendedGpu: "CPU or GPU for embedding generation",
      diskSpace: "8.0 GB Docker stack",
    },
    license: "Apache 2.0 with commercial restrictions",
    securityBoundary:
      "Scoped to designated AMAHAS dataset only. Model output filtered for prompt injection before surfacing.",
    failureMode:
      "Graceful fallback to internal Prisma search and Wikipedia/arXiv connectors.",
    duplicateAnalysisNotes:
      "Heavy multi-container footprint. Do not deploy until document volume exceeds local Prisma capabilities to maintain ₹0 budget.",
  },

  anythingllm: {
    id: "anythingllm",
    name: "AnythingLLM",
    role: "Candidate Document Knowledge & Vector Retrieval",
    specificCapability:
      "All-in-one desktop or server document workspace supporting PDF, DOCX, TXT embeddings with zero configuration local vector store (LanceDB).",
    executionMode: "LOCAL_ONLY",
    isEnabledByDefault: false,
    isNecessaryForInitialRelease: false,
    apiProtocol: "REST API (/api/v1/workspace/<slug>/chat)",
    authRequirements: "Developer API Key",
    resourceRequirements: {
      minimumRam: "4 GB RAM",
      recommendedGpu: "CPU only",
      diskSpace: "2.0 GB installation",
    },
    license: "MIT License",
    securityBoundary:
      "Document ingestion bounded to user-approved workspace folders. No external network data egress.",
    failureMode:
      "Document retrieval errors yield direct LLM response with notice that citations are unavailable.",
    duplicateAnalysisNotes:
      "Lightweight alternative to Dify for simple local document Q&A. Choose either AnythingLLM or Dify, not both.",
  },

  crewai: {
    id: "crewai",
    name: "CrewAI",
    role: "Specialized Multi-Agent Task Orchestration",
    specificCapability:
      "Autonomous collaborative multi-agent crews for complex, long-horizon academic tasks (e.g., Literature Review Crew: Searcher -> Synthesizer -> Critic -> Formatter).",
    executionMode: "LOCAL_ONLY",
    isEnabledByDefault: false,
    isNecessaryForInitialRelease: false,
    apiProtocol: "Python SDK / Async Worker REST Bridge",
    authRequirements: "Internal JWT session token",
    resourceRequirements: {
      minimumRam: "4 GB RAM",
      recommendedGpu: "CPU (uses Ollama or OpenRouter as LLM backend)",
      diskSpace: "500 MB Python environment",
    },
    license: "MIT License",
    securityBoundary:
      "Sandboxed tool execution. Agents operate strictly with permission-bounded tools under student supervision.",
    failureMode:
      "Agent iteration limit (max 5 loops) prevents runaway tokens or endless execution.",
    duplicateAnalysisNotes:
      "Role-playing agent crews for deep research projects. Complements standard single-turn assistant.",
  },

  comfyui: {
    id: "comfyui",
    name: "ComfyUI",
    role: "Optional Local Image & Visual Generation",
    specificCapability:
      "Node-based Stable Diffusion / Flux workflow generator for study flashcard diagrams, concept visual illustrations, and project mindmaps.",
    executionMode: "LOCAL_ONLY",
    isEnabledByDefault: false,
    isNecessaryForInitialRelease: false,
    apiProtocol: "WebSocket & REST API (/prompt, /view)",
    authRequirements: "None by default; restricted to 127.0.0.1 loopback",
    resourceRequirements: {
      minimumRam: "16 GB unified RAM (Apple Silicon M-series required for decent Flux/SDXL speeds)",
      recommendedGpu: "Dedicated GPU or Apple Silicon Metal with >= 16GB VRAM",
      diskSpace: "15 GB - 30 GB (Checkpoints and LoRA weights)",
    },
    license: "GPL-3.0",
    securityBoundary:
      "Local generation only. Model cannot download external arbitrary pickle checkpoints without developer authorization.",
    failureMode:
      "If ComfyUI is unavailable, assistant returns structured SVG or Mermaid text diagrams.",
    duplicateAnalysisNotes:
      "Optional visual generator for high-spec Macs. Completely optional for ₹0 base budget.",
  },

  librechat: {
    id: "librechat",
    name: "LibreChat",
    role: "Reference Architecture & Companion Protocol",
    specificCapability:
      "Serves as an architectural and UI reference for multi-modal artifacts, code execution sandbox concepts, and plugin standards. NOT a competing frontend.",
    executionMode: "REMOTE_ONLY",
    isEnabledByDefault: false,
    isNecessaryForInitialRelease: false,
    apiProtocol: "Reference Only (AMAHAS is the primary UI/OS)",
    authRequirements: "N/A",
    resourceRequirements: {
      minimumRam: "N/A",
      recommendedGpu: "N/A",
      diskSpace: "N/A",
    },
    license: "MIT License",
    securityBoundary:
      "Zero direct integration. Design patterns referenced without deploying duplicate frontend.",
    failureMode: "N/A",
    duplicateAnalysisNotes:
      "AMAHAS is the official personal operating system. LibreChat is consulted for protocol design, not deployed as a second UI.",
  },
};

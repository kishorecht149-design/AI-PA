# AMAHAS — Service Integration Registry & Architectural Roadmap

This document defines the architectural boundaries, future roles, resource budgets, and security isolation policies for integrating companion open-source AI and workflow platforms with the AMAHAS Personal Operating System.

---

## 1. Core Architectural Principles

1. **Strict ₹0 Initial Infrastructure Budget**:
   - Primary cloud reasoning uses OpenRouter's free-tier router and zero-cost models (`openrouter/free`, `google/gemini-2.0-flash-exp:free`, `meta-llama/llama-3.3-70b-instruct:free`).
   - Local reasoning uses Ollama running directly on the student's hardware (e.g. Apple Silicon on macOS) without cloud token fees.
   - Hosted deployment utilizes free-tier Vercel serverless and Supabase PostgreSQL.

2. **No Duplicate Orchestration or Redundant Frontends**:
   - AMAHAS is the **single unified frontend and personal operating system**.
   - Companion repositories are integrated as headless backend services or developer prototyping tools only when a demonstrated capability gap exists.
   - Companion services remain **disabled by default** until explicitly configured.

3. **Least Privilege & Strict Action Permissions**:
   - External models and autonomous agents may propose actions, but execution is strictly bounded to the server-side tool schema allowlist.
   - Consequential or mutating operations (e.g., deleting notes, creating tasks, modifying the dashboard) always require explicit user confirmation.

---

## 2. Companion Service Matrix

| Service | Primary Role | Execution | Initial Release? | License | Resource Footprint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ollama** | Local Model Inference | Local (Mac) | **Yes (Phase 4)** | MIT | 8GB Unified RAM |
| **Langflow** | Visual Graph Prototyping | Local / Self-hosted | No (Roadmap) | MIT | 4GB RAM |
| **n8n** | External Event Automations | Hybrid / Self-hosted | No (Roadmap) | Fair-code (Free CE) | 2GB RAM |
| **Dify** | Candidate Turnkey RAG Engine | Hybrid / Cloud | No (Roadmap) | Apache 2.0 (restricted) | 8GB RAM (Multi-container) |
| **AnythingLLM** | Candidate Document Store | Local (LanceDB) | No (Roadmap) | MIT | 4GB RAM |
| **CrewAI** | Multi-Agent Collaborative Tasks | Local Worker | No (Roadmap) | MIT | 4GB RAM |
| **ComfyUI** | Node-based Visual Generation | Local (Apple Silicon) | No (Roadmap) | GPL-3.0 | 16GB RAM + 20GB Disk |
| **LibreChat** | Reference Architecture | Reference Only | Reference Only | MIT | N/A (AMAHAS is the UI) |

---

## 3. Detailed Service Specifications

### 3.1 Ollama (Local Model Inference)
- **Specific Capability**: Executes quantized open models (Llama 3.2, Qwen 2.5, DeepSeek R1) locally on Apple Silicon Metal with zero token cost and 100% data privacy.
- **Execution Mode**: Local only (`http://localhost:11434`).
- **API & Authentication**: Native `/api/chat` or OpenAI-compatible `/v1/chat/completions`. No authentication needed on loopback; access restricted to local machine.
- **Resource Requirements**: 8GB unified RAM (for 3B–8B parameter models); 2.5GB to 5GB disk per model.
- **Security Boundary**: Strict loopback isolation (`127.0.0.1`). Unauthenticated Ollama daemon must never be exposed directly to the public internet.
- **Failure Mode**: When offline, AMAHAS automatically falls back to OpenRouter free cloud tier without interrupting the conversation.
- **Release Status**: **Active (Phase 4)**.

### 3.2 Langflow (Visual AI Workflows & Prototyping)
- **Specific Capability**: Visual graph editor for testing multi-step prompts, conditional branches, and agent memory chains without writing code.
- **Execution Mode**: Local or developer machine.
- **API & Authentication**: REST endpoint (`/api/v1/run/<flow_id>`) with Bearer API tokens.
- **Resource Requirements**: 4GB RAM, Python 3.10+ virtual environment.
- **Security Boundary**: Sandboxed workflow execution. Flows cannot access filesystem outside their designated workspace.
- **Failure Mode**: Timeout reverts to built-in local heuristics.
- **Release Status**: Disabled. Reserved for future complex research chain authoring.

### 3.3 n8n (External Automations & Webhooks)
- **Specific Capability**: Connects student events (e.g., exam dates, syllabus updates, task completions) to external services (Google Calendar, GitHub issues, Discord notifications).
- **Execution Mode**: Hybrid (Self-hosted Community Edition on local Docker or free cloud instance).
- **API & Authentication**: Webhook URL with secret token verification; n8n API Key (`X-N8N-API-KEY`).
- **Resource Requirements**: 2GB RAM, Node.js runtime.
- **Security Boundary**: Outbound webhook calls only. Assistant model cannot alter workflow definitions or access n8n credentials.
- **Failure Mode**: Webhook failures log to `AuditEvent` table and retry with exponential backoff.
- **Release Status**: Disabled until user configures webhook URLs in Settings.

### 3.4 Dify (Candidate Enterprise RAG Platform)
- **Specific Capability**: Turnkey document ingestion, chunking, and semantic vector indexing across multi-megabyte lecture slides and course textbooks.
- **Execution Mode**: Remote or multi-container local stack.
- **API & Authentication**: REST API (`/v1/chat-messages`) with App Bearer tokens.
- **Resource Requirements**: 8GB+ RAM, Docker Compose stack (Redis, PostgreSQL, Celery, Vector DB).
- **Security Boundary**: Data isolation per user; prompt injection filters on retrieved chunks.
- **Failure Mode**: Fallback to local Prisma note search and Wikipedia/arXiv connectors.
- **Release Status**: Disabled to preserve ₹0 infrastructure budget. Built-in Prisma search serves current scale.

### 3.5 AnythingLLM (Candidate Document Knowledge Engine)
- **Specific Capability**: All-in-one local document chat tool with embedded LanceDB vector database.
- **Execution Mode**: Local desktop or single lightweight container.
- **API & Authentication**: REST API with developer API key.
- **Resource Requirements**: 4GB RAM, 2GB disk.
- **Security Boundary**: Operates entirely offline; no external data egress.
- **Failure Mode**: Returns direct LLM response with citation warning.
- **Release Status**: Evaluated alongside Dify. Only one document vector service will be activated to prevent duplicate indexing.

### 3.6 CrewAI (Specialized Multi-Agent Task Orchestration)
- **Specific Capability**: Collaborative role-playing agents (e.g. "Literature Reviewer", "Code Auditor", "Study Planner") that coordinate sequentially to produce structured deliverables.
- **Execution Mode**: Local worker process running on student machine.
- **API & Authentication**: Internal message queue or REST bridge with JWT tokens.
- **Resource Requirements**: 4GB RAM, uses local Ollama or OpenRouter as LLM backend.
- **Security Boundary**: Strict loop limits (maximum 5 iterations per crew); sandboxed execution with student confirmation for all external tools.
- **Failure Mode**: Terminates on maximum steps and presents interim findings.
- **Release Status**: Disabled for Phase 1.

### 3.7 ComfyUI (Optional Local Image Generation)
- **Specific Capability**: Generates study flashcard diagrams, concept maps, and visual illustrations via local Stable Diffusion / Flux checkpoints.
- **Execution Mode**: Local only on high-spec hardware.
- **API & Authentication**: WebSocket & REST (`/prompt`, `/view`). Loopback only.
- **Resource Requirements**: 16GB+ unified RAM (Apple Silicon M2/M3/M4 or dedicated Nvidia GPU).
- **Security Boundary**: Strictly local. Model cannot download external arbitrary `.ckpt` or `.safetensors` files without explicit approval.
- **Failure Mode**: Fallback to SVG or Mermaid text diagrams.
- **Release Status**: Optional developer utility.

### 3.8 LibreChat (Reference Architecture)
- **Specific Capability**: Architecture reference for multi-modal artifacts, tool-calling UI patterns, and code execution sandbox standards.
- **Execution Mode**: Reference only.
- **Role**: **NOT deployed as a second frontend.** AMAHAS is the primary student operating system.
- **Release Status**: Reference pattern only.

---

## 4. Integration Trade-offs & Recommendations

To maintain the strict ₹0 infrastructure goal and avoid redundant services:

1. **LLM Orchestration**:
   - Use AMAHAS built-in `AIGateway` + `providerManager` (Phase 4). Do not deploy Langflow or Dify until complex multi-step pipelines are required.
2. **Document Q&A**:
   - Use built-in Prisma search, Wikipedia, and arXiv connectors for Phase 1. Deploy AnythingLLM only if textbook volume exceeds 500+ pages.
3. **Automations**:
   - Use built-in `automations-engine.ts` for internal triggers. Use n8n only for external webhooks (e.g. Google Calendar sync).

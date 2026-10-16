# AMAHAS Student OS — Comprehensive System Architecture Report

**Document Version:** 1.0.0  
**Auditor / Architect:** Principal Systems Architect  
**Scope:** Structural Topology, Component Interconnects, AI Orchestration, Security Invariants, and Performance Engineering  
**Repository:** `/Users/kishore/Downloads/AI PA`  

---

## 1. System Overview & Architectural Invariants

AMAHAS (Autonomous Multimodal Holographic Assistant System) is architected as an **offline-resilient, hybrid edge-local personal computing platform** designed to provide zero-cost, enterprise-grade AI productivity for technical students and researchers.

### Key Architectural Invariants:
1. **₹0 Infrastructure Footprint:** Zero paid cloud subscriptions required. Runs seamlessly on local hardware (Ollama, SQLite/PostgreSQL) and zero-cost cloud tiers (Vercel Edge, OpenRouter free models, public academic APIs).
2. **Tenancy & Data Sovereignty:** Complete single-user or tenant isolation. Personal academic records, focus telemetry, and private notes never egress beyond user-controlled boundaries.
3. **Intent Isolation Guard:** Application mutation tools (modifying syllabus, creating tasks, clearing logs) are strictly separated from open web research tools. General inquiries and academic modifications never inadvertently trigger uncontrolled web searches.
4. **Deterministic Client Compute:** Audio synthesis (binaural frequencies, brown noise, notification chimes), hourly quote rotation, and SM-2 interval calculations are computed deterministically in the client runtime without unnecessary server roundtrips.

---

## 2. High-Level Architecture & Mermaid Diagrams

### 2.1 System Context Diagram (C4 Level 1)

```mermaid
flowchart TD
    User([Kishore / Student User])

    subgraph AMAHAS_OS [AMAHAS Student OS Platform]
        UI[Next.js 15 App Shell & 3D Stage]
        CoreAPI[Next.js Route Handlers / API Gateway]
        LocalDB[(Prisma PostgreSQL / SQLite DB)]
    end

    subgraph Local_Daemons [Localhost Services]
        OllamaDaemon[Ollama Local LLM Daemon :11434]
    end

    subgraph External_Cloud [Zero-Cost Cloud APIs]
        OpenRouter[OpenRouter Free Tier Models]
        ArXivAPI[arXiv Academic Search XML API]
        OpenAlexAPI[OpenAlex Literature JSON API]
    end

    User <-->|Mouse, Keyboard, Mic, WebGL| UI
    UI <-->|Fetch REST / Server Actions| CoreAPI
    CoreAPI <-->|SQL Queries via Prisma ORM| LocalDB
    CoreAPI <-->|Local REST API| OllamaDaemon
    CoreAPI <-->|Secure HTTPS with API Key| OpenRouter
    CoreAPI <-->|Public Literature Query| ArXivAPI
    CoreAPI <-->|Public Metadata Query| OpenAlexAPI
```

---

### 2.2 Container & Component Diagram (C4 Level 2/3)

```mermaid
flowchart LR
    subgraph Browser_Runtime [Browser Client Runtime]
        direction TB
        AppShell[AppShell & Nav System]
        AvatarCanvas[Three.js R3F 3D Character Canvas]
        BehaviorEngine[Autonomous Behavior Controller]
        WebAudioEngine[Web Audio Binaural & Chime Synthesizer]
        StateStores[React State & LocalStorage Cache]
        MarkdownEngine[MarkdownLatexRenderer / KaTeX]
    end

    subgraph Next_Backend [Next.js Server Runtime]
        direction TB
        AuthResolver[Auth & Session Token Resolver]
        IntentRouter[Deterministic Intent Router]
        ToolsRegistry[Application & Research Tools Registry]
        AIGateway[Hybrid AI Gateway Orchestrator]
        AutomationEngine[Automations Engine & Step Tracing]
        SpacedRepEngine[SM-2 Spaced Repetition Calculator]
    end

    subgraph Storage_Layer [Persistence Layer]
        PrismaClient[Prisma Client ORM]
        Database[(PostgreSQL / SQLite Database)]
    end

    AppShell --> AuthResolver
    AvatarCanvas <--> BehaviorEngine
    BehaviorEngine --> StateStores
    AppShell --> WebAudioEngine
    AppShell --> MarkdownEngine

    AppShell --> IntentRouter
    IntentRouter --> AIGateway
    AIGateway --> ToolsRegistry
    ToolsRegistry --> PrismaClient
    AutomationEngine --> PrismaClient
    SpacedRepEngine --> PrismaClient
    AuthResolver --> PrismaClient
    PrismaClient <--> Database
```

---

### 2.3 AI Intent Classification & Tool Execution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Student (Kishore)
    participant UI as Assistant UI & 3D Stage
    participant Engine as Autonomous Behavior Engine
    participant Router as Intent Router
    participant Gateway as AI Gateway
    participant Registry as Tools Registry
    participant DB as Prisma Database

    User->>UI: Types: "Add a task to review Nyquist plots"
    UI->>Engine: Signal event: USER_SUBMIT
    Engine->>UI: Trigger avatar clip: "thinking"
    UI->>Router: POST /api/assistant (prompt, context)
    
    Router->>Router: Classify Intent: application_action
    Note over Router: Enforces tool filtering:<br/>Application tools included.<br/>Research tools EXCLUDED.

    Router->>Gateway: Forward with bounded tool schemas
    Gateway->>Gateway: Select Provider (Ollama or OpenRouter)
    Gateway-->>UI: Return Tool Call: create_task(title="Review Nyquist plots")

    UI->>Engine: Signal event: TOOL_PENDING
    Engine->>UI: Trigger avatar clip: "pointing"
    UI->>User: Display Pending Confirmation Card
    
    User->>UI: Clicks "Confirm Execution"
    UI->>Engine: Signal event: USER_CONFIRM
    UI->>Registry: Execute create_task(title="Review Nyquist plots")
    Registry->>DB: prisma.task.create(...)
    DB-->>Registry: Created Task Record (ID, status)
    Registry-->>UI: Success Payload & Confirmation Toast
    
    UI->>Gateway: Request synthesis response with tool result
    Gateway-->>UI: "I have added 'Review Nyquist plots' to your Tasks list."
    UI->>Engine: Signal event: ASSISTANT_SPEAK
    Engine->>UI: Trigger avatar clip: "speaking" (speech synthesis)
    Engine->>UI: Transition after delay to "idle"
```

---

### 2.4 Cross-Section Data Flow Diagram

```mermaid
flowchart TD
    subgraph Academics_Pipeline [Academics & Study Pipeline]
        Course[Course / Syllabus Tree] -->|Selected for Revision| Topic[Syllabus Topic]
        Topic -->|Due for Practice| SM2[SM-2 Spaced Repetition Engine]
        SM2 -->|Updates Interval & Date| RevisionRecord[Revision Record]
        Topic -->|Scheduled as Study Block| TimeBlock[Planner Time Block]
    end

    subgraph Deep_Work_Pipeline [Deep Work & Productivity]
        TimeBlock -->|Initiates Focus| FocusSession[Focus Session 45m]
        Task[Task Item] -->|Tracked during Focus| FocusSession
        FocusSession -->|Calculates Base + Bonuses| XPEngine[Gamified XP & Streak Engine]
        XPEngine -->|Increments Rank & Streak| Analytics[Productivity Analytics]
    end

    subgraph Knowledge_Pipeline [Knowledge Synthesis & Graph]
        ResearchQuery[Literature Query] -->|arXiv / OpenAlex API| Paper[Research Paper]
        Paper -->|One-Click BibTeX| Note[Markdown Note with Backlinks]
        Note -->|Bidirectional Links| GraphEngine[3D Force-Directed Graph Engine]
        Course -->|Curriculum Nodes| GraphEngine
        Paper -->|Citation Nodes| GraphEngine
    end

    subgraph Autonomous_Feedback [Autonomous Assistant & Automations]
        Analytics -->|Read by Assistant| AssistantContext[Assistant Context Memory]
        RevisionRecord -->|Triggers Alert| AutomationRules[Automations Engine]
        AutomationRules -->|Generates Notification| UserNotifications[In-App & Audio Chimes]
    end
```

---

### 2.5 Automation Trigger & Execution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Event as Trigger Event (e.g. FOCUS_COMPLETED)
    participant Engine as Automations Engine
    participant Condition as Condition Evaluator
    participant Actions as Action Executor
    participant DB as Prisma Database
    participant Trace as Execution Trace Drawer

    Event->>Engine: evaluateTriggers(type="FOCUS_COMPLETED", payload)
    Engine->>DB: Fetch active automations for trigger
    DB-->>Engine: List of enabled rules

    loop For each enabled automation
        Engine->>Condition: Evaluate conditions (e.g. durationMinutes >= 45)
        alt Conditions Met
            Condition-->>Engine: Status: PASSED
            Engine->>Actions: Execute step sequence (Actions Pipeline)
            Actions->>DB: Step 1: Create Spaced Repetition Reminder
            Actions->>DB: Step 2: Write Notification Record
            Actions-->>Engine: Step Results & Duration (ms)
            Engine->>DB: Insert AutomationExecution (status="SUCCESS", traceJson)
        else Conditions Not Met
            Condition-->>Engine: Status: SKIPPED
            Engine->>DB: Insert AutomationExecution (status="SKIPPED", traceJson)
        end
    end

    Engine->>Trace: Stream execution results to UI Drawer
```

---

### 2.6 Deployment & Hybrid Cloud/Local Topology

```mermaid
flowchart TD
    subgraph Client_Tier [Client Device (Mac / Laptop / Mobile)]
        Browser[Modern Web Browser - Chrome / Safari / Edge]
        R3F[WebGL Three.js Canvas - Silver 3D Avatar]
        Audio[Web Audio API - Binaural & Alarm Synthesis]
        Speech[Web Speech API - Native STT & TTS]
    end

    subgraph Edge_Cloud [Cloud Edge Tier - Vercel Serverless (₹0)]
        EdgeRoutes[Next.js 15 App Router Endpoints]
        IntentModule[Intent Routing & Parameter Validator]
        ToolsBridge[Application Action Execution Bridge]
    end

    subgraph Cloud_Services [Free Cloud Providers (₹0)]
        OpenRouterGateway[OpenRouter Free Tier Models]
        arXivEdge[arXiv XML Search API]
        OpenAlexEdge[OpenAlex Literature JSON API]
        PostgresCloud[(Supabase / Neon Free PostgreSQL)]
    end

    subgraph Local_Node [Local Machine Sidecar (Optional ₹0)]
        OllamaLocal[Local Ollama Daemon :11434]
        LocalLLM[Llama 3.2 / Qwen 2.5 Coder]
        LocalSQLite[(Local SQLite Database)]
    end

    Browser <-->|HTTP/2, WebSockets| EdgeRoutes
    Browser <-->|Direct Localhost CORS| OllamaLocal
    EdgeRoutes <-->|Direct Database Connection Pool| PostgresCloud
    EdgeRoutes <-->|Bearer Token Auth| OpenRouterGateway
    EdgeRoutes <-->|Public Search Queries| arXivEdge
    EdgeRoutes <-->|Public Literature Requests| OpenAlexEdge
    EdgeRoutes -.->|Local Development Mode| LocalSQLite
    OllamaLocal <--> LocalLLM
```

---

## 3. Technology Stack Specification

| Tier / Subsystem | Primary Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js App Router | 15.2.x | High-performance React framework with server-side API handlers and client bundling. |
| **UI Library** | React | 19.x | Component lifecycle, modern transitions (`useTransition`), and hooks. |
| **Styling & Design System** | Tailwind CSS | 3.4.x | Utility-first CSS engine powering 24 WCAG AA themes and responsive containers. |
| **3D Rendering & Animation** | Three.js / React Three Fiber | 0.170.x | WebGL rendering of the rigged Silver avatar and 3D Force-Directed Knowledge Graph. |
| **Icons & Visual Language** | Lucide React | 0.470.x | Crisp, unified SVG iconography across all 18 modules. |
| **Database ORM** | Prisma Client & CLI | 6.4.x | Type-safe SQL schema definitions, database migrations, and relational modeling. |
| **Math & LaTeX Rendering** | KaTeX | 0.16.x | Fast, browser-native math formula rendering for academic and engineering formulas. |
| **Audio Synthesis** | Web Audio API | W3C Standard | Zero-bandwidth client-side synthesis for binaural beats, brown noise, and alarm chimes. |
| **AI Client SDK** | Native Fetch + Custom Gateway | ES2023 | Resilient AI gateway supporting streaming, model autodiscovery, and fallback tiers. |
| **Test Runner** | Node.js Native Test Runner | `node --test` | Zero-dependency, ultra-fast test execution (429ms for 68 unit/integration tests). |

---

## 4. Security Architecture & Threat Modeling

1. **Strict Input Sanitization & Entity Decoding:**
   - User inputs and LLM outputs are processed through [`src/lib/format-utils.ts`](file:///Users/kishore/Downloads/AI%20PA/src/lib/format-utils.ts).
   - Prevents stored XSS, script injection, and raw HTML entity corruption (`&amp;`, `&lt;`, `&gt;`).
2. **Deterministic Intent Isolation:**
   - Requests categorized as `application_action` or `application_query` only receive schemas from `APPLICATION_TOOLS`.
   - `RESEARCH_TOOLS` (`search_web`, `fetch_webpage_content`) are quarantined and never passed during personal data operations.
3. **Destructive Action Confirmation Guard:**
   - Every mutating tool in `src/lib/tools-registry.ts` is explicitly flagged with `isDestructive: true`.
   - Execution requires an explicit user confirmation signature (`callId`, `idempotencyKey`) before the API executes the mutation.
4. **Data Tenancy & Export Integrity:**
   - Multi-tenant query scoping ensures all read and write queries enforce `where: { userId }`.
   - The export endpoint (`src/app/api/export/route.ts`) strips password hashes and session tokens before delivering user archive payloads.

---

## 5. Technical Debt & Performance Audit

1. **3D Asset Footprint:**
   - Character asset `/assets/character/silver.glb` is ~8.4 MB. While acceptable on broadband, low-bandwidth mobile connections experience an initial 1.5s loading duration.
   - *Recommendation:* Compress mesh using Draco or meshopt compression to reduce file size to ~2.2 MB.
2. **Knowledge Graph Computational Complexity:**
   - Force simulation runs in the UI thread. As graph size approaches 2,000 nodes, frame rate drops during initial layout calculation.
   - *Recommendation:* Offload iterative Verlet integration steps to a background Web Worker.
3. **Database Indexing Optimization:**
   - Frequent relational queries on `Task.userId` and `FocusSession.userId` are indexed. Adding composite indexes on `[userId, createdAt]` will further improve query performance as history grows.

# AMAHAS — Integration Architecture & Connectors

## 1. Unified Connector Interface
All external services adhere to the standard connector contract:
```typescript
export interface IntegrationConnector {
  id: string;
  name: string;
  category: 'ai' | 'research' | 'knowledge' | 'tasks' | 'automation' | 'calendar';
  description: string;
  isConfigured: (userId: string) => Promise<boolean>;
  testConnection: (userId: string, credentials: any) => Promise<{ success: boolean; message: string }>;
  sync?: (userId: string) => Promise<{ syncedCount: number; errors?: string[] }>;
}
```

---

## 2. Supported Connectors & Protocols

### 2.1 AI Model Gateway — OpenRouter
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Default / Free Model**: `openrouter/free` (or free routing candidates like `google/gemini-2.0-flash-exp:free`, `meta-llama/llama-3.3-70b-instruct:free`).
- **Safety**: Paid models are blocked unless explicitly configured in user preferences. Keys are stored server-side only.

### 2.2 Local Inference — Ollama
- **Endpoint**: Configurable, defaults to `http://localhost:11434`
- **Endpoints Used**: `/api/tags` (model listing) and `/api/chat`
- **Privacy Mode**: All data remains 100% on localhost when local inference is active.

### 2.3 Research Discovery — OpenAlex
- **Endpoint**: `https://api.openalex.org/works`
- **Protocol**: Direct REST API with polite user-agent mailto header. Returns DOI, title, authors, abstracts, publication years.

### 2.4 Research Discovery — arXiv
- **Endpoint**: `http://export.arxiv.org/api/query`
- **Protocol**: Atom/XML search query parsing into structured research papers.

### 2.5 Knowledge Base — Wikipedia & Wikidata
- **Endpoint**: `https://en.wikipedia.org/w/api.php`
- **Protocol**: MediaWiki action API for encyclopedic summaries and source attribution.

### 2.6 Automation Engine — n8n
- **Protocol**: Webhook dispatch and REST execution status check. External workflows can be triggered on student events.

### 2.7 Task Management — Vikunja & GitHub
- **Protocol**: Vikunja API v2 token authentication and GitHub Personal Access Token for issue/repo synchronization.

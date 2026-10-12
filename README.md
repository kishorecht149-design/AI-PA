# AMAHAS — Autonomous Multimodal Holographic Assistant System
### *The Intelligent Personal Operating System for Students*

AMAHAS is a unified, production-quality personal operating system built for students balancing academic coursework, competitive examination preparation (GATE/ESE), technical systems research, multi-language acquisition, personal knowledge management, and disciplined habit execution.

---

## 🌟 Key Subsystems & Workspaces

1. **Minimal, Serene Home (`/`)**:
   - Welcome greeting changing with the time of day.
   - Deterministic hourly inspirational message and verified quotation (stable throughout the hour, updates without page refresh).
   - Frictionless command & search bar (`⌘K`).
   - Clean workspace directory without cluttered dashboards.
2. **Planner & Time Blocking (`/planner`)**:
   - Day, Week, Month, and Agenda views.
   - Conflict detection engine for overlapping blocks.
   - Unscheduled task backlog with single-click slot scheduling.
   - AI-assisted schedule synthesis with explicit student approval & preview.
3. **Tasks & Execution (`/tasks`)**:
   - Vikunja-inspired multi-perspective views: List, Kanban, and My Day.
   - Super Productivity focus timer integrating actual logged time directly into tasks.
   - Course, research, and project tags with priority hierarchies.
4. **Academics & GATE/ESE Engine (`/academics`)**:
   - Hierarchical course unit & topic syllabus tracker.
   - Active recall drilling powered by the **SuperMemo SM-2 Spaced Repetition Algorithm**.
   - GATE Computer Science subject weightage and diagnostic readiness score.
5. **Research Lab (`/research`)**:
   - Live research literature discovery integrating **arXiv API** and **OpenAlex API**.
   - Paper repository with DOI, BibTeX, and key takeaway annotations.
   - Experiment tracking with configurations, evaluated metrics, and reproducibility logs.
6. **Learning Studio (`/learning`)**:
   - **8-Language Acquisition (`/learning/languages`)**: German, Japanese, Spanish, French, Sanskrit, Mandarin, Russian, Hindi with SM-2 flashcard drilling.
   - **General Knowledge (`/learning/knowledge`)**: MediaWiki/Wikipedia live concept lookup.
   - **Reading & Audiobooks (`/learning/reading`)**: Reading progress and audiobook tracking.
   - **Cognitive Psychology (`/learning/psychology`)**: Empirical deliberate practice models with strict educational boundaries.
   - **Philosophy & Spirituality (`/learning/spirituality`)**: Stoic, Vedantic, and classical epistemological inquiry.
7. **Notes & Knowledge Base (`/notes`)**:
   - AppFlowy-inspired Markdown notes with bidirectional course and project links.
   - Live preview toggle, pinned items, full-text search, and Markdown export (`.md`).
8. **Habits & Goals (`/habits`, `/goals`)**:
   - Flexible daily habits with non-punitive streak tracking and reflections.
   - Long-term OKR milestones with visual progress bars.
9. **Analytics & Guided Reviews (`/analytics`)**:
   - Measured actual vs. estimated focus hours.
   - Guided Daily/Weekly Review Wizard based on honest productivity tracking.
10. **Personal AI Assistant (`/assistant`)**:
    - **OpenRouter Free Model Gateway** (prioritizing `openrouter/free`, Llama 3.3 70B, Gemini 2.0 Flash) and local **Ollama** fallback.
    - 9+ typed application tools with strict permission boundaries (read-only tools auto-execute; mutating tools require student approval).
    - Web Speech API speech-to-text voice input & text-to-speech voice output.
    - User-approved AI Memory inspector with one-click deletion.
11. **Integrations Hub (`/integrations`)**:
    - Modular connector architecture: OpenRouter, Ollama, OpenAlex, arXiv, Wikipedia, Vikunja, n8n, GitHub.
    - Real connection verification, credentials management, and sync logs.
12. **Automations Engine (`/automations`)**:
    - Internal event-driven workflow engine (e.g. Study Session Finished -> Update Task -> Recalculate SM-2 Interval -> Update Analytics).
    - Manual test execution and execution audit logs.
13. **Settings & Data Portability (`/settings`)**:
    - Working hours, study buffers, and time zone configurations.
    - 100% portable JSON export of all student data (`/api/export`).

---

## 🛠️ Technology Stack
- **Framework**: Next.js 15 (App Router) + TypeScript + React 19
- **Styling**: Tailwind CSS (Dark-first Midnight Navy `#070b14` with electric cyan `#00e5ff` and violet `#a855f7` accents)
- **Database & ORM**: SQLite (`file:./dev.db`) + Prisma ORM (28 normalized entities)
- **Icons & UI**: Lucide React, accessible HTML5 semantic elements

---

## 🚀 Quickstart & Setup

### 1. Installation
```bash
npm install
```

### 2. Database Synchronization & Seeding
```bash
# Push Prisma schema to local SQLite database
npm run db:push

# Seed with rich, realistic engineering student records
npm run db:seed
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Default Student Login Credentials:**
- Email: `student@amahas.internal`
- Password: `password123`

---

## 🧪 Automated Verification
AMAHAS includes automated unit and integration tests:
- `tests/sm2.test.mjs`: Mathematical validation of the SuperMemo SM-2 algorithm.
- `tests/quotes.test.mjs`: Deterministic hourly stability and date calculation.
- `tests/auth.test.mjs`: Cryptographic PBKDF2 password hashing and session tokens.
- `tests/tools.test.mjs`: Application tools schema validation and mutation permission checks.

---

## 📖 Architecture & Documentation
Detailed architectural and system specifications are located in `/docs`:
- `docs/architecture.md` — System architecture and reference product UX analysis (Vikunja, AppFlowy, Super Productivity, n8n).
- `docs/database.md` — Complete relational schema and entity dictionary.
- `docs/design-system.md` — Color tokens, typography, and mobile responsive layout specs.
- `docs/integrations.md` — Connector contracts and supported external protocols.
- `docs/security.md` — Authentication, session cookies, and AI safety boundaries.
- `docs/testing.md` — Test execution and critical workflow verification matrix.
- `docs/deployment.md` — Production build and rollback procedures.

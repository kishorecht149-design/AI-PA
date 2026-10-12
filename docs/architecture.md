# AMAHAS — System Architecture & Reference Product Analysis

## Autonomous Multimodal Holographic Assistant System
*The Intelligent Personal Operating System for Students*

---

## 1. Executive Summary & Mission
AMAHAS is an integrated personal operating system designed for students balancing engineering coursework, competitive examination preparation (GATE/ESE), technical research, multi-language acquisition, personal knowledge management, and disciplined habit execution.

Rather than fragmenting student workflow across disparate productivity apps, AMAHAS provides a unified relational model connecting:
- **Tasks** to **Syllabus Units**, **Research Milestones**, and **Focus Sessions**
- **Syllabus Topics** to **Revision Schedules (SM-2 Spaced Repetition)** and **Error Logs**
- **Research Projects** to **Paper Libraries (OpenAlex / arXiv)** and **Reproducible Experiments**
- **Personal AI Assistant** to **Permission-Bounded Tool Calling** over user-owned records
- **Automations Engine** to **Event Triggers (n8n-compatible)** without external dependencies

---

## 2. Competitive UX Analysis & Pattern Adaptation

### 2.1 Vikunja (Task Management)
- **Reference**: [Vikunja Documentation](https://vikunja.io/docs/)
- **Strengths Adapted**:
  - Frictionless quick-capture task input.
  - Multi-perspective views: Kanban, List, Calendar, Gantt/Timeline, My Day, Overdue, and Unscheduled.
  - Granular task metadata: subtasks, dependencies, estimated duration, recurrence rules.
- **Drawbacks Avoided**:
  - Isolation from academic curricula and research milestones.
  - Rigid separation between tasks and time blocks.
- **AMAHAS Adaptation**:
  - Tasks can be linked directly to Courses, Syllabus Topics, or Research Projects.
  - Integrated with focus sessions (Super Productivity model) where actual time automatically updates task duration and triggers spaced revision cycles.

### 2.2 AppFlowy (Knowledge & Workspace)
- **Reference**: [AppFlowy Documentation](https://docs.appflowy.io/docs)
- **Strengths Adapted**:
  - Relational notes connected to projects and resources.
  - Collections and flexible tagging.
  - Markdown-first editing with data portability.
- **Drawbacks Avoided**:
  - Desktop-only sync bottlenecks and heavy client overhead.
  - Unstructured document dumps without action items.
- **AMAHAS Adaptation**:
  - Notes include bidirectional links to Course Units, Research Experiments, and Tasks.
  - Exportable into standard portable Markdown and JSON structures with zero vendor lock-in.

### 2.3 Super Productivity (Execution & Honest Tracking)
- **Reference**: [Super Productivity](https://super-productivity.com/)
- **Strengths Adapted**:
  - Planned vs. actual time tracking.
  - Focus sessions with energy ratings and distraction counters.
  - Non-punitive daily and weekly reflection rituals.
- **Drawbacks Avoided**:
  - Conflating raw time spent with true subject mastery.
  - Complex configuration required for student syllabus structures.
- **AMAHAS Adaptation**:
  - Explicit separation between measured study duration and assessed conceptual confidence (1-5 scale and quiz scores).
  - Flexible streak handling that prevents guilt-based abandonment.

### 2.4 n8n (Automation Engine)
- **Reference**: [n8n Documentation](https://docs.n8n.io/)
- **Strengths Adapted**:
  - Event triggers, multi-step actions, execution history, and error logs.
- **Drawbacks Avoided**:
  - Hard dependency on heavy external server infrastructure for routine daily operations.
- **AMAHAS Adaptation**:
  - Internal native workflow engine executing deterministic student lifecycle automations (e.g. Study Session Completed -> Update Task -> Update Revision Schedule -> Log Analytics).
  - External n8n webhook and API adapter as an optional power-user connector.

---

## 3. Subsystem Breakdown

1. **Application Shell & Minimal Home**:
   - Clean, serene welcome surface (no overwhelming dashboard noise).
   - Deterministic hourly inspirational message and verified quote selection.
   - Command bar (`Cmd+K`) and direct workspace navigation.
2. **Planner & Time Blocking**:
   - Day, Week, Month, and Agenda scheduling.
   - Conflict-aware schedule proposals with user approval and undo capability.
3. **Academics & GATE/ESE Engine**:
   - Unit-topic syllabus hierarchy with SuperMemo SM-2 spaced repetition.
   - Question bank, mock test records, and weak-topic error tracking.
4. **Research Lab**:
   - OpenAlex and arXiv live discovery.
   - Structured experiment tracking (hypotheses, datasets, metrics, reproducibility).
5. **Learning Studio**:
   - 8-language vocabulary engine with Leitner flashcard review.
   - General knowledge, psychology (education-only boundary), philosophy, and reading.
6. **OpenRouter AI Gateway**:
   - Multi-provider abstraction prioritizing free models (`openrouter/free`).
   - Typed application tools with permission checks (read auto-allowed; write requires confirmation).
   - Local Ollama fallback.
7. **Automation & Integrations**:
   - Standardized connector interface with health status, credential encryption, and test actions.

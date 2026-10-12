# AMAHAS — Database Schema & Data Dictionary

## 1. Overview
AMAHAS utilizes a normalized relational data model managed via Prisma ORM. It supports:
- **Local Embedded Persistence**: SQLite (`file:./dev.db`) for zero-friction local development, offline functionality, and desktop-class speed.
- **Enterprise / Production**: Managed PostgreSQL (Supabase, Neon, AWS RDS) by configuring `DATABASE_URL`.

All user-owned models enforce strict user scoping (`userId` foreign key with cascade deletion).

---

## 2. Entity Relational Matrix (28 Core Entities)

| Category | Model Name | Primary Keys & Indexes | Core Purpose |
|---|---|---|---|
| **Identity & Config** | `User` | `id`, unique `email` | Authenticated account credential & relation anchor |
| | `Profile` | `id`, unique `userId` | Academic program, institution, exam focus |
| | `UserPreference` | `id`, unique `userId` | Theme, timezone, focus duration, AI models |
| **Execution** | `Task` | `id`, index `(userId, status, dueDate)` | Vikunja-inspired task entity with time tracking |
| | `Subtask` | `id`, index `taskId` | Granular action items |
| | `TaskDependency`| unique `(taskId, dependsOnTaskId)` | Graph-based DAG task prerequisites |
| | `Project` | `id`, index `(userId, status)` | High-level umbrella initiatives |
| | `Milestone` | `id`, index `projectId` | Checkpoints within projects |
| **Time & Planning** | `CalendarEvent` | `id`, index `(userId, startTime)` | Fixed calendar events and scheduled commitments |
| | `TimeBlock` | `id`, index `(userId, startTime)` | Flexible or fixed scheduled work blocks |
| | `FocusSession` | `id`, index `(userId, startTime)` | Pomodoro / focus intervals with energy ratings |
| **Academics** | `Course` | `id`, index `userId` | Academic courses and GATE/ESE subjects |
| | `SyllabusUnit` | `id`, index `courseId` | High-level course units/modules |
| | `SyllabusTopic` | `id`, index `(unitId, nextRevisionAt)` | Topic mastery & spaced-repetition schedules |
| | `RevisionRecord` | `id`, index `topicId` | SM-2 calculation logs (ease factor, interval) |
| | `QuizAttempt` | `id`, index `userId` | Diagnostic test outcomes and error breakdown |
| | `QuizQuestion` | `id`, index `topicId` | Practice questions with explanations |
| **Research Lab** | `ResearchProject`| `id`, index `userId` | Technical hypotheses, objectives, and venue targets |
| | `ResearchPaper` | `id`, index `(researchProjectId, doi)`| Bibliography with DOI/arXiv metadata |
| | `Citation` | `id`, index `paperId` | Cited references graph |
| | `Dataset` | `id`, index `researchProjectId` | Benchmark datasets & sample counts |
| | `Experiment` | `id`, index `researchProjectId` | Configurations, metrics, reproducibility logs |
| **Knowledge** | `NoteCollection`| `id`, index `userId` | Hierarchical folders/tags |
| | `Note` | `id`, index `(userId, isPinned)` | AppFlowy-style Markdown notes with backlinks |
| **Learning Studio** | `LearningModule` | `id`, index `(userId, category)` | Multi-language, psychology, GK, and philosophy |
| | `LearningItem` | `id`, index `moduleId` | Lessons, audio excerpts, and texts |
| | `VocabularyCard` | `id`, index `(userId, language)` | 8-language spaced repetition flashcards |
| | `Book` | `id`, index `(userId, status)` | Books and audiobooks tracker |
| **Habits & Goals** | `Habit` | `id`, index `userId` | Recurring habit definitions and streaks |
| | `HabitLog` | unique `(habitId, dateString)` | Daily check-in logs with reflections |
| | `Goal` | `id`, index `userId` | Strategic OKRs and long-term milestones |
| | `GoalMilestone` | `id`, index `goalId` | Measurable goal checkpoints |
| **Analytics** | `ProductivityReview` | index `(userId, periodType)` | Super Productivity-inspired daily/weekly reviews |
| **AI Layer** | `Conversation` | `id`, index `userId` | Chat sessions with model metadata |
| | `Message` | `id`, index `conversationId` | Chat messages with tool-invocation logs |
| | `AIMemory` | unique `(userId, key)` | User-approved contextual memory facts |
| **Integrations** | `IntegrationAccount` | unique `(userId, provider)`| Connector state, encrypted tokens, sync dates |
| | `SyncCursor` | unique `(integrationAccountId, type)`| Incremental sync tokens and cursor checkpoints |
| **Automations** | `Automation` | `id`, index `(userId, isEnabled)` | Event-driven workflow rules |
| | `AutomationExecution`| `id`, index `automationId` | Execution history, step payloads, and error logs |
| **System** | `Notification` | `id`, index `(userId, isRead)` | In-app alerts, deadline reminders |
| | `AuditEvent` | `id`, index `(userId, createdAt)` | Security and access audit trails |

---

## 3. Spaced Repetition Formula (SuperMemo SM-2)
For syllabus topics and language vocabulary, intervals are computed via:
$$EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$$
Where $q \in [1, 5]$ is user recall confidence, and $EF \ge 1.3$.
- If $q < 3$: repetitions reset to 0, next interval is 1 day.
- If $q \ge 3$:
  - Repetition 1: 1 day
  - Repetition 2: 6 days
  - Repetition $n$: $I(n-1) \times EF$ days.

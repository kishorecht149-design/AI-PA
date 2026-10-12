# AMAHAS — Testing Strategy & Verification Guide

## 1. Automated Test Suites
Run all automated tests via:
```bash
npm test
```
The test suite validates:
1. **SM-2 Spaced Repetition Algorithm**: Mathematical correctness of ease factor calculation, repetition resets, and interval escalation.
2. **Scheduling Conflict Detection**: Overlap detection between fixed commitments and proposed time blocks.
3. **Hourly Quote Determinism**: Deterministic quote and message selection across any 24-hour cycle.
4. **Tool Authorization Boundaries**: Read vs. mutating tool permission checks.
5. **Database CRUD & User Scoping**: Integrity of user-isolated operations.

---

## 2. End-to-End Workflow Verification Matrix

| Workflow | Key Steps | Verification Criteria |
|---|---|---|
| **A. Daily Planning** | Login -> Create Task -> Schedule Time Block -> Focus Timer -> Complete | Database reflects actual duration and updates status |
| **B. Academics** | Course -> Syllabus Topic -> Study Session -> Quiz -> SM-2 Schedule | Next revision date correctly calculated |
| **C. Research** | Project -> OpenAlex / arXiv Paper Search -> Add Experiment -> Follow-up Task | Citation metadata and experiment metrics preserved |
| **D. AI Assistant** | Ask AI to create task -> Propose tool call -> User confirms -> Task created | Task exists in database; UI updates without reload |
| **E. Integrations** | Test OpenRouter / Ollama / Wikipedia connectors | Status moves from NOT_CONFIGURED to CONNECTED |
| **F. Mobile** | Viewport 390px navigation -> Bottom nav -> Drawer | No horizontal scrollbars; forms accessible |

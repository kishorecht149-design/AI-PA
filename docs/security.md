# AMAHAS — Security & Privacy Architecture

## 1. Authentication & Session Security
- **Stateless & Resilient JWT / Session Cookies**: Signed with HMAC-SHA256 (`AUTH_SECRET`).
- **HTTPOnly, Secure, SameSite=Lax Cookies**: Preventing cross-site scripting (XSS) extraction of tokens.
- **Passwords**: Hashed via PBKDF2 with SHA512 (100,000 iterations and cryptographic salt) or bcrypt.
- **Multi-Tenant User Isolation**: Every database query scopes to `where: { userId: session.user.id }`.

---

## 2. AI Safety, Tool Authorization & Prompt Injection Mitigation
- **Untrusted Input Sanitation**: External web documents, arXiv abstracts, and user inputs are clearly delineated in system prompts.
- **Permission Boundaries**:
  - **Read Tools** (`search_tasks`, `get_course_progress`, `search_notes`): Executed with automatic authorization.
  - **Mutating Tools** (`create_task`, `reschedule_tasks`, `delete_record`): Require explicit user review and confirmation before database commit.
- **Zero Arbitrary Execution**: The AI assistant has zero access to arbitrary SQL or terminal execution. All actions map to typed, validated service methods.

---

## 3. Privacy & Data Portability
- **Self-Contained Data**: Full database export (JSON) available via Settings (`/settings`).
- **Complete Deletion**: User can initiate account and data wipe, removing all 28 entities via relational cascades.
- **No Third-Party Leakage**: Notes, papers, and personal logs are never transmitted to external AI providers unless the user initiates an explicit prompt targeting that context.

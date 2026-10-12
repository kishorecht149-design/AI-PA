# AMAHAS — Design System & Visual Specification

## 1. Design Principles
- **Quiet Clarity**: Simplicity at the surface; high-density capability underneath.
- **Dark-First Elegance**: Midnight navy backgrounds (`#070b14`, `#0b1120`, `#0f172a`) preventing visual fatigue during late-night study and coding sessions.
- **Accents with Purpose**: Electric cyan (`#00e5ff`) for primary actions and focus states; Indigo/Blue (`#3b82f6`) for information; Violet (`#a855f7`) for AI intelligence layer.
- **Responsive Adaptability**: Continuous fluidity from mobile viewports (390px) to ultrawide desktops (1440px+).

---

## 2. Color Tokens

| Token | Hex Value | Usage |
|---|---|---|
| `bg-primary` | `#070b14` (Deep Space) | Main canvas background |
| `bg-surface` | `#0b1120` (Midnight Navy) | Cards, panels, sidebars |
| `bg-surface-elevated` | `#0f172a` (Slate Deep) | Dialogs, dropdowns, hovered items |
| `border-subtle` | `rgba(255, 255, 255, 0.08)` | Dividers, card borders |
| `text-primary` | `#f8fafc` | Headings, active values, readable body |
| `text-secondary` | `#94a3b8` | Metadata, labels, secondary descriptions |
| `accent-cyan` | `#00e5ff` | Primary CTA, focus timer, active tab |
| `accent-blue` | `#3b82f6` | Tasks, progress indicators, links |
| `accent-violet` | `#a855f7` | Assistant avatar, AI suggestions, memory tags |
| `status-success` | `#10b981` | Completed tasks, passing mock exams |
| `status-warning` | `#f59e0b` | Upcoming deadlines, schedule conflicts |
| `status-danger` | `#ef4444` | Overdue items, error alerts |

---

## 3. Typography & Spacing
- Font family: Inter / system modern sans-serif (`font-sans`)
- Code / Metrics: JetBrains Mono / monospace (`font-mono`)
- Border radius: `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px)
- Shadows: Soft diffuse inner glow & deep elevation (`shadow-2xl shadow-cyan-950/20`)

---

## 4. Mobile Layout Architecture (390px - 768px)
- **Top Bar**: Minimal branding, quick search button, notification bell, profile trigger.
- **Bottom Navigation**: 5 high-frequency thumbs-reachable targets:
  1. Home (`/`)
  2. Planner (`/planner`)
  3. Tasks (`/tasks`)
  4. Academics (`/academics`)
  5. More (Trigger for drawer containing Research, Notes, Learning, AI Assistant, Settings)
- **No Horizontal Overflow**: All grids fold into single-column cards on screens `< 768px`.

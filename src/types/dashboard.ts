export type WidgetType =
  | "top_overview"
  | "attention_queue"
  | "next_activity"
  | "recent_work"
  | "weekly_pulse"
  | "today_tasks"
  | "habits_routine"
  | "active_projects"
  | "custom_sections";

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  column: "left" | "right";
  order: number;
  visible: boolean;
  title?: string;
  settings?: {
    limit?: number;
    showCompleted?: boolean;
    filterPriority?: string;
    compactView?: boolean;
    [key: string]: any;
  };
}

export interface DashboardLayoutConfig {
  desktopLayout: WidgetInstance[];
  mobileLayout: WidgetInstance[];
  dismissedAttentionIds: string[];
  personalization: {
    role?: string;
    interests?: string[];
    workingHoursStart?: string;
    workingHoursEnd?: string;
    dailyFocusTargetMinutes?: number;
  };
}

export interface AttentionItem {
  id: string;
  category: "conflict" | "deadline" | "overdue" | "unscheduled" | "revision" | "opportunity";
  severity: "high" | "medium" | "low";
  title: string;
  reason: string;
  actionLabel: string;
  actionType: "reschedule" | "complete" | "schedule_block" | "open_link" | "dismiss";
  actionPayload?: any;
  recordId?: string;
  recordType?: string;
  dismissible: boolean;
  link?: string;
}

export interface RecentWorkItem {
  id: string;
  type: "task" | "note" | "project" | "research" | "focus";
  title: string;
  subtitle?: string;
  updatedAt: string;
  href: string;
  status?: string;
  isPrimary?: boolean;
}

export interface NextActivityItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  isFixed: boolean;
  taskId?: string | null;
  taskTitle?: string | null;
  startsInMinutes: number;
  isOngoing: boolean;
}

export interface TaskSummary {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dueDate?: string | null;
  scheduledDate?: string | null;
  estimatedMinutes?: number | null;
  projectName?: string | null;
}

export interface DashboardOverviewData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  todaySummary: {
    greeting: string;
    dateString: string;
    situationSummary: string;
    focusMinutesToday: number;
    focusTargetMinutes: number;
    tasksDueTodayCount: number;
    tasksCompletedTodayCount: number;
    scheduledHoursToday: number;
    availableHoursToday: number;
    quote?: {
      quote: string;
      author: string;
    };
  };
  weeklyProgress: {
    tasksCompletedThisWeek: number;
    focusMinutesThisWeek: number;
    habitsCompletedToday: number;
    totalHabitsCount: number;
    activeGoalsCount: number;
    averageGoalProgressPct: number;
  };
  attentionItems: AttentionItem[];
  recentWork: RecentWorkItem[];
  nextActivity: NextActivityItem | null;
  todayTasks: TaskSummary[];
  customSections: any[];
  layout: DashboardLayoutConfig;
}

export const DEFAULT_DESKTOP_WIDGETS: WidgetInstance[] = [
  { id: "w-overview", type: "top_overview", column: "left", order: 0, visible: true, title: "Overview & Daily Horizon" },
  { id: "w-attention", type: "attention_queue", column: "left", order: 1, visible: true, title: "Needs Your Attention" },
  { id: "w-tasks", type: "today_tasks", column: "left", order: 2, visible: true, title: "Today's Focus Queue" },
  { id: "w-custom", type: "custom_sections", column: "left", order: 3, visible: true, title: "Curated Resource Folders" },
  { id: "w-next", type: "next_activity", column: "right", order: 0, visible: true, title: "Next Activity" },
  { id: "w-recent", type: "recent_work", column: "right", order: 1, visible: true, title: "Pick Up Where You Left Off" },
  { id: "w-pulse", type: "weekly_pulse", column: "right", order: 2, visible: true, title: "Weekly Progress" },
  { id: "w-habits", type: "habits_routine", column: "right", order: 3, visible: true, title: "Habits & Routine" },
  { id: "w-projects", type: "active_projects", column: "right", order: 4, visible: true, title: "Active Projects" },
];

export const DEFAULT_MOBILE_WIDGETS: WidgetInstance[] = [
  { id: "w-overview", type: "top_overview", column: "left", order: 0, visible: true, title: "Overview & Daily Horizon" },
  { id: "w-next", type: "next_activity", column: "left", order: 1, visible: true, title: "Next Activity" },
  { id: "w-attention", type: "attention_queue", column: "left", order: 2, visible: true, title: "Needs Your Attention" },
  { id: "w-recent", type: "recent_work", column: "left", order: 3, visible: true, title: "Pick Up Where You Left Off" },
  { id: "w-tasks", type: "today_tasks", column: "left", order: 4, visible: true, title: "Today's Focus Queue" },
  { id: "w-habits", type: "habits_routine", column: "left", order: 5, visible: true, title: "Habits & Routine" },
  { id: "w-pulse", type: "weekly_pulse", column: "left", order: 6, visible: true, title: "Weekly Progress" },
  { id: "w-projects", type: "active_projects", column: "left", order: 7, visible: true, title: "Active Projects" },
  { id: "w-custom", type: "custom_sections", column: "left", order: 8, visible: true, title: "Curated Resource Folders" },
];

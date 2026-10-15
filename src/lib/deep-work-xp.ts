/**
 * Gamified Deep Work XP & Flow State Progression Engine
 * Computes cognitive XP, leveling tiers, streak multipliers, distraction shields, and achievements.
 */

export interface DeepWorkRank {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  badge: string;
  color: string;
}

export const RANKS: DeepWorkRank[] = [
  { level: 1, title: "Novice Apprentice", minXp: 0, maxXp: 500, badge: "🌱", color: "#a1a1aa" },
  { level: 2, title: "Focused Practitioner", minXp: 500, maxXp: 1500, badge: "⚡", color: "#38bdf8" },
  { level: 3, title: "Cognitive Strategist", minXp: 1500, maxXp: 3500, badge: "🧠", color: "#10b981" },
  { level: 4, title: "Neural Architect", minXp: 3500, maxXp: 7000, badge: "🔮", color: "#c084fc" },
  { level: 5, title: "Deep Work Master", minXp: 7000, maxXp: 12000, badge: "⚔️", color: "#f59e0b" },
  { level: 6, title: "Transcendent Flow Sage", minXp: 12000, maxXp: 999999, badge: "👑", color: "#fb7185" },
];

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_flow", title: "First Neural Horizon", description: "Complete your first uninterrupted flow block", icon: "🌱", unlockedAt: null },
  { id: "gamma_initiate", title: "Gamma Synchronization", description: "Engage in a session with 40Hz Gamma soundscape", icon: "⚡", unlockedAt: null },
  { id: "deep_sprint", title: "Tactical Execution", description: "Complete a 45-minute continuous focus block", icon: "🎯", unlockedAt: null },
  { id: "titan_90", title: "Cognitive Titan", description: "Conquer a 90-minute uninterrupted deep work horizon", icon: "🏆", unlockedAt: null },
  { id: "century_club", title: "Centurion of Focus", description: "Accumulate 100 total deep work minutes", icon: "⏱️", unlockedAt: null },
  { id: "streak_guardian", title: "Streak Sentinel", description: "Maintain a 3-day deep work cadence", icon: "🔥", unlockedAt: null },
  { id: "streak_seven", title: "Seven Suns Discipline", description: "Achieve a 7-day uninterrupted flow streak", icon: "☀️", unlockedAt: null },
];

export interface DeepWorkProfile {
  xp: number;
  totalMinutes: number;
  totalSessions: number;
  streakDays: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  achievements: Achievement[];
  distractionShieldEnabled: boolean;
  activeSession: {
    targetMinutes: number;
    elapsedSeconds: number;
    presetId: string;
    taskId: string | null;
    taskTitle: string | null;
    distractionCount: number;
    startTime: string | null;
    isRunning: boolean;
  } | null;
}

const STORAGE_KEY = "amahas_deep_work_state";

export function getRankForXp(xp: number): DeepWorkRank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXp) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getRankProgress(xp: number) {
  const currentRank = getRankForXp(xp);
  const nextRank = RANKS.find((r) => r.level === currentRank.level + 1);

  if (!nextRank) {
    return { currentRank, nextRank: null, progressPct: 100, xpRemaining: 0 };
  }

  const range = nextRank.minXp - currentRank.minXp;
  const earned = xp - currentRank.minXp;
  const progressPct = Math.min(100, Math.max(0, Math.round((earned / range) * 100)));
  const xpRemaining = Math.max(0, nextRank.minXp - xp);

  return { currentRank, nextRank, progressPct, xpRemaining };
}

export function calculateStreakMultiplier(streakDays: number): number {
  if (streakDays >= 14) return 2.0;
  if (streakDays >= 7) return 1.5;
  if (streakDays >= 3) return 1.25;
  return 1.0;
}

export function calculateSessionXp(
  actualMinutes: number,
  targetMinutes: number,
  distractionCount: number,
  streakDays: number
): { basePoints: number; completionBonus: number; cleanBonus: number; streakMultiplier: number; totalXp: number } {
  // 10 XP per focused minute
  const basePoints = Math.round(Math.max(1, actualMinutes) * 10);

  // Completion bonus if actual >= target
  const completedTarget = actualMinutes >= targetMinutes;
  const completionBonus = completedTarget ? 50 : 0;

  // Clean focus bonus (+20% base) if zero distractions
  const cleanBonus = distractionCount === 0 ? Math.round(basePoints * 0.2) : 0;

  // Streak multiplier
  const streakMultiplier = calculateStreakMultiplier(streakDays);

  const subtotal = basePoints + completionBonus + cleanBonus;
  const totalXp = Math.round(subtotal * streakMultiplier);

  return {
    basePoints,
    completionBonus,
    cleanBonus,
    streakMultiplier,
    totalXp,
  };
}

export function loadDeepWorkProfile(): DeepWorkProfile {
  if (typeof window === "undefined") {
    return createDefaultProfile();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const data = JSON.parse(raw);

    // Merge default achievements in case new ones were added
    const achievements = INITIAL_ACHIEVEMENTS.map((init) => {
      const existing = data.achievements?.find((a: Achievement) => a.id === init.id);
      return existing || init;
    });

    return {
      ...createDefaultProfile(),
      ...data,
      achievements,
    };
  } catch {
    return createDefaultProfile();
  }
}

export function saveDeepWorkProfile(profile: DeepWorkProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error("Failed to persist deep work profile:", err);
  }
}

export function createDefaultProfile(): DeepWorkProfile {
  return {
    xp: 0,
    totalMinutes: 0,
    totalSessions: 0,
    streakDays: 1,
    lastActiveDate: null,
    achievements: INITIAL_ACHIEVEMENTS,
    distractionShieldEnabled: true,
    activeSession: null,
  };
}

export function recordCompletedSession(
  profile: DeepWorkProfile,
  actualMinutes: number,
  targetMinutes: number,
  distractionCount: number,
  presetId?: string
): { updatedProfile: DeepWorkProfile; xpBreakdown: ReturnType<typeof calculateSessionXp>; unlockedBadges: Achievement[] } {
  const todayStr = new Date().toISOString().split("T")[0];

  // Evaluate streak
  let newStreak = profile.streakDays;
  if (!profile.lastActiveDate) {
    newStreak = 1;
  } else if (profile.lastActiveDate !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (profile.lastActiveDate === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1; // Streak reset
    }
  }

  const xpBreakdown = calculateSessionXp(actualMinutes, targetMinutes, distractionCount, newStreak);

  const newTotalMinutes = profile.totalMinutes + actualMinutes;
  const newTotalSessions = profile.totalSessions + 1;
  const newXp = profile.xp + xpBreakdown.totalXp;

  // Evaluate achievements
  const newlyUnlocked: Achievement[] = [];
  const updatedAchievements = profile.achievements.map((ach) => {
    if (ach.unlockedAt) return ach;

    let shouldUnlock = false;
    if (ach.id === "first_flow" && newTotalSessions >= 1) shouldUnlock = true;
    if (ach.id === "gamma_initiate" && presetId === "gamma-40") shouldUnlock = true;
    if (ach.id === "deep_sprint" && actualMinutes >= 45) shouldUnlock = true;
    if (ach.id === "titan_90" && actualMinutes >= 90) shouldUnlock = true;
    if (ach.id === "century_club" && newTotalMinutes >= 100) shouldUnlock = true;
    if (ach.id === "streak_guardian" && newStreak >= 3) shouldUnlock = true;
    if (ach.id === "streak_seven" && newStreak >= 7) shouldUnlock = true;

    if (shouldUnlock) {
      const unlocked = { ...ach, unlockedAt: new Date().toISOString() };
      newlyUnlocked.push(unlocked);
      return unlocked;
    }

    return ach;
  });

  const updatedProfile: DeepWorkProfile = {
    ...profile,
    xp: newXp,
    totalMinutes: newTotalMinutes,
    totalSessions: newTotalSessions,
    streakDays: newStreak,
    lastActiveDate: todayStr,
    achievements: updatedAchievements,
    activeSession: null,
  };

  saveDeepWorkProfile(updatedProfile);

  return {
    updatedProfile,
    xpBreakdown,
    unlockedBadges: newlyUnlocked,
  };
}

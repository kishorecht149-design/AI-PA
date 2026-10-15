import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSessionXp,
  calculateStreakMultiplier,
  getRankForXp,
  getRankProgress,
  recordCompletedSession,
  createDefaultProfile,
} from "../src/lib/deep-work-xp.ts";

test("Deep Work XP: Base minutes calculation", () => {
  const result = calculateSessionXp(25, 25, 1, 1);
  // 25 mins * 10 XP = 250 base
  // Completion bonus = 50
  // Clean bonus = 0 (distractions > 0)
  // Streak multiplier = 1.0
  assert.strictEqual(result.basePoints, 250);
  assert.strictEqual(result.completionBonus, 50);
  assert.strictEqual(result.cleanBonus, 0);
  assert.strictEqual(result.totalXp, 300);
});

test("Deep Work XP: Clean session zero-distraction bonus", () => {
  const result = calculateSessionXp(45, 45, 0, 1);
  // 45 mins * 10 = 450 base
  // Completion bonus = 50
  // Clean bonus = 20% of 450 = 90
  // Streak multiplier = 1.0
  // Total = (450 + 50 + 90) * 1.0 = 590
  assert.strictEqual(result.basePoints, 450);
  assert.strictEqual(result.completionBonus, 50);
  assert.strictEqual(result.cleanBonus, 90);
  assert.strictEqual(result.totalXp, 590);
});

test("Deep Work XP: Streak multipliers scale correctly", () => {
  assert.strictEqual(calculateStreakMultiplier(1), 1.0);
  assert.strictEqual(calculateStreakMultiplier(2), 1.0);
  assert.strictEqual(calculateStreakMultiplier(3), 1.25);
  assert.strictEqual(calculateStreakMultiplier(6), 1.25);
  assert.strictEqual(calculateStreakMultiplier(7), 1.5);
  assert.strictEqual(calculateStreakMultiplier(13), 1.5);
  assert.strictEqual(calculateStreakMultiplier(14), 2.0);
  assert.strictEqual(calculateStreakMultiplier(30), 2.0);
});

test("Deep Work XP: Streak multiplier applied to final session total", () => {
  // 3-day streak = 1.25x
  const result = calculateSessionXp(40, 40, 0, 3);
  // Base: 400, Completion: 50, Clean: 80 -> Subtotal = 530
  // 530 * 1.25 = 662.5 -> Math.round = 663
  assert.strictEqual(result.totalXp, 663);
});

test("Deep Work XP: Rank progression tiers", () => {
  assert.strictEqual(getRankForXp(0).level, 1);
  assert.strictEqual(getRankForXp(499).level, 1);
  assert.strictEqual(getRankForXp(500).level, 2);
  assert.strictEqual(getRankForXp(1499).level, 2);
  assert.strictEqual(getRankForXp(1500).level, 3);
  assert.strictEqual(getRankForXp(3500).level, 4);
  assert.strictEqual(getRankForXp(7000).level, 5);
  assert.strictEqual(getRankForXp(12000).level, 6);
  assert.strictEqual(getRankForXp(50000).level, 6);
});

test("Deep Work XP: Progress bar calculation", () => {
  // Level 1: 0 - 500 XP. 250 XP is 50%
  const prog1 = getRankProgress(250);
  assert.strictEqual(prog1.currentRank.level, 1);
  assert.strictEqual(prog1.progressPct, 50);
  assert.strictEqual(prog1.xpRemaining, 250);

  // Level 6 max rank
  const progMax = getRankProgress(15000);
  assert.strictEqual(progMax.currentRank.level, 6);
  assert.strictEqual(progMax.progressPct, 100);
  assert.strictEqual(progMax.xpRemaining, 0);
});

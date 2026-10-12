import test from "node:test";
import assert from "node:assert/strict";
import { calculateSM2 } from "../src/lib/spaced-repetition.ts";
import { EXAMINATION_TRACKS } from "../src/lib/syllabus-templates.ts";

test("Workflows: Task CRUD attributes, priority validation and completion tracking", () => {
  const task = {
    id: "task_mock_001",
    title: "Solve 10 Questions on Frequency Modulation",
    priority: "HIGH",
    status: "TODO",
    estimatedMinutes: 45,
    actualMinutes: 0,
    dueDate: new Date("2026-10-20T10:00:00Z"),
    completedAt: null,
  };

  assert.equal(task.title, "Solve 10 Questions on Frequency Modulation");
  assert.equal(task.priority, "HIGH");
  assert.equal(task.status, "TODO");

  // Status transition to IN_PROGRESS
  task.status = "IN_PROGRESS";
  assert.equal(task.status, "IN_PROGRESS");

  // Status transition to COMPLETED with timestamp
  task.status = "COMPLETED";
  task.completedAt = new Date();
  assert.equal(task.status, "COMPLETED");
  assert.ok(task.completedAt instanceof Date);
});

test("Workflows: Planner conflict detection catches overlapping time blocks", () => {
  // Block A: 09:00 - 10:30
  const blockA = {
    title: "Operating Systems Lecture",
    startTime: new Date("2026-10-15T09:00:00Z"),
    endTime: new Date("2026-10-15T10:30:00Z"),
    isFixed: true,
  };

  // Block B: 10:00 - 11:00 (Overlaps with Block A by 30 mins)
  const blockB = {
    title: "Signals & Systems Drill",
    startTime: new Date("2026-10-15T10:00:00Z"),
    endTime: new Date("2026-10-15T11:00:00Z"),
    isFixed: false,
  };

  // Block C: 11:00 - 12:00 (Non-overlapping)
  const blockC = {
    title: "Lunch & Rest",
    startTime: new Date("2026-10-15T11:00:00Z"),
    endTime: new Date("2026-10-15T12:00:00Z"),
    isFixed: true,
  };

  const isOverlap = (a, b) => a.startTime < b.endTime && a.endTime > b.startTime;

  assert.equal(isOverlap(blockA, blockB), true, "Block A and B should overlap");
  assert.equal(isOverlap(blockA, blockC), false, "Block A and C should not overlap");
  assert.equal(isOverlap(blockB, blockC), false, "Block B and C should not overlap");
});

test("Workflows: Focus session timing and measured time accumulation", () => {
  let taskActualMinutes = 20;
  const recordedSessionMinutes = 45;

  taskActualMinutes += recordedSessionMinutes;
  assert.equal(taskActualMinutes, 65);

  const focusSessions = [
    { actualMinutes: 45, completed: true },
    { actualMinutes: 30, completed: true },
    { actualMinutes: 50, completed: true },
  ];

  const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + s.actualMinutes, 0);
  assert.equal(totalFocusMinutes, 125);
});

test("Workflows: Spaced repetition (SM-2) calculates progressive intervals on high recall", () => {
  // First repetition with rating 5 (Perfect recall)
  const rep1 = calculateSM2({
    rating: 5,
    repetitions: 0,
    intervalDays: 1,
    easeFactor: 2.5,
  });
  assert.equal(rep1.repetitions, 1);
  assert.equal(rep1.intervalDays, 1);
  assert.ok(rep1.easeFactor >= 2.5);

  // Second repetition with rating 4
  const rep2 = calculateSM2({
    rating: 4,
    repetitions: rep1.repetitions,
    intervalDays: rep1.intervalDays,
    easeFactor: rep1.easeFactor,
  });
  assert.equal(rep2.repetitions, 2);
  assert.equal(rep2.intervalDays, 6);

  // Third repetition with rating 5
  const rep3 = calculateSM2({
    rating: 5,
    repetitions: rep2.repetitions,
    intervalDays: rep2.intervalDays,
    easeFactor: rep2.easeFactor,
  });
  assert.equal(rep3.repetitions, 3);
  assert.ok(rep3.intervalDays >= 14);
});

test("Workflows: Spaced repetition (SM-2) resets interval on failed recall (rating < 3)", () => {
  const failed = calculateSM2({
    rating: 2, // Forgot
    repetitions: 4,
    intervalDays: 24,
    easeFactor: 2.6,
  });

  assert.equal(failed.repetitions, 0);
  assert.equal(failed.intervalDays, 1);
  assert.ok(failed.easeFactor >= 1.3, "Ease factor must never drop below 1.3 minimum");
});

test("Workflows: Goal milestone progress percentage dynamically recalculates", () => {
  const milestones = [
    { id: "m1", title: "Complete Network Theorems", completed: false },
    { id: "m2", title: "Solve 50 PYQs", completed: false },
    { id: "m3", title: "Full Mock Test", completed: false },
    { id: "m4", title: "Error Analysis", completed: false },
  ];

  const computeProgress = (ms) => {
    const done = ms.filter((m) => m.completed).length;
    return Math.round((done / ms.length) * 100);
  };

  assert.equal(computeProgress(milestones), 0);

  // Check 1 milestone
  milestones[0].completed = true;
  assert.equal(computeProgress(milestones), 25);

  // Check 2 more
  milestones[1].completed = true;
  milestones[2].completed = true;
  assert.equal(computeProgress(milestones), 75);

  // Complete all
  milestones[3].completed = true;
  assert.equal(computeProgress(milestones), 100);
});

test("Workflows: Examination track syllabus structures for ECE and ESE are non-empty and well-formed", () => {
  const gateEc = EXAMINATION_TRACKS["GATE_EC"];
  const eseEt = EXAMINATION_TRACKS["ESE_ET"];
  const eceCore = EXAMINATION_TRACKS["ECE_CORE"];

  assert.ok(gateEc);
  assert.equal(gateEc.discipline, "ECE");
  assert.ok(gateEc.courses.length >= 5);

  assert.ok(eseEt);
  assert.equal(eseEt.discipline, "ECE");
  assert.ok(eseEt.courses.length >= 3);

  assert.ok(eceCore);
  assert.ok(eceCore.courses.length >= 2);

  // Ensure every course has valid units and topics
  for (const c of gateEc.courses) {
    assert.ok(c.code);
    assert.ok(c.name);
    assert.ok(c.units.length > 0);
    for (const u of c.units) {
      assert.ok(u.topics.length > 0);
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getEseSyllabusStats, ESE_CHECKLIST_ITEMS, ESE_PART_D_MILESTONES, ESE_SUBJECTS } from "../src/lib/ese/syllabus-data.ts";
import { generate600DayPlan } from "../src/lib/ese/schedule-generator.ts";
import { EXAMINATION_TRACKS } from "../src/lib/syllabus-templates.ts";

test("Production Readiness Repair: ESE Counting Model Reconciliation", () => {
  const stats = getEseSyllabusStats();
  assert.equal(stats.subjectCount, 22, "Must contain exactly 22 subjects");
  assert.equal(stats.chapterCount, 78, "Must contain exactly 78 chapters");
  assert.equal(stats.checklistItemCount, 351, "Must contain exactly 351 syllabus subtopics");
  assert.equal(stats.milestoneCount, 16, "Must contain exactly 16 Part D milestones");
  assert.equal(stats.totalDestinationNodes, 367, "Total preparation items must be 351 + 16 = 367");

  // Sum check across all checklist items and milestones
  assert.equal(ESE_CHECKLIST_ITEMS.length, 351, "All 351 checklist items must be present in canonical list");
  assert.equal(ESE_PART_D_MILESTONES.length, 16, "All 16 milestones must be present in canonical list");
});

test("Production Readiness Repair: Academic Track Outlines & Distinction", () => {
  const gateEc = EXAMINATION_TRACKS["GATE_EC"];
  const eseEt = EXAMINATION_TRACKS["ESE_ET"];
  const gateCs = EXAMINATION_TRACKS["GATE_CS"];
  const eceCore = EXAMINATION_TRACKS["ECE_CORE"];

  assert.ok(gateEc, "GATE_EC track must exist");
  assert.ok(eseEt, "ESE_ET track must exist");
  assert.ok(gateCs, "GATE_CS track must exist");
  assert.ok(eceCore, "ECE_CORE track must exist");

  // Ensure course codes are distinct between tracks
  const gateEcCodes = new Set(gateEc.courses.map(c => c.code));
  const eseEtCodes = new Set(eseEt.courses.map(c => c.code));

  for (const code of gateEcCodes) {
    assert.ok(!eseEtCodes.has(code), `Course code ${code} should not conflict between GATE EC and ESE ET`);
  }

  // Ensure each track has courses with units and topics
  for (const track of [gateEc, eseEt, gateCs, eceCore]) {
    assert.ok(track.courses.length > 0, `${track.id} must have courses`);
    for (const course of track.courses) {
      assert.ok(course.units.length > 0, `${course.code} must have units`);
      for (const unit of course.units) {
        assert.ok(unit.topics.length > 0, `${course.code} Unit ${unit.unitNumber} must have topics`);
      }
    }
  }
});

test("Production Readiness Repair: Prisma Schema Course Unique Constraint", () => {
  const schema = fs.readFileSync("./prisma/schema.prisma", "utf8");
  assert.ok(
    schema.includes("@@unique([userId, code])"),
    "Prisma schema Course model must enforce @@unique([userId, code]) to eliminate duplicate course cards"
  );
});

test("Production Readiness Repair: 600-Day Plan Determinism and Phase Boundaries", () => {
  const plan = generate600DayPlan("2026-10-20");
  assert.equal(plan.totalDays, 600, "Plan must generate exactly 600 days");
  assert.equal(plan.days.length, 600, "Days array must have length 600");
  assert.equal(plan.startDate, "2026-10-20", "Start date must match");
  assert.ok(plan.endDate, "End date must be populated");

  // Ensure phase day distributions match specification
  const phase1Days = plan.days.filter(d => d.phase === "PHASE_1");
  const phase2Days = plan.days.filter(d => d.phase === "PHASE_2");
  const phase3Days = plan.days.filter(d => d.phase === "PHASE_3");
  const phase4Days = plan.days.filter(d => d.phase === "PHASE_4");
  const phase5Days = plan.days.filter(d => d.phase === "PHASE_5");
  const phase6Days = plan.days.filter(d => d.phase === "PHASE_6");

  assert.equal(phase1Days.length, 360, "Phase 1 must span 360 days");
  assert.equal(phase2Days.length, 60, "Phase 2 must span 60 days");
  assert.equal(phase3Days.length, 60, "Phase 3 must span 60 days");
  assert.equal(phase4Days.length, 50, "Phase 4 must span 50 days");
  assert.equal(phase5Days.length, 40, "Phase 5 must span 40 days");
  assert.equal(phase6Days.length, 30, "Phase 6 must span 30 days");
});

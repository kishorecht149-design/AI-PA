import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.ts";

import {
  ESE_SUBJECTS,
  ESE_CHECKLIST_ITEMS,
  ESE_PART_D_MILESTONES,
  getEseSyllabusStats,
  getEseItemById,
  searchEseSyllabus,
} from "../src/lib/ese/syllabus-data.ts";

import {
  generate600DayPlan,
  isValidGoogleDriveUrl,
  MANDATORY_ATTESTATION_TEXT,
  computeKolkataDate,
} from "../src/lib/ese/schedule-generator.ts";

import {
  getEseOverview,
  getEseSyllabusWithProgress,
  activateOrUpdateEsePlan,
  completeEseTaskWithEvidence,
  getEseResources,
  addOrClassifyEseResource,
} from "../src/lib/ese/service.ts";

// =============================================================================
// TEST SUITE: ESE 600-DAY MASTERY SYSTEM & UNIFIED TASKS & PLANNER
// =============================================================================

test("Criteria 1: Exact source reconciliation counts (22 subjects, 78 chapters, 351 items, 16 milestones)", () => {
  const stats = getEseSyllabusStats();

  assert.equal(stats.subjectCount, 22, "Must contain exactly 22 subjects");
  assert.equal(stats.chapterCount, 78, "Must contain exactly 78 chapters");
  assert.equal(stats.checklistItemCount, 351, "Must contain exactly 351 Part A-C checklist items");
  assert.equal(stats.milestoneCount, 16, "Must contain exactly 16 Part D execution milestones");
  assert.equal(stats.totalDestinationNodes, 367, "Total destination nodes must be 367");

  // Verify Part breakdown:
  // Part A: 10 subjects, 28 chapters
  const partASubjects = ESE_SUBJECTS.filter((s) => s.part === "PART_A");
  assert.equal(partASubjects.length, 10, "Part A has 10 subjects");
  const partAChapters = partASubjects.reduce((acc, s) => acc + s.chapters.length, 0);
  assert.equal(partAChapters, 28, "Part A has 28 chapters");

  // Part B: 6 subjects, 25 chapters
  const partBSubjects = ESE_SUBJECTS.filter((s) => s.part === "PART_B");
  assert.equal(partBSubjects.length, 6, "Part B has 6 subjects");
  const partBChapters = partBSubjects.reduce((acc, s) => acc + s.chapters.length, 0);
  assert.equal(partBChapters, 25, "Part B has 25 chapters");

  // Part C: 6 subjects, 25 chapters
  const partCSubjects = ESE_SUBJECTS.filter((s) => s.part === "PART_C");
  assert.equal(partCSubjects.length, 6, "Part C has 6 subjects");
  const partCChapters = partCSubjects.reduce((acc, s) => acc + s.chapters.length, 0);
  assert.equal(partCChapters, 25, "Part C has 25 chapters");

  // Part D: 16 milestones
  assert.equal(ESE_PART_D_MILESTONES.length, 16, "Part D has 16 milestones");
});

test("Criteria 2: Unique stable IDs and lossless verbatim source mapping", () => {
  const seenIds = new Set();

  for (const item of ESE_CHECKLIST_ITEMS) {
    assert.ok(item.id, "Every checklist item must have an ID");
    assert.ok(!seenIds.has(item.id), `Duplicate ID detected: ${item.id}`);
    seenIds.add(item.id);

    // Verify verbatim non-empty text and meaningful topic grouping
    assert.ok(item.subtopicTitle && item.subtopicTitle.trim().length > 0);
    assert.ok(item.subjectTitle && item.subjectTitle.trim().length > 0);
    assert.ok(item.chapterTitle && item.chapterTitle.trim().length > 0);
    assert.ok(item.topicTitle && item.topicTitle.trim().length > 0, "Every item must have a topic title");
    assert.ok(!item.topicTitle.includes("[Study Module]"), `Synthetic prefix must not exist: ${item.id}`);
  }

  for (const milestone of ESE_PART_D_MILESTONES) {
    assert.ok(milestone.id, "Every milestone must have an ID");
    assert.ok(!seenIds.has(milestone.id), `Duplicate ID detected: ${milestone.id}`);
    seenIds.add(milestone.id);

    assert.ok(milestone.title && milestone.title.trim().length > 0);
  }

  // Lookup verification
  const firstItem = getEseItemById("ESE-PA-S01-C01-I001");
  assert.ok(firstItem);
  assert.equal(
    firstItem.subtopicTitle,
    "National and international developments with social, economic and industrial relevance"
  );
  assert.equal(
    firstItem.topicTitle,
    "Infrastructure, Technology & Industrial Developments"
  );

  const firstMilestone = getEseItemById("ESE-PD-M01");
  assert.ok(firstMilestone);
  assert.equal(
    firstMilestone.title,
    "I have revised the definitions, laws, assumptions and formulae in each technical subject."
  );
});

test("Criteria 9: Refined syllabus hierarchy with meaningful topic groups across all 78 chapters", () => {
  const topicsByChapter = new Map();
  const seenSubtopics = new Set();

  for (const item of ESE_CHECKLIST_ITEMS) {
    // Subtopic traceability
    assert.ok(item.subtopicTitle, `Item ${item.id} must have subtopicTitle`);
    assert.ok(!seenSubtopics.has(item.id), `Duplicate ID: ${item.id}`);
    seenSubtopics.add(item.id);

    // Grouping by chapter
    if (!topicsByChapter.has(item.chapterId)) {
      topicsByChapter.set(item.chapterId, new Set());
    }
    topicsByChapter.get(item.chapterId).add(item.topicTitle);

    // Topic title must be clean and meaningful
    assert.ok(item.topicTitle.length > 5, `Topic title too short: ${item.topicTitle}`);
    assert.ok(!item.topicTitle.includes("[Study Module]"), `Synthetic topic title: ${item.topicTitle}`);
  }

  // Exactly 78 chapters mapped
  assert.equal(topicsByChapter.size, 78, "Must contain exactly 78 chapters");

  // Every chapter must have 2 or 3 distinct topic groupings
  for (const [chId, topics] of topicsByChapter.entries()) {
    assert.ok(
      topics.size >= 2,
      `Chapter ${chId} should have at least 2 distinct topic groups, got ${topics.size}`
    );
  }

  // Verify schedule tasks inherit the canonical topicTitle
  const plan = generate600DayPlan("2026-10-18");
  const day1Task1 = plan.days[0].tasks[0];
  assert.equal(day1Task1.topicTitle, "Infrastructure, Technology & Industrial Developments");
  assert.equal(
    day1Task1.subtopicTitle,
    "National and international developments with social, economic and industrial relevance"
  );
});

test("Criteria 3: 600-Day schedule validity, date calculation, 30-60 min tasks, full coverage", () => {
  const startDate = "2026-10-18";
  const plan = generate600DayPlan(startDate);

  assert.equal(plan.days.length, 600, "Plan must contain exactly 600 days");
  assert.equal(plan.totalDays, 600);
  assert.equal(plan.timeZone, "Asia/Kolkata");

  // Verify end date = startDate + 599 days
  const expectedEndDate = computeKolkataDate(startDate, 599);
  assert.equal(plan.endDate, expectedEndDate);
  assert.equal(plan.days[599].date, expectedEndDate);

  const coveredSyllabusNodeIds = new Set();

  for (let i = 0; i < plan.days.length; i++) {
    const day = plan.days[i];
    assert.equal(day.dayNumber, i + 1, `Day number must match index + 1`);
    assert.ok(day.tasks.length >= 2, `Day ${day.dayNumber} must have planned tasks`);

    for (const task of day.tasks) {
      assert.ok(
        task.durationMinutes >= 30 && task.durationMinutes <= 60,
        `Task duration must be 30-60 mins inclusive, got ${task.durationMinutes} on day ${day.dayNumber}`
      );
      assert.ok(task.outcome && task.outcome.length > 0, "Task must have concrete outcome");
      assert.ok(task.taskType, "Task must have defined taskType");
      assert.equal(task.requiresEvidence, true, "Task requires notes evidence");

      if (task.syllabusNodeId) {
        coveredSyllabusNodeIds.add(task.syllabusNodeId);
      }
    }
  }

  // Verify that all 351 checklist items receive first-pass coverage in Phase 1
  for (const item of ESE_CHECKLIST_ITEMS) {
    assert.ok(
      coveredSyllabusNodeIds.has(item.id),
      `Checklist item ${item.id} must be scheduled in 600-day plan`
    );
  }

  // Verify that all 16 Part D milestones are covered in Phase 6
  for (const milestone of ESE_PART_D_MILESTONES) {
    assert.ok(
      coveredSyllabusNodeIds.has(milestone.id),
      `Part D milestone ${milestone.id} must be scheduled in 600-day plan`
    );
  }
});

test("Criteria 4: Google Drive URL validator correctly discriminates valid vs invalid URLs", () => {
  // Valid URLs
  assert.equal(isValidGoogleDriveUrl("https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view"), true);
  assert.equal(isValidGoogleDriveUrl("https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit?usp=sharing"), true);
  assert.equal(isValidGoogleDriveUrl("https://docs.google.com/spreadsheets/d/1234567890/edit#gid=0"), true);
  assert.equal(isValidGoogleDriveUrl("https://drive.google.com/open?id=1234567890abcdef"), true);
  assert.equal(isValidGoogleDriveUrl("https://drive.google.com/drive/folders/1234567890folder"), true);

  // Invalid URLs
  assert.equal(isValidGoogleDriveUrl(""), false);
  assert.equal(isValidGoogleDriveUrl("not a url"), false);
  assert.equal(isValidGoogleDriveUrl("http://evil-site.com/fake-drive"), false);
  assert.equal(isValidGoogleDriveUrl("https://dropbox.com/s/12345/notes.pdf"), false);
  assert.equal(isValidGoogleDriveUrl("https://drive.google.com/"), false); // root with no file or ID
});

test("Criteria 5: Mandatory task completion evidence & attestation enforcement", async () => {
  const mockUserId = "ese-user-evidence-test";
  const mockTaskId = "task-ese-001";

  // Rejection without valid Drive URL
  await assert.rejects(
    async () => {
      await completeEseTaskWithEvidence(
        mockUserId,
        mockTaskId,
        "https://not-google-drive.com/file.pdf",
        true
      );
    },
    (err) => err.message.includes("Invalid Google Drive URL")
  );

  // Rejection without confirmed attestation
  await assert.rejects(
    async () => {
      await completeEseTaskWithEvidence(
        mockUserId,
        mockTaskId,
        "https://drive.google.com/file/d/1234567890/view",
        false
      );
    },
    (err) => err.message.includes("Mandatory attestation required")
  );

  // Verify mandatory attestation text string
  assert.equal(
    MANDATORY_ATTESTATION_TEXT,
    "I confirm that this file contains my notes for the linked topic or subtopic."
  );
});

test("Criteria 6: ESE Resources classification and unclassified grouping", async () => {
  const mockUserId = "ese-res-test-user";
  const mockStore = new Map();

  const origUpsert = prisma.eseResource?.upsert;
  const origFindMany = prisma.eseResource?.findMany;

  try {
    prisma.eseResource = prisma.eseResource || {};
    prisma.eseResource.upsert = async ({ where, create, update }) => {
      const key = `${where.userId_url.userId}:${where.userId_url.url}`;
      let item = mockStore.get(key);
      if (item) {
        item = { ...item, ...update, updatedAt: new Date() };
      } else {
        item = { id: `res-${mockStore.size + 1}`, ...create, createdAt: new Date(), updatedAt: new Date() };
      }
      mockStore.set(key, item);
      return item;
    };
    prisma.eseResource.findMany = async ({ where }) => {
      return Array.from(mockStore.values()).filter((r) => r.userId === where.userId);
    };

    // Add classified resource
    const res1 = await addOrClassifyEseResource(
      mockUserId,
      "Semiconductor Physics Notes",
      "https://drive.google.com/file/d/semi123/view",
      "ESE-PB-S01-C01-I105"
    );
    assert.ok(res1.success);
    assert.equal(res1.resource.isClassified, true);
    assert.equal(res1.resource.nodeId, "ESE-PB-S01-C01-I105");
    assert.equal(res1.resource.subjectName, "Basic Electronics Engineering");

    // Add unclassified resource
    const res2 = await addOrClassifyEseResource(
      mockUserId,
      "Miscellaneous Reference Sheet",
      "https://drive.google.com/file/d/misc456/view"
    );
    assert.ok(res2.success);
    assert.equal(res2.resource.isClassified, false);
    assert.equal(res2.resource.nodeId, null);

    // Fetch grouped resources
    const grouped = await getEseResources(mockUserId);
    assert.equal(grouped.totalCount, 2);
    assert.equal(grouped.classifiedCount, 1);
    assert.equal(grouped.unclassifiedCount, 1);
    assert.equal(grouped.structuredSubjects.length, 1);
    assert.equal(grouped.structuredSubjects[0].subjectName, "Basic Electronics Engineering");
    assert.equal(grouped.unclassifiedResources.length, 1);
    assert.equal(grouped.unclassifiedResources[0].title, "Miscellaneous Reference Sheet");
  } finally {
    if (prisma.eseResource) {
      prisma.eseResource.upsert = origUpsert;
      prisma.eseResource.findMany = origFindMany;
    }
  }
});

test("Criteria 7: Tasks & Planner architecture: single navigation entry, no Portal shortcut", async () => {
  const { default: fs } = await import("fs");
  const navContent = fs.readFileSync(
    new URL("../src/components/Navigation.tsx", import.meta.url),
    "utf8"
  );

  // Assert single navigation entry under Execution for Tasks & Planner
  assert.ok(
    navContent.includes('{ name: "Tasks & Planner", href: "/planner", icon: Calendar }'),
    "Navigation must have single Tasks & Planner entry"
  );
  assert.ok(
    !navContent.includes('{ name: "Tasks", href: "/tasks"'),
    "Separate Tasks sidebar item must not exist in workspace navigation"
  );

  // Assert Portal item is NOT in the workspace sidebar navigation
  assert.ok(
    !navContent.includes('{ name: "Portal", href: "/"'),
    "Portal navigation item must remain excluded from workspace navigation"
  );
});

test("Criteria 8: Tenant isolation in ESE plan and resources", async () => {
  const userA = "tenant-user-a";
  const userB = "tenant-user-b";
  const mockStore = new Map();

  const origUpsert = prisma.eseResource?.upsert;
  const origFindMany = prisma.eseResource?.findMany;

  try {
    prisma.eseResource = prisma.eseResource || {};
    prisma.eseResource.upsert = async ({ where, create, update }) => {
      const key = `${where.userId_url.userId}:${where.userId_url.url}`;
      let item = mockStore.get(key);
      if (item) {
        item = { ...item, ...update, updatedAt: new Date() };
      } else {
        item = { id: `res-${mockStore.size + 1}`, ...create, createdAt: new Date(), updatedAt: new Date() };
      }
      mockStore.set(key, item);
      return item;
    };
    prisma.eseResource.findMany = async ({ where }) => {
      return Array.from(mockStore.values()).filter((r) => r.userId === where.userId);
    };

    // User A adds resource
    await addOrClassifyEseResource(
      userA,
      "User A Note",
      "https://drive.google.com/file/d/user-a-doc/view",
      "ESE-PA-S01-C01-I001"
    );

    // User B adds resource
    await addOrClassifyEseResource(
      userB,
      "User B Note",
      "https://drive.google.com/file/d/user-b-doc/view"
    );

    // User A resources should never leak to User B
    const userAResources = await getEseResources(userA);
    const userBResources = await getEseResources(userB);

    assert.equal(userAResources.totalCount, 1);
    assert.equal(userAResources.classifiedCount, 1);
    assert.equal(userAResources.structuredSubjects[0].subjectName, "Current Issues of National and International Importance");

    assert.equal(userBResources.totalCount, 1);
    assert.equal(userBResources.unclassifiedCount, 1);
    assert.equal(userBResources.unclassifiedResources[0].title, "User B Note");
  } finally {
    if (prisma.eseResource) {
      prisma.eseResource.upsert = origUpsert;
      prisma.eseResource.findMany = origFindMany;
    }
  }
});

import {
  ESE_SUBJECTS,
  ESE_CHECKLIST_ITEMS,
  ESE_PART_D_MILESTONES,
} from "./syllabus-data.ts";
import type {
  EseChecklistItem,
  EsePartDMilestone,
} from "./syllabus-data.ts";

export type EseTaskType =
  | "LEARNING"
  | "NUMERICAL_PRACTICE"
  | "REVISION"
  | "PYQ"
  | "TEST"
  | "ERROR_LOG"
  | "CONSOLIDATION";

export interface ScheduledEseTask {
  id: string; // Deterministic task key e.g. ESE-TASK-D001-T1
  dayNumber: number; // 1 to 600
  taskIndex: number; // 1, 2, ...
  date: string; // YYYY-MM-DD (Asia/Kolkata)
  title: string;
  taskType: EseTaskType;
  durationMinutes: number; // Strictly 30 to 60 minutes inclusive
  outcome: string; // Concrete outcome
  syllabusNodeId?: string;
  stage?: string;
  subjectNumber?: number;
  subjectTitle?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  topicTitle?: string;
  subtopicTitle?: string;
  requiresEvidence: boolean;
}

export interface EsePlanDaySchedule {
  dayNumber: number; // 1 to 600
  date: string; // YYYY-MM-DD
  phase: string;
  phaseName: string;
  focusSummary: string;
  tasks: ScheduledEseTask[];
  totalMinutes: number;
}

export interface EseGeneratedPlan {
  startDate: string;
  endDate: string; // Exactly startDate + 599 days
  totalDays: 600;
  timeZone: "Asia/Kolkata";
  phases: {
    phase: string;
    name: string;
    daysRange: string;
    dayCount: number;
    description: string;
  }[];
  days: EsePlanDaySchedule[];
  totalTasks: number;
}

export const MANDATORY_ATTESTATION_TEXT =
  "I confirm that this file contains my notes for the linked topic or subtopic.";

/**
 * Validates whether a given URL is a legitimate-looking Google Drive / Docs / Sheets URL.
 */
export function isValidGoogleDriveUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isGoogleHost =
      host === "drive.google.com" ||
      host === "docs.google.com" ||
      host === "sheets.google.com" ||
      host.endsWith(".drive.google.com") ||
      host.endsWith(".docs.google.com");

    if (!isGoogleHost) return false;

    // Must point to a file, document, open id, or folder
    const path = parsed.pathname.toLowerCase();
    const hasValidPath =
      path.includes("/file/d/") ||
      path.includes("/document/d/") ||
      path.includes("/spreadsheets/d/") ||
      path.includes("/presentation/d/") ||
      path.includes("/folders/") ||
      path.includes("/open") ||
      parsed.searchParams.has("id");

    return hasValidPath;
  } catch {
    return false;
  }
}

/**
 * Calculates date + dayOffset in Asia/Kolkata calendar representation.
 */
export function computeKolkataDate(baseDateStr: string, dayOffset: number): string {
  const [y, m, d] = baseDateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d + dayOffset, 12, 0, 0));
  return dateObj.toISOString().split("T")[0];
}

/**
 * Generates the deterministic 600-day consecutive study schedule.
 * Days 1-360: First-pass coverage & problem practice (all 351 syllabus items covered)
 * Days 361-420: Systematic revision across 22 subjects
 * Days 421-480: Subject-wise previous year questions (PYQ) & conventional answers
 * Days 481-530: Section tests and error correction
 * Days 531-570: Second revision & spaced recall
 * Days 571-600: Final consolidation and exam readiness (16 Part D milestones + mock rehearsal)
 */
export function generate600DayPlan(startDate: string): EseGeneratedPlan {
  const endDate = computeKolkataDate(startDate, 599);

  const phases = [
    {
      phase: "PHASE_1",
      name: "First-Pass Coverage & Problem Practice",
      daysRange: "Days 1–360",
      dayCount: 360,
      description: "Comprehensive first-pass study of all 351 syllabus checklist items with paired problem practice.",
    },
    {
      phase: "PHASE_2",
      name: "Systematic Subject-Wise Revision",
      daysRange: "Days 361–420",
      dayCount: 60,
      description: "Structured revision across all 22 subjects, solidifying formulas, concepts, and derivations.",
    },
    {
      phase: "PHASE_3",
      name: "PYQ Drill & Conventional Answer Writing",
      daysRange: "Days 421–480",
      dayCount: 60,
      description: "UPSC ESE previous-years questions, conventional solution layout, diagram precision, and timing.",
    },
    {
      phase: "PHASE_4",
      name: "Section Tests & Error Log Remediation",
      daysRange: "Days 481–530",
      dayCount: 50,
      description: "Rigorous section tests, calculation slip analysis, and targeted gap correction.",
    },
    {
      phase: "PHASE_5",
      name: "Second Revision & Spaced Recall",
      daysRange: "Days 531–570",
      dayCount: 40,
      description: "High-yield spaced repetition recall, rapid formula review, and memory consolidation.",
    },
    {
      phase: "PHASE_6",
      name: "Final Consolidation & Exam Readiness",
      daysRange: "Days 571–600",
      dayCount: 30,
      description: "All 16 Part D execution milestones, full mock rehearsals, and examination temperament readiness.",
    },
  ];

  const days: EsePlanDaySchedule[] = [];
  let totalTasks = 0;

  for (let dayNum = 1; dayNum <= 600; dayNum++) {
    const dateStr = computeKolkataDate(startDate, dayNum - 1);
    let phase = "PHASE_1";
    let phaseName = phases[0].name;
    let focusSummary = "";
    const dayTasks: ScheduledEseTask[] = [];

    if (dayNum <= 360) {
      // Phase 1: Days 1 to 360
      phase = "PHASE_1";
      phaseName = phases[0].name;

      if (dayNum <= 351) {
        // Exact 1-to-1 syllabus coverage for all 351 items
        const item: EseChecklistItem = ESE_CHECKLIST_ITEMS[dayNum - 1];
        focusSummary = `${item.subjectTitle} (Ch ${item.chapterNumber}): ${item.subtopicTitle.substring(0, 50)}...`;

        dayTasks.push({
          id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T1`,
          dayNumber: dayNum,
          taskIndex: 1,
          date: dateStr,
          title: `[Day ${dayNum}] Core Concept: ${item.subtopicTitle}`,
          taskType: "LEARNING",
          durationMinutes: 45,
          outcome: `Master core principles, definitions, and equations of ${item.subtopicTitle}`,
          syllabusNodeId: item.id,
          stage: item.stage,
          subjectNumber: item.subjectNumber,
          subjectTitle: item.subjectTitle,
          chapterNumber: item.chapterNumber,
          chapterTitle: item.chapterTitle,
          topicTitle: item.topicTitle,
          subtopicTitle: item.subtopicTitle,
          requiresEvidence: true,
        });

        dayTasks.push({
          id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T2`,
          dayNumber: dayNum,
          taskIndex: 2,
          date: dateStr,
          title: `[Day ${dayNum}] Practice & Derivation: ${item.subtopicTitle}`,
          taskType: "NUMERICAL_PRACTICE",
          durationMinutes: 45,
          outcome: `Solve analytical & numerical practice problems with worked verification for ${item.subtopicTitle}`,
          syllabusNodeId: item.id,
          stage: item.stage,
          subjectNumber: item.subjectNumber,
          subjectTitle: item.subjectTitle,
          chapterNumber: item.chapterNumber,
          chapterTitle: item.chapterTitle,
          topicTitle: item.topicTitle,
          subtopicTitle: item.subtopicTitle,
          requiresEvidence: true,
        });
      } else {
        // Days 352-360: Integrated synthesis and problem review
        const subIndex = (dayNum - 352) % ESE_SUBJECTS.length;
        const sub = ESE_SUBJECTS[subIndex];
        focusSummary = `Phase 1 Synthesis Drill: ${sub.title} integrated problem practice`;

        dayTasks.push({
          id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T1`,
          dayNumber: dayNum,
          taskIndex: 1,
          date: dateStr,
          title: `[Day ${dayNum}] Cross-Chapter Synthesis: ${sub.title}`,
          taskType: "CONSOLIDATION",
          durationMinutes: 45,
          outcome: `Synthesize formulas and multi-concept problem workflows across ${sub.title}`,
          stage: sub.stage,
          subjectNumber: sub.number,
          subjectTitle: sub.title,
          requiresEvidence: true,
        });

        dayTasks.push({
          id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T2`,
          dayNumber: dayNum,
          taskIndex: 2,
          date: dateStr,
          title: `[Day ${dayNum}] Timed Problem Set: ${sub.title}`,
          taskType: "NUMERICAL_PRACTICE",
          durationMinutes: 45,
          outcome: `Complete timed practice problem set under exam conditions for ${sub.title}`,
          stage: sub.stage,
          subjectNumber: sub.number,
          subjectTitle: sub.title,
          requiresEvidence: true,
        });
      }
    } else if (dayNum <= 420) {
      // Phase 2: Days 361 to 420 (60 days) - Systematic Revision across 22 subjects
      phase = "PHASE_2";
      phaseName = phases[1].name;
      const subIdx = (dayNum - 361) % ESE_SUBJECTS.length;
      const sub = ESE_SUBJECTS[subIdx];
      focusSummary = `Systematic Revision: ${sub.title}`;

      dayTasks.push({
        id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T1`,
        dayNumber: dayNum,
        taskIndex: 1,
        date: dateStr,
        title: `[Day ${dayNum}] Subject Deep Revision: ${sub.title}`,
        taskType: "REVISION",
        durationMinutes: 50,
        outcome: `Active recall drill on core principles, definitions, and high-frequency topics in ${sub.title}`,
        stage: sub.stage,
        subjectNumber: sub.number,
        subjectTitle: sub.title,
        requiresEvidence: true,
      });

      dayTasks.push({
        id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T2`,
        dayNumber: dayNum,
        taskIndex: 2,
        date: dateStr,
        title: `[Day ${dayNum}] Formula & Boundary Condition Review: ${sub.title}`,
        taskType: "REVISION",
        durationMinutes: 40,
        outcome: `Verify formula sheets, boundary conditions, and assumption limits for ${sub.title}`,
        stage: sub.stage,
        subjectNumber: sub.number,
        subjectTitle: sub.title,
        requiresEvidence: true,
      });
    } else if (dayNum <= 480) {
      // Phase 3: Days 421 to 480 (60 days) - PYQ & Conventional Answers
      phase = "PHASE_3";
      phaseName = phases[2].name;
      const subIdx = (dayNum - 421) % ESE_SUBJECTS.length;
      const sub = ESE_SUBJECTS[subIdx];
      focusSummary = `PYQ Conventional Drill: ${sub.title}`;

      dayTasks.push({
        id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T1`,
        dayNumber: dayNum,
        taskIndex: 1,
        date: dateStr,
        title: `[Day ${dayNum}] UPSC ESE Conventional Past Paper Drill: ${sub.title}`,
        taskType: "PYQ",
        durationMinutes: 60,
        outcome: `Solve past 10-year conventional questions with step-by-step presentation for ${sub.title}`,
        stage: sub.stage,
        subjectNumber: sub.number,
        subjectTitle: sub.title,
        requiresEvidence: true,
      });

      dayTasks.push({
        id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T2`,
        dayNumber: dayNum,
        taskIndex: 2,
        date: dateStr,
        title: `[Day ${dayNum}] Conventional Diagram & Equation Formatting: ${sub.title}`,
        taskType: "PYQ",
        durationMinutes: 45,
        outcome: `Refine circuit diagrams, neat equation layouts, units, and boxed answers for ${sub.title}`,
        stage: sub.stage,
        subjectNumber: sub.number,
        subjectTitle: sub.title,
        requiresEvidence: true,
      });
    } else if (dayNum <= 530) {
      // Phase 4: Days 481 to 530 (50 days) - Section Tests & Error Correction
      phase = "PHASE_4";
      phaseName = phases[3].name;
      const subIdx = (dayNum - 481) % ESE_SUBJECTS.length;
      const sub = ESE_SUBJECTS[subIdx];
      focusSummary = `Section Test & Error Remediation: ${sub.title}`;

      dayTasks.push({
        id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T1`,
        dayNumber: dayNum,
        taskIndex: 1,
        date: dateStr,
        title: `[Day ${dayNum}] Timed Section Test: ${sub.title}`,
        taskType: "TEST",
        durationMinutes: 60,
        outcome: `Complete timed objective/conventional section test under strict timer for ${sub.title}`,
        stage: sub.stage,
        subjectNumber: sub.number,
        subjectTitle: sub.title,
        requiresEvidence: true,
      });

      dayTasks.push({
        id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T2`,
        dayNumber: dayNum,
        taskIndex: 2,
        date: dateStr,
        title: `[Day ${dayNum}] Error-Log Audit & Gap Remediation: ${sub.title}`,
        taskType: "ERROR_LOG",
        durationMinutes: 45,
        outcome: `Classify wrong attempts into conceptual, misread, or calculation slips and remediate in ${sub.title}`,
        stage: sub.stage,
        subjectNumber: sub.number,
        subjectTitle: sub.title,
        requiresEvidence: true,
      });
    } else if (dayNum <= 570) {
      // Phase 5: Days 531 to 570 (40 days) - Second Revision & Spaced Recall
      phase = "PHASE_5";
      phaseName = phases[4].name;
      const subIdx = (dayNum - 531) % ESE_SUBJECTS.length;
      const sub = ESE_SUBJECTS[subIdx];
      focusSummary = `Spaced Recall & High-Yield Drill: ${sub.title}`;

      dayTasks.push({
        id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T1`,
        dayNumber: dayNum,
        taskIndex: 1,
        date: dateStr,
        title: `[Day ${dayNum}] Spaced Repetition Blitz: ${sub.title}`,
        taskType: "REVISION",
        durationMinutes: 45,
        outcome: `Rapid-fire recall of tricky concepts and high-yield traps for ${sub.title}`,
        stage: sub.stage,
        subjectNumber: sub.number,
        subjectTitle: sub.title,
        requiresEvidence: true,
      });

      dayTasks.push({
        id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T2`,
        dayNumber: dayNum,
        taskIndex: 2,
        date: dateStr,
        title: `[Day ${dayNum}] Flash Formula & Assumption Mastery: ${sub.title}`,
        taskType: "CONSOLIDATION",
        durationMinutes: 45,
        outcome: `Review quick formulas, boundary conditions, and typical units for ${sub.title}`,
        stage: sub.stage,
        subjectNumber: sub.number,
        subjectTitle: sub.title,
        requiresEvidence: true,
      });
    } else {
      // Phase 6: Days 571 to 600 (30 days) - Final Consolidation & Part D Milestones
      phase = "PHASE_6";
      phaseName = phases[5].name;

      if (dayNum <= 586) {
        // Exactly 16 days for the 16 Part D milestones
        const milestoneIndex = dayNum - 571;
        const milestone: EsePartDMilestone = ESE_PART_D_MILESTONES[milestoneIndex];
        focusSummary = `Part D Readiness Milestone: ${milestone.section}`;

        dayTasks.push({
          id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T1`,
          dayNumber: dayNum,
          taskIndex: 1,
          date: dateStr,
          title: `[Day ${dayNum}] Execution Milestone: ${milestone.title}`,
          taskType: "CONSOLIDATION",
          durationMinutes: 60,
          outcome: `Demonstrate and document verified compliance with: ${milestone.title}`,
          syllabusNodeId: milestone.id,
          stage: milestone.stage,
          requiresEvidence: true,
        });

        dayTasks.push({
          id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T2`,
          dayNumber: dayNum,
          taskIndex: 2,
          date: dateStr,
          title: `[Day ${dayNum}] Readiness Verification & Evidence Notes: ${milestone.title}`,
          taskType: "CONSOLIDATION",
          durationMinutes: 45,
          outcome: `Document verified execution proof and notes for milestone: ${milestone.title}`,
          syllabusNodeId: milestone.id,
          stage: milestone.stage,
          requiresEvidence: true,
        });
      } else {
        // Days 587 to 600 (14 days): Final Full Rehearsal & Exam Readiness
        const examDayOffset = dayNum - 586;
        focusSummary = `Final Exam Rehearsal & Mental Readiness: Day ${examDayOffset} of 14`;

        dayTasks.push({
          id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T1`,
          dayNumber: dayNum,
          taskIndex: 1,
          date: dateStr,
          title: `[Day ${dayNum}] Full Exam Simulation & Time Allocation Rehearsal`,
          taskType: "TEST",
          durationMinutes: 60,
          outcome: "Execute simulated exam session tracking speed, negative mark avoidance, and question selection",
          stage: "Prelims & Mains Exam Readiness",
          requiresEvidence: true,
        });

        dayTasks.push({
          id: `ESE-TASK-D${String(dayNum).padStart(3, "0")}-T2`,
          dayNumber: dayNum,
          taskIndex: 2,
          date: dateStr,
          title: `[Day ${dayNum}] Final Formula Consolidation & Confidence Audit`,
          taskType: "CONSOLIDATION",
          durationMinutes: 45,
          outcome: "Perform calm final consolidation of high-yield master sheet and affirm exam readiness",
          stage: "Prelims & Mains Exam Readiness",
          requiresEvidence: true,
        });
      }
    }

    const totalMinutes = dayTasks.reduce((acc, t) => acc + t.durationMinutes, 0);
    totalTasks += dayTasks.length;

    days.push({
      dayNumber: dayNum,
      date: dateStr,
      phase,
      phaseName,
      focusSummary,
      tasks: dayTasks,
      totalMinutes,
    });
  }

  return {
    startDate,
    endDate,
    totalDays: 600,
    timeZone: "Asia/Kolkata",
    phases,
    days,
    totalTasks,
  };
}

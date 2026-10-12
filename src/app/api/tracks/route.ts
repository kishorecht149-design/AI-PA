import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { EXAMINATION_TRACKS } from "@/lib/syllabus-templates";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    const [realCoursesCount, demoCoursesCount] = await Promise.all([
      prisma.course.count({ where: { userId, isDemo: false } }),
      prisma.course.count({ where: { userId, isDemo: true } }),
    ]);

    return NextResponse.json({
      tracks: Object.values(EXAMINATION_TRACKS),
      currentTrack: profile?.examinationTrack || "CUSTOM",
      targetExams: profile?.targetExams || "",
      fixedCommitments: profile?.fixedCommitments || "",
      learningPriorities: profile?.learningPriorities || "",
      realCoursesCount,
      demoCoursesCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, trackId, clearDemo, fixedCommitments, learningPriorities, targetExams } = body;

    if (action === "CLEAR_DEMO") {
      // Safely delete only demo-flagged records for this user
      const [deletedCourses, deletedTasks, deletedGoals, deletedProjects] = await prisma.$transaction([
        prisma.course.deleteMany({ where: { userId, isDemo: true } }),
        prisma.task.deleteMany({ where: { userId, isDemo: true } }),
        prisma.goal.deleteMany({ where: { userId, isDemo: true } }),
        prisma.project.deleteMany({ where: { userId, isDemo: true } }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Demo sample records cleared safely.",
        deleted: {
          courses: deletedCourses.count,
          tasks: deletedTasks.count,
          goals: deletedGoals.count,
          projects: deletedProjects.count,
        },
      });
    }

    if (action === "SELECT_TRACK") {
      const track = EXAMINATION_TRACKS[trackId];
      if (!track) {
        return NextResponse.json({ error: `Invalid track: ${trackId}` }, { status: 400 });
      }

      // Update user profile with selected track and onboarding inputs
      await prisma.profile.upsert({
        where: { userId },
        update: {
          examinationTrack: track.id,
          targetExams: targetExams || track.title,
          fixedCommitments: fixedCommitments || null,
          learningPriorities: learningPriorities || null,
        },
        create: {
          userId,
          examinationTrack: track.id,
          targetExams: targetExams || track.title,
          fixedCommitments: fixedCommitments || null,
          learningPriorities: learningPriorities || null,
        },
      });

      // Optionally clear demo records if user requested clean setup
      if (clearDemo) {
        await prisma.$transaction([
          prisma.course.deleteMany({ where: { userId, isDemo: true } }),
          prisma.task.deleteMany({ where: { userId, isDemo: true } }),
          prisma.goal.deleteMany({ where: { userId, isDemo: true } }),
          prisma.project.deleteMany({ where: { userId, isDemo: true } }),
        ]);
      }

      // Provision track courses as real user courses (isDemo: false)
      let createdCourses = 0;
      for (const c of track.courses) {
        // Prevent duplicate course codes for this user
        const existing = await prisma.course.findFirst({
          where: { userId, code: c.code },
        });

        if (!existing) {
          await prisma.course.create({
            data: {
              userId,
              code: c.code,
              name: c.name,
              semester: c.semester || null,
              isGateSubject: c.isGateSubject,
              confidence: 3,
              isDemo: false,
              track: track.id,
              units: {
                create: c.units.map((u) => ({
                  unitNumber: u.unitNumber,
                  title: u.title,
                  topics: {
                    create: u.topics.map((t) => ({
                      title: t.title,
                      description: t.description || null,
                      status: "NOT_STARTED",
                      confidenceLevel: 1,
                    })),
                  },
                })),
              },
            },
          });
          createdCourses++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully configured track "${track.title}" with ${createdCourses} course syllabi.`,
        track: track.id,
        createdCourses,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

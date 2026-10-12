import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { calculateSM2 } from "@/lib/spaced-repetition";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const courses = await prisma.course.findMany({
      where: { userId },
      include: {
        units: {
          include: {
            topics: {
              include: {
                revisionRecords: { orderBy: { studiedAt: "desc" }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const now = new Date();
    // Calculate global syllabus stats and pending revisions
    let totalTopics = 0;
    let masteredTopics = 0;
    let dueRevisionTopics: any[] = [];

    courses.forEach((c) => {
      c.units.forEach((u) => {
        u.topics.forEach((t) => {
          totalTopics++;
          if (t.status === "MASTERED") masteredTopics++;
          if (t.nextRevisionAt && new Date(t.nextRevisionAt) <= now) {
            dueRevisionTopics.push({
              topicId: t.id,
              topicTitle: t.title,
              courseCode: c.code,
              courseName: c.name,
              confidence: t.confidenceLevel,
              nextRevisionAt: t.nextRevisionAt,
            });
          }
        });
      });
    });

    const overallReadinessPct = totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;

    return NextResponse.json({
      courses,
      totalTopics,
      masteredTopics,
      overallReadinessPct,
      dueRevisionTopics,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST endpoint to record an SM-2 study revision attempt
export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { topicId, rating, notes } = body;

    const topic = await prisma.syllabusTopic.findUnique({
      where: { id: topicId },
      include: { revisionRecords: { orderBy: { studiedAt: "desc" }, take: 1 } },
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const lastRecord = topic.revisionRecords[0];
    const prevRepetitions = topic.revisionCount;
    const prevInterval = lastRecord?.intervalDays || 1;
    const prevEase = lastRecord?.easeFactor || 2.5;

    const sm2 = calculateSM2({
      rating: Number(rating),
      repetitions: prevRepetitions,
      intervalDays: prevInterval,
      easeFactor: prevEase,
    });

    const [record, updatedTopic] = await prisma.$transaction([
      prisma.revisionRecord.create({
        data: {
          topicId: topic.id,
          rating: Number(rating),
          intervalDays: sm2.intervalDays,
          easeFactor: sm2.easeFactor,
          notes: notes || "Active recall revision",
        },
      }),
      prisma.syllabusTopic.update({
        where: { id: topic.id },
        data: {
          status: Number(rating) >= 4 ? "MASTERED" : "REVISED",
          confidenceLevel: Number(rating),
          lastStudiedAt: new Date(),
          nextRevisionAt: sm2.nextReviewDate,
          revisionCount: sm2.repetitions,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      record,
      topic: updatedTopic,
      nextRevisionDate: sm2.nextReviewDate,
      intervalDays: sm2.intervalDays,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

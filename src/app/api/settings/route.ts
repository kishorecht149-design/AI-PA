import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [dbUser, preferences, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      prisma.userPreference.findUnique({ where: { userId } }),
      prisma.profile.findUnique({ where: { userId } }),
    ]);

    return NextResponse.json({
      user: dbUser,
      preferences,
      profile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      name,
      workingHoursStart,
      workingHoursEnd,
      preferredFocusMinutes,
      timeZone,
      theme,
      program,
      institution,
      academicYear,
      primaryFocus,
      bio,
      targetExams,
      examinationTrack,
      fixedCommitments,
      learningPriorities,
    } = body;

    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
      });
    }

    const [updatedPref, updatedProfile] = await Promise.all([
      prisma.userPreference.upsert({
        where: { userId },
        update: {
          ...(workingHoursStart && { workingHoursStart }),
          ...(workingHoursEnd && { workingHoursEnd }),
          ...(preferredFocusMinutes && { preferredFocusMinutes: Number(preferredFocusMinutes) }),
          ...(timeZone && { timeZone }),
          ...(theme && { theme }),
        },
        create: {
          userId,
          workingHoursStart: workingHoursStart || "08:30",
          workingHoursEnd: workingHoursEnd || "22:30",
          preferredFocusMinutes: preferredFocusMinutes ? Number(preferredFocusMinutes) : 45,
          timeZone: timeZone || "Asia/Kolkata",
          theme: theme || "amahas-signature",
        },
      }),
      prisma.profile.upsert({
        where: { userId },
        update: {
          ...(program !== undefined && { program }),
          ...(institution !== undefined && { institution }),
          ...(academicYear !== undefined && { academicYear }),
          ...(primaryFocus !== undefined && { primaryFocus }),
          ...(bio !== undefined && { bio }),
          ...(targetExams !== undefined && { targetExams }),
          ...(examinationTrack !== undefined && { examinationTrack }),
          ...(fixedCommitments !== undefined && { fixedCommitments }),
          ...(learningPriorities !== undefined && { learningPriorities }),
        },
        create: {
          userId,
          program: program || null,
          institution: institution || null,
          academicYear: academicYear || null,
          primaryFocus: primaryFocus || null,
          bio: bio || null,
          targetExams: targetExams || null,
          examinationTrack: examinationTrack || null,
          fixedCommitments: fixedCommitments || null,
          learningPriorities: learningPriorities || null,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      preferences: updatedPref,
      profile: updatedProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

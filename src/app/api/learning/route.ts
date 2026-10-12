import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiUserId } from "@/lib/auth";
import { calculateSM2 } from "@/lib/spaced-repetition";
import { searchWikipedia } from "@/lib/integrations/wikipedia";

export async function GET(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const language = searchParams.get("language");
    const wikiQuery = searchParams.get("wiki");

    if (wikiQuery) {
      const articles = await searchWikipedia(wikiQuery);
      return NextResponse.json({ articles });
    }

    const where: any = { userId };
    if (language) where.language = language;

    const [vocabularyCards, books, modules] = await Promise.all([
      prisma.vocabularyCard.findMany({
        where,
        orderBy: { nextReviewAt: "asc" },
      }),
      prisma.book.findMany({
        where: { userId },
        orderBy: { status: "asc" },
      }),
      prisma.learningModule.findMany({
        where: { userId },
        include: { items: true },
      }),
    ]);

    return NextResponse.json({
      vocabularyCards,
      books,
      modules,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST endpoint for vocabulary flashcard SM-2 review
export async function POST(req: Request) {
  try {
    const userId = await resolveApiUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { cardId, rating } = body;

    const card = await prisma.vocabularyCard.findFirst({
      where: { id: cardId, userId },
    });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const sm2 = calculateSM2({
      rating: Number(rating),
      repetitions: card.repetitions,
      intervalDays: card.intervalDays,
      easeFactor: card.easeFactor,
    });

    const updated = await prisma.vocabularyCard.update({
      where: { id: cardId },
      data: {
        repetitions: sm2.repetitions,
        intervalDays: sm2.intervalDays,
        easeFactor: sm2.easeFactor,
        nextReviewAt: sm2.nextReviewDate,
        lastStudiedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, card: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

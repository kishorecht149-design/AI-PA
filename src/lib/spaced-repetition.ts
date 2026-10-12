/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * Used for both Academic Syllabus Topics and Language Learning Flashcards.
 */

export interface SM2Input {
  rating: number; // 1 to 5 rating (1 = complete blackout, 5 = perfect recall)
  repetitions: number;
  intervalDays: number;
  easeFactor: number; // Default 2.5, minimum 1.3
}

export interface SM2Result {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: Date;
}

export function calculateSM2({
  rating,
  repetitions,
  intervalDays,
  easeFactor,
}: SM2Input): SM2Result {
  // Ensure rating is bounded between 1 and 5
  const q = Math.max(1, Math.min(5, Math.round(rating)));

  // Calculate new ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEaseFactor =
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }
  newEaseFactor = Math.round(newEaseFactor * 100) / 100;

  let newRepetitions = repetitions;
  let newIntervalDays = intervalDays;

  // Recall failure: reset repetitions to 0 and interval to 1 day
  if (q < 3) {
    newRepetitions = 0;
    newIntervalDays = 1;
  } else {
    // Recall success
    if (repetitions === 0) {
      newIntervalDays = 1;
    } else if (repetitions === 1) {
      newIntervalDays = 6;
    } else {
      newIntervalDays = Math.round(intervalDays * newEaseFactor);
    }
    newRepetitions += 1;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newIntervalDays);

  return {
    repetitions: newRepetitions,
    intervalDays: newIntervalDays,
    easeFactor: newEaseFactor,
    nextReviewDate,
  };
}

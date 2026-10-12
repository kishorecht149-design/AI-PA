import test from "node:test";
import assert from "node:assert/strict";
import { calculateSM2 } from "../src/lib/spaced-repetition.ts";

test("SM-2: calculates correct first interval on good recall", () => {
  const result = calculateSM2({
    rating: 4,
    repetitions: 0,
    intervalDays: 1,
    easeFactor: 2.5,
  });

  assert.equal(result.repetitions, 1);
  assert.equal(result.intervalDays, 1);
  assert.ok(result.easeFactor >= 2.4);
});

test("SM-2: escalates interval on second successful repetition", () => {
  const result = calculateSM2({
    rating: 5,
    repetitions: 1,
    intervalDays: 1,
    easeFactor: 2.5,
  });

  assert.equal(result.repetitions, 2);
  assert.equal(result.intervalDays, 6);
  assert.ok(result.easeFactor > 2.5);
});

test("SM-2: resets repetitions and interval on failure (rating < 3)", () => {
  const result = calculateSM2({
    rating: 2,
    repetitions: 4,
    intervalDays: 20,
    easeFactor: 2.5,
  });

  assert.equal(result.repetitions, 0);
  assert.equal(result.intervalDays, 1);
  assert.ok(result.easeFactor < 2.5);
});

test("SM-2: ease factor never drops below 1.3 threshold", () => {
  let ef = 1.4;
  for (let i = 0; i < 5; i++) {
    const res = calculateSM2({
      rating: 1,
      repetitions: 0,
      intervalDays: 1,
      easeFactor: ef,
    });
    ef = res.easeFactor;
  }
  assert.ok(ef >= 1.3);
});

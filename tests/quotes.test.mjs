import test from "node:test";
import assert from "node:assert/strict";
import { getHourlyContent, getTimeOfDayGreeting, VERIFIED_QUOTES } from "../src/lib/hourly-quotes.ts";

test("Hourly Quotes: deterministic stability within the same local hour", () => {
  // Fixed date with minute variations within the same hour
  const d1 = new Date(2026, 9, 12, 14, 5, 0); // 14:05 local
  const d2 = new Date(2026, 9, 12, 14, 45, 0); // 14:45 local

  const c1 = getHourlyContent(d1);
  const c2 = getHourlyContent(d2);

  assert.equal(c1.quote.quote, c2.quote.quote);
  assert.equal(c1.quote.author, c2.quote.author);
  assert.equal(c1.message, c2.message);
  assert.equal(c1.hour, 14);
  assert.equal(c2.hour, 14);
});

test("Hourly Quotes: updates on the next hour", () => {
  const d1 = new Date(2026, 9, 12, 14, 5, 0); // 14:05 local
  const d2 = new Date(2026, 9, 12, 15, 5, 0); // 15:05 local

  const c1 = getHourlyContent(d1);
  const c2 = getHourlyContent(d2);

  assert.notEqual(c1.hour, c2.hour);
  // Messages cycle on hour change
  assert.notEqual(c1.message, c2.message);
});

test("Hourly Quotes: all quotes have non-empty text and verified author", () => {
  for (const q of VERIFIED_QUOTES) {
    assert.ok(q.quote.length > 5);
    assert.ok(q.author.length > 2);
  }
});

test("Greetings: appropriate greeting for morning, afternoon, evening", () => {
  const morning = new Date(2026, 9, 12, 8, 0, 0);
  const afternoon = new Date(2026, 9, 12, 14, 0, 0);
  const evening = new Date(2026, 9, 12, 19, 0, 0);

  assert.ok(getTimeOfDayGreeting(morning).includes("Good morning"));
  assert.ok(getTimeOfDayGreeting(afternoon).includes("Good afternoon"));
  assert.ok(getTimeOfDayGreeting(evening).includes("Good evening"));
});

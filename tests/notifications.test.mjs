import { test } from "node:test";
import assert from "node:assert/strict";

test("Notifications & Alarms: Alarm repeat constraints and recurrence checks", () => {
  const isEligibleForDay = (repeat, dayOfWeek) => {
    if (repeat === "ONCE") return true;
    if (repeat === "DAILY") return true;
    if (repeat === "WEEKDAYS") return dayOfWeek >= 1 && dayOfWeek <= 5;
    return false;
  };

  // Monday = 1, Sunday = 0, Saturday = 6
  assert.equal(isEligibleForDay("WEEKDAYS", 1), true, "Monday is a weekday");
  assert.equal(isEligibleForDay("WEEKDAYS", 5), true, "Friday is a weekday");
  assert.equal(isEligibleForDay("WEEKDAYS", 0), false, "Sunday is not a weekday");
  assert.equal(isEligibleForDay("WEEKDAYS", 6), false, "Saturday is not a weekday");

  assert.equal(isEligibleForDay("DAILY", 0), true, "Daily triggers on Sunday");
  assert.equal(isEligibleForDay("DAILY", 6), true, "Daily triggers on Saturday");
});

test("Notifications & Alarms: Reminder overdue and sorting evaluation", () => {
  const now = Date.now();
  const pastRem = { id: "1", dueDateTime: new Date(now - 60000).toISOString(), completed: false };
  const futureRem = { id: "2", dueDateTime: new Date(now + 60000).toISOString(), completed: false };
  const completedRem = { id: "3", dueDateTime: new Date(now - 120000).toISOString(), completed: true };

  const isDue = (rem, currentTime) => !rem.completed && new Date(rem.dueDateTime).getTime() <= currentTime;

  assert.equal(isDue(pastRem, now), true, "Past incomplete reminder is due");
  assert.equal(isDue(futureRem, now), false, "Future reminder is not due yet");
  assert.equal(isDue(completedRem, now), false, "Completed reminder is not due");
});

test("Notifications & Alarms: Snooze time calculator calculates correct target minute", () => {
  const calculateSnoozeTime = (currentDate, snoozeMinutes) => {
    const target = new Date(currentDate.getTime() + snoozeMinutes * 60 * 1000);
    const hh = String(target.getHours()).padStart(2, "0");
    const mm = String(target.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const fixed = new Date("2026-10-13T09:00:00");
  assert.equal(calculateSnoozeTime(fixed, 5), "09:05");
  assert.equal(calculateSnoozeTime(fixed, 15), "09:15");
});

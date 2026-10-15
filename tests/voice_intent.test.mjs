import test from "node:test";
import assert from "node:assert/strict";
import { parseVoiceIntent } from "../src/lib/voice-intent-parser.ts";

test("Voice Intent: Task creation extraction", () => {
  const t1 = parseVoiceIntent("create task Review Raft consensus protocol");
  assert.strictEqual(t1.type, "CREATE_TASK");
  assert.strictEqual(t1.payload.title, "Review Raft consensus protocol");
  assert.strictEqual(t1.payload.priority, "MEDIUM");

  const t2 = parseVoiceIntent("add task urgent finish OS laboratory benchmark");
  assert.strictEqual(t2.type, "CREATE_TASK");
  assert.strictEqual(t2.payload.priority, "HIGH");

  const t3 = parseVoiceIntent("remind me to inspect memory leak low priority");
  assert.strictEqual(t3.type, "CREATE_TASK");
  assert.strictEqual(t3.payload.priority, "LOW");
});

test("Voice Intent: Deep Work focus session extraction", () => {
  const f1 = parseVoiceIntent("start 45 minute focus session");
  assert.strictEqual(f1.type, "START_FOCUS");
  assert.strictEqual(f1.payload.minutes, 45);

  const f2 = parseVoiceIntent("start 25 minute pomodoro with gamma waves");
  assert.strictEqual(f2.type, "START_FOCUS");
  assert.strictEqual(f2.payload.minutes, 25);
  assert.strictEqual(f2.payload.presetId, "gamma-40");

  const f3 = parseVoiceIntent("enter flow state 90 minutes play brown noise");
  assert.strictEqual(f3.type, "START_FOCUS");
  assert.strictEqual(f3.payload.minutes, 90);
  assert.strictEqual(f3.payload.presetId, "brown-noise");
});

test("Voice Intent: Quick note taking extraction", () => {
  const n1 = parseVoiceIntent("take note: Multi-head attention replaces recurrent sequence bottlenecks");
  assert.strictEqual(n1.type, "TAKE_NOTE");
  assert.ok(n1.payload.content.includes("Multi-head attention"));

  const n2 = parseVoiceIntent("save note Raft leader election requires majority quorum");
  assert.strictEqual(n2.type, "TAKE_NOTE");
});

test("Voice Intent: Reminder extraction", () => {
  const r1 = parseVoiceIntent("set reminder for Systems Conference Submission at 10:00 am");
  assert.strictEqual(r1.type, "SET_REMINDER");
  assert.ok(r1.payload.time.includes("10:00"));
});

test("Voice Intent: Workspace navigation extraction", () => {
  assert.strictEqual(parseVoiceIntent("open knowledge graph").payload.path, "/graph");
  assert.strictEqual(parseVoiceIntent("go to deep work arena").payload.path, "/focus");
  assert.strictEqual(parseVoiceIntent("show research lab").payload.path, "/research");
  assert.strictEqual(parseVoiceIntent("open tasks board").payload.path, "/tasks");
  assert.strictEqual(parseVoiceIntent("open planner").payload.path, "/planner");
  assert.strictEqual(parseVoiceIntent("open academics").payload.path, "/academics");
});

test("Voice Intent: General AI query fallback", () => {
  const q1 = parseVoiceIntent("What are the key trade-offs between Raft and Paxos?");
  assert.strictEqual(q1.type, "QUERY_AI");
  assert.ok(q1.payload.question.includes("trade-offs"));
});

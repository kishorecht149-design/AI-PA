import test from "node:test";
import assert from "node:assert/strict";
import {
  validateBehaviorCommand,
  inferBehaviorFromContent,
  ALLOWED_AUTONOMOUS_BEHAVIORS,
} from "../src/components/assistant/behaviorDirector.ts";
import { AutonomousBehaviorEngine } from "../src/components/assistant/AutonomousBehaviorEngine.ts";

test("Autonomous Behavior: Validation and clamping of director commands", () => {
  // Test invalid or null inputs
  const nullResult = validateBehaviorCommand(null);
  assert.equal(nullResult.behavior, "idle");
  assert.equal(nullResult.intensity, 0.5);
  assert.equal(nullResult.durationMs, 2500);

  // Test allowlist behavior
  const explainingCmd = validateBehaviorCommand({
    behavior: "explaining",
    intensity: 0.9,
    durationMs: 4000,
  });
  assert.equal(explainingCmd.behavior, "explaining");
  assert.equal(explainingCmd.intensity, 0.9);
  assert.equal(explainingCmd.durationMs, 4000);

  // Test intensity clamping [0.0, 1.0]
  const highIntensity = validateBehaviorCommand({
    behavior: "thinking",
    intensity: 2.5,
    durationMs: 3000,
  });
  assert.equal(highIntensity.intensity, 1.0);

  const lowIntensity = validateBehaviorCommand({
    behavior: "thinking",
    intensity: -0.5,
    durationMs: 3000,
  });
  assert.equal(lowIntensity.intensity, 0.0);

  // Test duration clamping [500, 8000]
  const longDuration = validateBehaviorCommand({
    behavior: "speaking",
    durationMs: 20000,
  });
  assert.equal(longDuration.durationMs, 8000);

  const shortDuration = validateBehaviorCommand({
    behavior: "speaking",
    durationMs: 100,
  });
  assert.equal(shortDuration.durationMs, 500);
});

test("Autonomous Behavior: Dance elimination as default and accidental safeguard", () => {
  // Default: Dance is strictly clamped to task success (never dances accidentally!)
  const accidentalDance = validateBehaviorCommand({
    behavior: "dance",
    intensity: 0.8,
    durationMs: 3000,
  });
  assert.notEqual(accidentalDance.behavior, "dance");
  assert.equal(accidentalDance.behavior, "success");

  // Only allowed when explicit user prompt authorizes dance
  const explicitDance = validateBehaviorCommand(
    {
      behavior: "dance",
      intensity: 1.0,
      durationMs: 4000,
    },
    true
  );
  assert.equal(explicitDance.behavior, "dance");
});

test("Autonomous Behavior: Heuristic and structured content extraction", () => {
  // 1. Embedded JSON tag extraction
  const rawWithTag =
    "Here is the detailed architectural breakdown.\n<behavior>{\"behavior\":\"explaining\",\"intensity\":0.85,\"durationMs\":3500}</behavior>";
  const extracted = inferBehaviorFromContent(rawWithTag, "Can you explain this?");
  assert.equal(extracted.cleanedText, "Here is the detailed architectural breakdown.");
  assert.equal(extracted.command.behavior, "explaining");
  assert.equal(extracted.command.intensity, 0.85);
  assert.equal(extracted.command.durationMs, 3500);

  // 2. Explicit dance prompt
  const danceResult = inferBehaviorFromContent(
    "Here's a quick victory dance flourish!",
    "Can you dance for me please?"
  );
  assert.equal(danceResult.command.behavior, "dance");

  // 3. Task completion
  const successResult = inferBehaviorFromContent(
    "Your 45-minute focus session has been created and all tasks are completed successfully.",
    "Schedule session"
  );
  assert.equal(successResult.command.behavior, "success");

  // 4. Code explanation
  const codeResult = inferBehaviorFromContent(
    "Here is how you implement that algorithm:\n```typescript\nconst x = 42;\n```",
    "How to code this?"
  );
  assert.equal(codeResult.command.behavior, "explaining");

  // 5. Farewell
  const goodbyeResult = inferBehaviorFromContent(
    "Have a wonderful productive evening! See you next time.",
    "Goodbye!"
  );
  assert.equal(goodbyeResult.command.behavior, "goodbye");

  // 6. Conversational default
  const defaultResult = inferBehaviorFromContent(
    "I can certainly help you review those notes.",
    "Can we look at this?"
  );
  assert.equal(defaultResult.command.behavior, "speaking");
});

test("Autonomous Behavior: Engine lifecycle and event transitions", () => {
  const engine = new AutonomousBehaviorEngine();
  assert.equal(engine.getCurrentState(), "idle");

  // User typing -> listening
  engine.onUserTyping();
  assert.equal(engine.getCurrentState(), "listening");

  // Request sent -> thinking
  engine.onRequestSent();
  assert.equal(engine.getCurrentState(), "thinking");

  // Response received with command
  engine.onResponseReceived({
    command: { behavior: "explaining", intensity: 0.8, durationMs: 2000 },
  });
  assert.equal(engine.getCurrentState(), "explaining");

  // Reset to idle
  engine.resetToIdle();
  assert.equal(engine.getCurrentState(), "idle");

  engine.dispose();
});

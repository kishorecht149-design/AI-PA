import test from "node:test";
import assert from "node:assert/strict";
import { APPLICATION_TOOLS } from "../src/lib/tools-registry.ts";

test("Tools Registry: all registered tools have valid schemas and descriptions", () => {
  const tools = Object.values(APPLICATION_TOOLS);
  assert.ok(tools.length >= 8);

  for (const tool of tools) {
    assert.ok(tool.name);
    assert.ok(tool.description);
    assert.ok(tool.parameters);
    assert.equal(tool.parameters.type, "object");
    assert.equal(typeof tool.isReadOnly, "boolean");
    assert.equal(typeof tool.execute, "function");
  }
});

test("Tools Registry: mutating tools are properly flagged as requiring user confirmation", () => {
  assert.equal(APPLICATION_TOOLS["create_task"].isReadOnly, false);
  assert.equal(APPLICATION_TOOLS["update_task_status"].isReadOnly, false);
  assert.equal(APPLICATION_TOOLS["trigger_workflow"].isReadOnly, false);

  // Read-only tools execute without manual friction
  assert.equal(APPLICATION_TOOLS["search_tasks"].isReadOnly, true);
  assert.equal(APPLICATION_TOOLS["get_schedule"].isReadOnly, true);
  assert.equal(APPLICATION_TOOLS["get_course_progress"].isReadOnly, true);
  assert.equal(APPLICATION_TOOLS["search_notes"].isReadOnly, true);
  assert.equal(APPLICATION_TOOLS["search_research_papers"].isReadOnly, true);
});

import test from "node:test";
import assert from "node:assert/strict";

test("Knowledge Graph: Starter constellation integrity", () => {
  const starterNodes = [
    { id: "sn-ai-arch", label: "Autonomous Agent Orchestrator", type: "project" },
    { id: "sn-attention-paper", label: "Attention Is All You Need", type: "paper" },
    { id: "sn-awq-paper", label: "AWQ: Activation-aware Weight Quantization", type: "paper" },
    { id: "sn-os-paging", label: "Multi-Level Paging & TLB Optimization", type: "topic" },
    { id: "sn-consensus", label: "Raft Consensus Protocol & Log Replication", type: "topic" },
    { id: "sn-spec-note", label: "Distributed Architecture & Latency Specs", type: "note" },
    { id: "sn-goal-paper", label: "Publish Systems Conference Paper", type: "goal" },
  ];

  const starterLinks = [
    { source: "sn-ai-arch", target: "sn-attention-paper" },
    { source: "sn-ai-arch", target: "sn-awq-paper" },
    { source: "sn-ai-arch", target: "sn-spec-note" },
    { source: "sn-ai-arch", target: "sn-consensus" },
    { source: "sn-os-paging", target: "sn-spec-note" },
    { source: "sn-goal-paper", target: "sn-ai-arch" },
  ];

  const nodeMap = new Map(starterNodes.map((n) => [n.id, n]));

  // Verify all links resolve to valid source and target nodes
  starterLinks.forEach((link) => {
    assert.ok(nodeMap.has(link.source), `Link source ${link.source} must exist in nodes`);
    assert.ok(nodeMap.has(link.target), `Link target ${link.target} must exist in nodes`);
  });

  // Verify multi-domain coverage
  const types = new Set(starterNodes.map((n) => n.type));
  assert.ok(types.has("project"), "Graph must contain project entities");
  assert.ok(types.has("paper"), "Graph must contain research paper entities");
  assert.ok(types.has("topic"), "Graph must contain academic topic entities");
  assert.ok(types.has("note"), "Graph must contain note entities");
  assert.ok(types.has("goal"), "Graph must contain goal entities");
});

test("Knowledge Graph: Link deduplication logic", () => {
  const links = [];
  const linkKeySet = new Set();

  const addLink = (source, target, label) => {
    if (!source || !target || source === target) return;
    const key = `${source}->${target}`;
    const reverseKey = `${target}->${source}`;
    if (linkKeySet.has(key) || linkKeySet.has(reverseKey)) return;
    linkKeySet.add(key);
    links.push({ source, target, label });
  };

  addLink("nodeA", "nodeB", "relates");
  addLink("nodeA", "nodeB", "duplicate"); // exact duplicate
  addLink("nodeB", "nodeA", "reverse_duplicate"); // reverse duplicate
  addLink("nodeA", "nodeA", "self_loop"); // self loop
  addLink("nodeA", "nodeC", "valid_edge");

  assert.strictEqual(links.length, 2, "Only 2 unique undirected edges should be preserved");
  assert.strictEqual(links[0].target, "nodeB");
  assert.strictEqual(links[1].target, "nodeC");
});

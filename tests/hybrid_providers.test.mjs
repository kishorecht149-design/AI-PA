import test from "node:test";
import assert from "node:assert/strict";
import { providerManager } from "../src/lib/providers/index.ts";
import { OllamaProvider } from "../src/lib/providers/ollama-provider.ts";
import { OpenRouterProvider } from "../src/lib/providers/openrouter-provider.ts";
import { FUTURE_SERVICE_REGISTRY } from "../src/lib/integrations/registry.ts";

test("Hybrid Providers: Routing and selection abstraction", () => {
  const openRouterProvider = providerManager.getProviderForModel("openrouter/free");
  assert.equal(openRouterProvider.id, "openrouter");

  const gemmaProvider = providerManager.getProviderForModel("google/gemini-2.0-flash-exp:free");
  assert.equal(gemmaProvider.id, "openrouter");

  const ollamaProvider = providerManager.getProviderForModel("ollama/llama3.2");
  assert.equal(ollamaProvider.id, "ollama");

  const deepseekOllama = providerManager.getProviderForModel("ollama/deepseek-r1:1.5b");
  assert.equal(deepseekOllama.id, "ollama");
});

test("Hybrid Providers: Ollama handles offline/unreachable daemons gracefully", async () => {
  const ollama = new OllamaProvider();
  // Query a non-existent port to simulate offline daemon
  const health = await ollama.checkHealth("http://127.0.0.1:54321");
  assert.equal(health.provider, "ollama");
  assert.equal(health.available, false);
  assert.ok(health.message.includes("offline") || health.message.includes("unreachable"));
});

test("Hybrid Providers: OpenRouter key validation boundary", async () => {
  // Test with empty key
  const unconfiguredProvider = new OpenRouterProvider("");
  const health = await unconfiguredProvider.checkHealth();
  assert.equal(health.provider, "openrouter");
  assert.equal(health.available, false);
  assert.ok(health.message.includes("not configured"));
});

test("Service Registry: Verification of all 8 candidate companion services", () => {
  const expectedServices = [
    "ollama",
    "langflow",
    "n8n",
    "dify",
    "anythingllm",
    "crewai",
    "comfyui",
    "librechat",
  ];

  for (const serviceId of expectedServices) {
    const service = FUTURE_SERVICE_REGISTRY[serviceId];
    assert.ok(service, `Service '${serviceId}' must be registered in FUTURE_SERVICE_REGISTRY`);
    assert.ok(service.name.length > 0);
    assert.ok(service.specificCapability.length > 0);
    assert.ok(service.securityBoundary.length > 0);
    assert.ok(service.resourceRequirements.minimumRam.length > 0);

    // Ensure all services are disabled by default
    assert.equal(
      service.isEnabledByDefault,
      false,
      `Service '${serviceId}' must be disabled by default`
    );
  }

  // Verify LibreChat is marked as reference only
  assert.equal(FUTURE_SERVICE_REGISTRY.librechat.isNecessaryForInitialRelease, false);
});

export function getAgentTools(ctx = {}) {
  return {
    wallet: {
      provider: "wdk",
      enabled: true,
      intent: "execute approved tip actions"
    },
    scoring: {
      enabled: true,
      intent: "compute engagement and risk-aligned score"
    },
    rules: {
      enabled: true,
      intent: "enforce budget and safety guardrails"
    },
    llmDecision: {
      enabled: Boolean(ctx.settings?.cloudEnabled && String(ctx.settings?.llmEndpoint || "").trim())
    },
    heuristicDecision: {
      enabled: true
    }
  };
}

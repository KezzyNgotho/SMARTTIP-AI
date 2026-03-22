import { safeToken } from "../constants";

export function applyGuardrails(ctx) {
  if (!ctx.settings.autoTip) {
    return {
      blocked: true,
      decision: {
        shouldTip: false,
        amount: 0,
        token: safeToken(ctx.settings.preferredToken, "STT"),
        reason: "Auto-tip disabled",
        confidence: 0,
        creatorRisk: 0
      },
      reason: "Guardrail: autoTip disabled"
    };
  }

  if (ctx.budget.remaining <= 0 || ctx.budget.daily <= 0) {
    return {
      blocked: true,
      decision: {
        shouldTip: false,
        amount: 0,
        token: safeToken(ctx.settings.preferredToken, "STT"),
        reason: "Budget exhausted",
        confidence: 0,
        creatorRisk: 0.5
      },
      reason: "Guardrail: budget exhausted"
    };
  }

  return { blocked: false };
}

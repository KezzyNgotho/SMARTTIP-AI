import { clamp, round2, safeToken } from "../constants";
import { requestTipDecision } from "../../wallet/llmClient";

function normalizeDecision(rawDecision, ctx) {
  const remaining = Number(ctx.budget?.remaining ?? ctx.settings?.remainingBudget ?? 0);
  const maxSingle = Number(ctx.settings?.maxSingleTip ?? 10);
  const amountLimit = Math.max(0, Math.min(remaining, maxSingle));

  const shouldTip = Boolean(rawDecision?.shouldTip);
  const rawAmount = Number(rawDecision?.amount ?? 0);
  const amount = round2(clamp(rawAmount, 0, amountLimit));

  return {
    shouldTip: shouldTip && amount > 0,
    amount: shouldTip ? amount : 0,
    token: safeToken(rawDecision?.token, ctx.settings?.preferredToken || "USDt"),
    reason: String(rawDecision?.reason || "LLM returned no reason"),
    confidence: clamp(rawDecision?.confidence ?? 0.5, 0, 1),
    creatorRisk: clamp(rawDecision?.creatorRisk ?? 0.5, 0, 1)
  };
}

export async function tryLlmDecision(ctx) {
  const cloudEnabled = Boolean(ctx.settings?.cloudEnabled);
  const endpoint = String(ctx.settings?.llmEndpoint || "").trim();

  if (!cloudEnabled || !endpoint) {
    return null;
  }

  const userPayload = {
    signal: ctx.signal,
    platform: ctx.platform,
    budget: ctx.budget,
    history: (ctx.history || []).slice(0, 20),
    constraints: {
      maxSingleTip: Number(ctx.settings?.maxSingleTip ?? 10),
      preferredToken: ctx.settings?.preferredToken || "USDt"
    }
  };

  const raw = await requestTipDecision({
    endpoint,
    apiKey: String(ctx.settings?.llmApiKey || ""),
    model: String(ctx.settings?.llmModel || "gpt-5-nano"),
    systemPrompt: ctx.settings?.llmSystemPrompt,
    userPayload
  });

  return normalizeDecision(raw, ctx);
}

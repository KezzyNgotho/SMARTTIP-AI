import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { ensureCapabilities, getCapability, listCapabilities, registerCapability } from "./capabilityRegistry";
import { safeToken } from "./constants";
import { applyBudgetPacing } from "./capabilities/budgetPacing";
import { attachDecisionExplanation } from "./capabilities/explainDecision";
import { applyGuardrails } from "./capabilities/guardrails";
import { buildHeuristicDecision } from "./capabilities/heuristicDecision";
import { tryLlmDecision } from "./capabilities/llmDecision";
import { computeCompositeScore } from "./capabilities/score";
import { assessSignalQuality } from "./capabilities/signalQuality";

const REQUIRED_CAPABILITIES = [
  "sense",
  "signalQuality",
  "score",
  "guardrails",
  "budgetPacing",
  "decide",
  "explain"
];

function registerDefaults() {
  if (listCapabilities().length > 0) {
    return;
  }

  registerCapability("sense", (input = {}) => ({
    signal: input.signal || {},
    settings: input.settings || {},
    budget: {
      remaining: Number(input.budget?.remaining ?? input.settings?.remainingBudget ?? 0),
      daily: Number(input.budget?.daily ?? input.settings?.dailyBudget ?? 0)
    },
    history: input.history || [],
    platform: input.platform || "unknown",
    reasons: []
  }));

  registerCapability("score", (ctx) => {
    const score = computeCompositeScore({
      signal: ctx.signal,
      platform: ctx.platform,
      history: ctx.history
    });

    return {
      ...ctx,
      score,
      reasons: [...ctx.reasons, `Score=${score.toFixed(2)} platform=${ctx.platform}`]
    };
  });

  registerCapability("guardrails", (ctx) => {
    const result = applyGuardrails(ctx);
    if (!result.blocked) {
      return ctx;
    }

    return {
      ...ctx,
      decision: result.decision,
      reasons: [...ctx.reasons, result.reason]
    };
  });

  registerCapability("decide", async (ctx) => {
    if (ctx.decision) {
      return ctx;
    }

    try {
      const llmDecision = await tryLlmDecision(ctx);
      if (llmDecision) {
        return {
          ...ctx,
          decision: {
            ...llmDecision,
            token: safeToken(llmDecision.token, ctx.settings.preferredToken || "USDt"),
            reason: `${llmDecision.reason} (langchain-llm)`
          },
          reasons: [...ctx.reasons, "Decision: llm capability"]
        };
      }
    } catch (error) {
      ctx = {
        ...ctx,
        reasons: [...ctx.reasons, `LLM fallback: ${error.message || "unknown error"}`]
      };
    }

    const effectiveSettings = {
      ...ctx.settings,
      maxSingleTip: Math.min(
        Number(ctx.settings?.maxSingleTip ?? 10),
        Number(ctx.pacingCap || ctx.settings?.maxSingleTip || 10)
      )
    };

    const heuristic = buildHeuristicDecision({
      signal: ctx.signal,
      settings: effectiveSettings,
      budget: ctx.budget,
      platform: ctx.platform,
      history: ctx.history
    });

    return {
      ...ctx,
      decision: {
        ...heuristic,
        token: safeToken(heuristic.token, ctx.settings.preferredToken || "USDt"),
        reason: `${heuristic.reason} (agent-layer-policy)`
      },
      reasons: [...ctx.reasons, "Decision: local policy pipeline"]
    };
  });

  registerCapability("signalQuality", (ctx) => assessSignalQuality(ctx));
  registerCapability("budgetPacing", (ctx) => applyBudgetPacing(ctx));
  registerCapability("explain", (ctx) => attachDecisionExplanation(ctx));
}

function buildPolicyAgent() {
  registerDefaults();
  ensureCapabilities(REQUIRED_CAPABILITIES);

  return RunnableSequence.from(
    REQUIRED_CAPABILITIES.map((name) => RunnableLambda.from((ctx) => getCapability(name)(ctx)))
  );
}

const policyAgent = buildPolicyAgent();

export function getRegisteredCapabilities() {
  registerDefaults();
  return listCapabilities();
}

export async function runAgentDecision(input = {}) {
  const output = await policyAgent.invoke(input);
  const settings = input.settings || {};
  const decision = output?.decision || {
    shouldTip: false,
    amount: 0,
    token: settings.preferredToken || "USDt",
    reason: "No decision produced",
    confidence: 0,
    creatorRisk: 0
  };

  return {
    ...decision,
    token: safeToken(decision.token, settings.preferredToken || "USDt")
  };
}

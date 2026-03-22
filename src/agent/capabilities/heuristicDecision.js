import { clamp, round2 } from "../constants";
import { computeEngagementScore, platformMultiplier, recentTipPenalty } from "./score";

export function buildHeuristicDecision({ signal, settings, budget, platform, history }) {
  const remaining = Number(budget.remaining ?? settings.remainingBudget ?? 0);
  const daily = Number(budget.daily ?? settings.dailyBudget ?? 0);
  const maxSingle = Number(settings.maxSingleTip || 10);

  if (remaining <= 0 || daily <= 0) {
    return {
      shouldTip: false,
      amount: 0,
      token: settings.preferredToken || "STT",
      confidence: 0,
      creatorRisk: 0.5,
      reason: "Budget exhausted"
    };
  }

  const engagement = computeEngagementScore(signal);
  const pressure = clamp(remaining / daily, 0, 1);
  const penalty = recentTipPenalty(history);
  const adjustedScore = clamp(engagement * platformMultiplier(platform) * (0.6 + pressure * 0.4) - penalty, 0, 1);

  const creatorRisk = clamp(1 - Number(signal.creatorTrust ?? 0.6), 0, 1);
  const confidence = clamp(adjustedScore * (1 - creatorRisk * 0.35), 0, 1);

  const baseAmount = round2((daily * 0.06 + maxSingle * 0.2) * adjustedScore);
  const clampedAmount = round2(clamp(baseAmount, 0.25, Math.min(maxSingle, remaining)));
  const shouldTip = adjustedScore >= 0.48 && clampedAmount > 0;

  return {
    shouldTip,
    amount: shouldTip ? clampedAmount : 0,
    token: settings.preferredToken || "STT",
    confidence,
    creatorRisk,
    reason: shouldTip
      ? `Heuristic: score ${adjustedScore.toFixed(2)} with healthy budget`
      : `Heuristic: score ${adjustedScore.toFixed(2)} below threshold`
  };
}

import { clamp, round2 } from "../constants";

export function applyBudgetPacing(ctx) {
  const daily = Number(ctx.budget?.daily ?? ctx.settings?.dailyBudget ?? 0);
  const remaining = Number(ctx.budget?.remaining ?? ctx.settings?.remainingBudget ?? 0);
  const maxSingle = Number(ctx.settings?.maxSingleTip ?? 10);

  if (daily <= 0 || maxSingle <= 0) {
    return {
      ...ctx,
      pacingCap: 0,
      reasons: [...ctx.reasons, "BudgetPacing=unavailable"]
    };
  }

  const remainingRatio = clamp(remaining / daily, 0, 1);
  const pacingFactor = remainingRatio < 0.15 ? 0.35 : remainingRatio < 0.35 ? 0.6 : 1;
  const pacingCap = round2(Math.max(0.25, maxSingle * pacingFactor));

  return {
    ...ctx,
    pacingCap,
    reasons: [
      ...ctx.reasons,
      `BudgetPacing ratio=${remainingRatio.toFixed(2)} cap=${pacingCap.toFixed(2)}`
    ]
  };
}

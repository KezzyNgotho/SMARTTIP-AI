export function attachDecisionExplanation(ctx) {
  if (!ctx.decision) {
    return ctx;
  }

  const explanation = {
    platform: ctx.platform,
    score: Number(ctx.score || 0),
    signalQuality: Number(ctx.signalQuality || 0),
    pacingCap: Number(ctx.pacingCap || 0),
    reasons: ctx.reasons || []
  };

  return {
    ...ctx,
    decision: {
      ...ctx.decision,
      explanation
    }
  };
}

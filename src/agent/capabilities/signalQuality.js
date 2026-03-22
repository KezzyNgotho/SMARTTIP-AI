import { clamp } from "../constants";

export function assessSignalQuality(ctx) {
  const signal = ctx.signal || {};
  const watchTime = Number(signal.watchTimeSeconds || 0);
  const interactions =
    Number(signal.playEvents || 0) +
    Number(signal.pauseEvents || 0) +
    Number(signal.commentCount || 0);

  const watchScore = clamp(watchTime / 120, 0, 1);
  const interactionScore = clamp(interactions / 8, 0, 1);
  const quality = clamp(watchScore * 0.55 + interactionScore * 0.45, 0, 1);

  if (quality < 0.12) {
    return {
      ...ctx,
      signalQuality: quality,
      decision: {
        shouldTip: false,
        amount: 0,
        token: ctx.settings.preferredToken || "USDt",
        reason: "Insufficient engagement signal quality",
        confidence: 0.15,
        creatorRisk: 0.5
      },
      reasons: [...ctx.reasons, `SignalQuality=${quality.toFixed(2)} low`] 
    };
  }

  return {
    ...ctx,
    signalQuality: quality,
    reasons: [...ctx.reasons, `SignalQuality=${quality.toFixed(2)}`]
  };
}

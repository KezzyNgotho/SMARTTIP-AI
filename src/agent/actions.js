export function decisionToAction(decision = {}) {
  if (!decision.shouldTip) {
    return {
      type: "NO_TIP",
      payload: {
        reason: decision.reason || "Agent chose not to tip"
      }
    };
  }

  return {
    type: "TIP_RECOMMENDED",
    payload: {
      amount: decision.amount,
      token: decision.token,
      reason: decision.reason,
      confidence: decision.confidence,
      creatorRisk: decision.creatorRisk
    }
  };
}

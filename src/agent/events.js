export const AGENT_EVENTS = {
  ENGAGEMENT_SIGNAL: "ENGAGEMENT_SIGNAL"
};

export function createEngagementEvent(payload = {}) {
  return {
    type: AGENT_EVENTS.ENGAGEMENT_SIGNAL,
    payload
  };
}

export function eventToChainInput(event = {}) {
  if (event.type !== AGENT_EVENTS.ENGAGEMENT_SIGNAL) {
    throw new Error(`Unsupported event type: ${event.type || "unknown"}`);
  }

  const payload = event.payload || {};

  return {
    signal: payload.signal || {},
    settings: payload.settings || {},
    budget: payload.budget || {},
    platform: payload.platform || "unknown",
    history: payload.history || []
  };
}

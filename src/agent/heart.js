import { AGENT_EVENTS, createEngagementEvent, eventToChainInput } from "./events";
import { orchestrateAgentDecision, orchestrateDecisionOnly } from "./orchestrator";
import { getRegisteredCapabilities } from "./runner";

export const AGENT_LAYER_NAME = "SmartTip Agent Layer";

export const AGENT_PIPELINE = ["events", "chains", "tools", "actions"];

export function describeAgentLayer() {
  return {
    name: AGENT_LAYER_NAME,
    pipeline: AGENT_PIPELINE,
    eventTypes: Object.values(AGENT_EVENTS),
    capabilities: getRegisteredCapabilities(),
    walletIntegration: "WDK via src/wallet/wallet.js"
  };
}

export async function processAgentEvent(event = createEngagementEvent()) {
  const normalizedEvent = event.type ? event : createEngagementEvent(event);
  eventToChainInput(normalizedEvent);
  return orchestrateAgentDecision(normalizedEvent);
}

export async function runSmartTipAgent(input = {}) {
  return orchestrateDecisionOnly(input);
}

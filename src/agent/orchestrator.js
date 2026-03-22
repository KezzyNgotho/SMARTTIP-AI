import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { decisionToAction } from "./actions";
import { createEngagementEvent, eventToChainInput } from "./events";
import { runAgentDecision } from "./runner";
import { getAgentTools } from "./tools";

function orchestratorLog(step, meta = {}) {
  console.log("[SmartTip][Orchestrator]", new Date().toISOString(), step, meta);
}

export function buildDecisionOrchestrator() {
  const receiveEvent = RunnableLambda.from((input = {}) => {
    const event = input.type ? input : createEngagementEvent(input);
    orchestratorLog("event:received", { type: event.type });
    return { event };
  });

  const routeThroughChains = RunnableLambda.from(async (state) => {
    const chainInput = eventToChainInput(state.event);
    orchestratorLog("chain:start", { platform: chainInput.platform, historySize: chainInput.history.length });
    const decision = await runAgentDecision(chainInput);
    orchestratorLog("chain:decision", {
      shouldTip: decision.shouldTip,
      amount: decision.amount,
      token: decision.token,
      reason: decision.reason
    });
    return {
      ...state,
      chainInput,
      decision
    };
  });

  const callTools = RunnableLambda.from((state) => {
    const tools = getAgentTools(state.chainInput);
    orchestratorLog("tools:resolved", tools);
    return {
      ...state,
      tools
    };
  });

  const mapAction = RunnableLambda.from((state) => {
    const action = decisionToAction(state.decision);
    orchestratorLog("action:mapped", { type: action.type });
    return {
      ...state,
      action
    };
  });

  return RunnableSequence.from([receiveEvent, routeThroughChains, callTools, mapAction]);
}

const orchestrator = buildDecisionOrchestrator();

export async function orchestrateAgentDecision(input = {}) {
  orchestratorLog("run:start");
  return orchestrator.invoke(input);
}

export async function orchestrateDecisionOnly(input = {}) {
  const result = await orchestrateAgentDecision(input);
  return result.decision;
}

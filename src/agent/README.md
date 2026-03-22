# Agent Layer (System Heart)

This folder is the core decision engine for SmartTip.

Architecture pattern:

Events -> Chains -> Tools -> Actions

## Agent = Orchestrator (LangChain)

The LangChain orchestrator in orchestrator.js is the control center.

- Receives events.
- Routes them through chains.
- Calls tools (wallet, scoring, rules, optional LLM).
- Returns a decision.

## Purpose

- Normalize and evaluate engagement signal input.
- Enforce tip safety guardrails and budget limits.
- Produce a tip decision through a capability pipeline.
- Integrate optional cloud LLM reasoning with local fallback.

## Files

- index.js: Public exports for the agent layer.
- heart.js: Canonical heart entry and metadata for the agent layer.
- orchestrator.js: LangChain orchestrator implementing the end-to-end flow.
- runner.js: LangChain RunnableSequence orchestration.
- events.js: Event contracts and event-to-chain transformation.
- tools.js: Tooling context for decision flow (LLM and heuristic availability).
- actions.js: Maps decisions into executable action intents.
- capabilityRegistry.js: Runtime capability registration and lookup.
- constants.js: Shared token and numeric safety helpers.
- platform.js: Hostname-to-platform inference.
- capabilities/score.js: Engagement and platform score logic.
- capabilities/guardrails.js: Auto-tip and budget protection checks.
- capabilities/heuristicDecision.js: Local deterministic decision policy.
- capabilities/llmDecision.js: Optional cloud LLM decision capability.

## Pipeline

1. events: normalize inbound signal into a strict agent event.
2. chains: run the LangChain capability sequence.
3. tools: expose which decision tools were active.
4. actions: map decision to action intent (TIP_RECOMMENDED or NO_TIP).

If cloud LLM is disabled or fails, the pipeline falls back to local heuristic policy.

## Wallet Integration

Tip execution uses WDK via src/wallet/wallet.js.

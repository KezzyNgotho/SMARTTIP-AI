# SmartTip Autonomous Agent

SmartTip is an autonomous tipping agent system delivered through a Chrome Extension + React dashboard. It continuously watches supported creator platforms, reasons over live engagement signals through a capability-based agent pipeline, and executes blockchain micro-tips on Ethereum Sepolia.

It is not just a static DApp UI. SmartTip includes autonomous sensing, decisioning, guardrails, pacing, and execution loops.

## What This Demo Shows

- Autonomous platform monitoring (YouTube, Rumble, Twitch, TikTok)
- Autonomous agent-based tip decisioning (quality, scoring, guardrails, pacing, explainability)
- Wallet-driven token transfers (STT on Sepolia)
- Live dashboard visibility (watch state, signal counts, tip history, latest tx hash)

## Technologies Used

### Frontend + Extension

- React 18
- Vite 5
- Chrome Extension Manifest V3
- Content script + background service worker architecture

### Agent + Decisioning

- LangChain core (`@langchain/core`)
- Capability pipeline with staged decision flow
- Local heuristic fallback + optional OpenAI-compatible cloud decision API

### Blockchain + Wallet

- Ethereum Sepolia testnet
- WDK EVM wallet integration (`@tetherto/wdk-wallet-evm`)
- ERC-20 custom test token (STT)
- Hardhat token project in `smart-tip-token/`

## Current Token Configuration (Demo)

- Token: SmartTip Token (STT)
- Network: Ethereum Sepolia (`chainId: 11155111`)
- Token Contract: `0x9333Cfe4Ad586e3450a3234D24F03131b8FBD9C2`
- Deployer/Admin: `0xBAF150E65998967bd1AeAB4f593420D9fA4F9229`
- Explorer: https://sepolia.etherscan.io/address/0x9333Cfe4Ad586e3450a3234D24F03131b8FBD9C2

## Architecture Overview

1. `src/contentScript.js`
- Detects active video/live context
- Tracks watch time, play/pause activity, comment/chat spikes
- Sends `SMARTTIP_ENGAGEMENT_UPDATE` to background

2. `src/background.js`
- Maintains global agent status + platform monitor
- Runs decision flow via `decideTip`
- Applies safety checks and recipient wallet validation
- Executes transfers with `sendTip`
- Persists tip history + budget updates

3. `src/agent/runner.js`
- Capability chain:
  - sense
  - signalQuality
  - score
  - guardrails
  - budgetPacing
  - decide
  - explain

4. `src/components/Dashboard.jsx`
- Dashboard/Settings/History tabs
- Live detection status block
- Platform monitoring grid
- Latest transaction hash with explorer link

## System Structure

### Layered Structure

1. Presentation Layer
- React UI for dashboard, settings, history, and overlay
- Extension popup entrypoint and web dashboard view

2. Extension Runtime Layer
- Content script runs on supported creator platforms
- Background service worker coordinates events, decisions, and transfers

3. Agent Decision Layer
- Capability-based decision pipeline (sense -> score -> guardrails -> pacing -> decide -> explain)
- Supports local heuristic policy and optional cloud LLM policy

4. Wallet + Blockchain Layer
- WDK EVM wallet integration for transfer execution
- Sepolia network targeting
- STT ERC-20 token as the default demo tipping asset

5. Persistence Layer
- Chrome local storage / localStorage fallback
- Stores budgets, settings, wallet metadata, and tip history

### Runtime Event Flow

1. Platform page loads -> content script initializes.
2. Content script detects video/live state and engagement signals.
3. Signals are sent to background (`SMARTTIP_ENGAGEMENT_UPDATE`).
4. Background invokes agent decision pipeline.
5. Guardrails validate budget + recipient wallet.
6. If approved, wallet transfer executes on Sepolia.
7. Tip result is saved to history + reflected in dashboard.

### Folder Structure (High-Level)

```text
smarttip-dapp/
  public/
    manifest.json                # Chrome MV3 manifest
    icon16.png, icon48.png, icon128.png

  scripts/
    prepare-extension.mjs        # Copies manifest/icons into dist

  src/
    agent/
      capabilities/              # scoring, quality, pacing, explainability
      runner.js                  # capability registration + orchestration
      orchestrator.js            # Events -> Chains -> Tools -> Actions

    components/
      Dashboard.jsx              # tabs: dashboard/settings/history
      Overlay.jsx
      Settings.jsx               # standalone settings component (optional)

    pages/
      DashboardPage.jsx
      LandingPage.jsx

    wallet/
      wallet.js                  # WDK integration + transfer execution
      storage.js                 # settings/history persistence
      agentLogic.js              # compatibility bridge to agent layer
      llmClient.js               # optional cloud LLM client

    background.js                # service worker controller
    contentScript.js             # platform signal collector
    App.jsx                      # routes + shell

  smart-tip-token/
    contracts/SmartTipToken.sol  # STT contract (AccessControl roles)
    scripts/deploy.js            # Sepolia deployment script
    hardhat.config.js

  README.md
```

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Build extension output (recommended)

```bash
npm run build:extension
```

3. Load extension in Chrome

- Open `chrome://extensions`
- Enable Developer Mode
- Click `Load unpacked`
- Select this folder:

`C:\Users\kezie\Desktop\AI\smarttip-dapp\dist`

4. Optional: run development watchers

```bash
npm run start:all
```

## Demo Script (Step-by-Step)

1. Open SmartTip popup and go to Settings
- Preferred token: `STT`
- Set a valid Sepolia `Recipient Wallet` (`0x...`)
- Ensure `Auto-tip` is enabled

2. Open a supported platform tab (video/live)
- YouTube, Rumble, Twitch, or TikTok
- Keep the tab active with real playback

3. Open Dashboard tab
- Verify `Watching: <platform>` appears
- Check `Live Detection Status`:
  - Video detected: yes
  - Playing: yes
  - Live: yes/no depending on stream

4. Observe real-time metrics
- Platform monitor ready/signal counts increase
- Watch time and comment metrics update

5. Confirm tip execution
- Tip appears in History
- Latest transaction hash appears in dashboard
- Click hash to open Sepolia Etherscan

## Project Structure

- `public/manifest.json` - extension manifest (MV3)
- `src/background.js` - background orchestration and tip execution
- `src/contentScript.js` - platform signal collection
- `src/components/` - dashboard/settings/history UI
- `src/agent/` - decision pipeline and capabilities
- `src/wallet/` - wallet integration, settings, LLM client
- `smart-tip-token/` - Hardhat token project for STT

## Cloud LLM Mode (Optional)

Keep `cloudEnabled` off for deterministic local policy.

To enable cloud decisioning in Settings:

- `cloudEnabled: true`
- `llmEndpoint`: OpenAI-compatible endpoint
- `llmModel`: model name
- `llmApiKey`: key if required
- `llmSystemPrompt`: strict JSON policy prompt

If cloud mode fails, SmartTip falls back to local heuristic logic.

## Troubleshooting

### "Could not load manifest"

Run:

```bash
npm run build:extension
```

Then ensure `dist/` contains:

- `manifest.json`
- `contentScript.js`
- `background.js`
- `icon16.png`, `icon48.png`, `icon128.png`

### No tips showing yet

- Confirm recipient wallet is set and valid (`0x...`)
- Confirm playback is active long enough to accumulate signals
- Check dashboard `Live Detection Status`
- Confirm budget and auto-tip settings allow transfers

## Security Notes

- Never commit private keys or secrets
- Use Sepolia test wallets only for demo
- Keep only small test balances in demo wallets

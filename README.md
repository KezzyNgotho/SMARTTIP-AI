# SmartTip DApp

SmartTip is a Chrome Extension + React dashboard that watches supported creator platforms, evaluates engagement signals with an agent pipeline, and executes blockchain micro-tips on Ethereum Sepolia.

## What This Demo Shows

- Real platform monitoring (YouTube, Rumble, Twitch, TikTok)
- Agent-based tip decisioning (quality, scoring, guardrails, pacing, explainability)
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

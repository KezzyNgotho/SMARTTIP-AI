import { decideTip, inferPlatform } from "./wallet/agentLogic";
import { supportedPlatforms } from "./core/platforms";
import { sendTip } from "./wallet/wallet";
import {
  appendTipHistory,
  getSettings,
  getTipHistory,
  saveSettings
} from "./wallet/storage";

function bgLog(step, meta = {}) {
  console.log("[SmartTip][Background]", new Date().toISOString(), step, meta);
}

function isEvmAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

const agentStatus = {
  lastPlatform: "unknown",
  lastHostname: "",
  lastCreator: "",
  lastSignalAt: 0,
  lastTabId: null,
  lastError: "",
  lastSignal: {
    isVideoDetected: false,
    isPlaying: false,
    isLive: false,
    watchTimeSeconds: 0,
    commentCount: 0,
    chatSpikeScore: 0,
    pageUrl: ""
  },
  platformMonitor: {}
};

const platformMonitor = Object.fromEntries(
  [...supportedPlatforms.map((p) => p.id), "unknown"].map((id) => [
    id,
    {
      detected: false,
      readyCount: 0,
      signalCount: 0,
      lastSeenAt: 0,
      lastHostname: ""
    }
  ])
);

function markPlatformActivity(hostname, activityType = "signal") {
  const platform = inferPlatform(hostname || "");
  const current = platformMonitor[platform] || {
    detected: false,
    readyCount: 0,
    signalCount: 0,
    lastSeenAt: 0,
    lastHostname: ""
  };

  const now = Date.now();
  const next = {
    ...current,
    detected: true,
    lastSeenAt: now,
    lastHostname: hostname || ""
  };

  if (activityType === "ready") {
    next.readyCount += 1;
  } else {
    next.signalCount += 1;
  }

  platformMonitor[platform] = next;
  agentStatus.platformMonitor = { ...platformMonitor };
  bgLog("monitor:platform", {
    platform,
    activityType,
    readyCount: next.readyCount,
    signalCount: next.signalCount
  });

  return platform;
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await getSettings();
  await saveSettings(current);
  console.log("SmartTip extension installed.");
  agentStatus.platformMonitor = { ...platformMonitor };
  bgLog("installed", { autoTip: current.autoTip, cloudEnabled: current.cloudEnabled });
});

async function handleEngagement(message, sender, options = {}) {
  bgLog("engagement:received", { fromTab: sender?.tab?.id ?? null });
  const [settings, history] = await Promise.all([
    getSettings(),
    getTipHistory()
  ]);
  const hostname = message.payload?.hostname || sender?.url || "";
  const platform = markPlatformActivity(hostname, "signal");
  const creatorName = message.payload?.creator || "Unknown Creator";

  agentStatus.lastPlatform = platform;
  agentStatus.lastHostname = hostname;
  agentStatus.lastCreator = creatorName;
  agentStatus.lastSignalAt = Date.now();
  agentStatus.lastTabId = sender?.tab?.id ?? null;
  agentStatus.lastError = "";
  agentStatus.lastSignal = {
    isVideoDetected: Boolean(message.payload?.isVideoDetected),
    isPlaying: Boolean(message.payload?.isPlaying),
    isLive: Boolean(message.payload?.isLive),
    watchTimeSeconds: Number(message.payload?.watchTimeSeconds || 0),
    commentCount: Number(message.payload?.commentCount || 0),
    chatSpikeScore: Number(message.payload?.chatSpikeScore || 0),
    pageUrl: String(message.payload?.pageUrl || "")
  };
  bgLog("engagement:context", { platform, creatorName, historySize: history.length });

  const decision = await decideTip({
    signal: message.payload,
    platform,
    settings,
    budget: {
      remaining: settings.remainingBudget,
      daily: settings.dailyBudget
    },
    history
  });

  bgLog("engagement:decision", {
    shouldTip: decision.shouldTip,
    amount: decision.amount,
    token: decision.token,
    reason: decision.reason
  });

  if (!decision.shouldTip) {
    bgLog("engagement:no-tip", { reason: decision.reason });
    return { tipped: false, decision };
  }

  if (options.dryRun) {
    bgLog("engagement:dry-run", {
      shouldTip: decision.shouldTip,
      amount: decision.amount,
      token: decision.token
    });
    return {
      tipped: false,
      dryRun: true,
      decision,
      note: "Dry run only. No transfer executed."
    };
  }

  const allowedAmount = Math.min(
    Number(decision.amount || 0),
    Number(settings.maxSingleTip || 10),
    Number(settings.remainingBudget || 0)
  );

  if (allowedAmount <= 0) {
    bgLog("engagement:blocked", { reason: "invalid allowed amount" });
    return {
      tipped: false,
      decision: {
        ...decision,
        shouldTip: false,
        reason: "Safety gate blocked invalid amount or exhausted budget"
      }
    };
  }

  const resolvedRecipient = isEvmAddress(message.payload?.creatorWallet)
    ? message.payload.creatorWallet
    : String(settings.recipientWallet || "").trim();

  if (!isEvmAddress(resolvedRecipient)) {
    bgLog("engagement:blocked", { reason: "missing recipient wallet" });
    return {
      tipped: false,
      decision: {
        ...decision,
        shouldTip: false,
        reason: "Set a valid Recipient Wallet in Settings to enable real tipping"
      }
    };
  }

  const tx = await Promise.race([
    sendTip({
      recipient: resolvedRecipient,
      amount: allowedAmount,
      token: decision.token,
      memo: `SmartTip ${platform}`
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Tip transfer timed out. Try again.")), 12000)
    )
  ]);

  bgLog("engagement:tip-sent", { txHash: tx.txHash, allowedAmount, token: decision.token });

  const nextSettings = {
    ...settings,
    remainingBudget: Number((settings.remainingBudget - allowedAmount).toFixed(2))
  };

  const tipRecord = {
    id: `${Date.now()}`,
    creator: creatorName,
    platform,
    amount: allowedAmount,
    token: decision.token,
    recipient: resolvedRecipient,
    txHash: tx.txHash,
    reason: decision.reason,
    confidence: decision.confidence,
    creatorRisk: decision.creatorRisk,
    timestamp: Date.now()
  };

  await saveSettings(nextSettings);
  await appendTipHistory(tipRecord);

  bgLog("engagement:state-updated", { remainingBudget: nextSettings.remainingBudget });

  if (sender?.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, {
      type: "TIP_TRIGGERED",
      payload: tipRecord
    });
  }

  return { tipped: true, tip: tipRecord, budget: nextSettings.remainingBudget };
}

async function triggerLiveCheck() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs?.[0];

  if (!activeTab?.id) {
    throw new Error("No active tab available for live check.");
  }

  const activeUrl = String(activeTab.url || "").toLowerCase();
  const isSupportedTab = ["youtube.com", "rumble.com", "twitch.tv", "tiktok.com"].some((host) =>
    activeUrl.includes(host)
  );

  if (!isSupportedTab) {
    throw new Error("Active tab is not a supported platform. Open YouTube, Rumble, Twitch, or TikTok.");
  }

  let snapshot;
  try {
    snapshot = await chrome.tabs.sendMessage(activeTab.id, {
      type: "SMARTTIP_REQUEST_LIVE_SNAPSHOT"
    });
  } catch (error) {
    throw new Error(
      "SmartTip content script is not active on this tab yet. Refresh the platform tab and try again."
    );
  }

  if (!snapshot?.ok || !snapshot?.payload) {
    throw new Error("No live snapshot received from content script.");
  }

  return handleEngagement(
    {
      type: "SMARTTIP_ENGAGEMENT_UPDATE",
      payload: snapshot.payload
    },
    {
      tab: activeTab,
      url: activeTab.url || ""
    },
    { dryRun: true }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  bgLog("message:received", { type: message?.type || "unknown" });
  if (message?.type === "SMARTTIP_PING") {
    sendResponse({ ok: true, source: "background" });
    return true;
  }

  if (message?.type === "SMARTTIP_ENGAGEMENT_UPDATE") {
    handleEngagement(message, sender)
      .then((result) => {
        bgLog("message:engagement-response", { tipped: result.tipped });
        sendResponse({ ok: true, ...result });
      })
      .catch((error) => {
        agentStatus.lastError = error.message;
        bgLog("message:engagement-error", { message: error.message });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message?.type === "SMARTTIP_TRIGGER_LIVE_CHECK") {
    triggerLiveCheck()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => {
        agentStatus.lastError = error.message;
        bgLog("message:live-check-error", { message: error.message });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message?.type === "SMARTTIP_CONTENTSCRIPT_READY") {
    const hostname = message.payload?.hostname || sender?.url || "";
    agentStatus.lastPlatform = markPlatformActivity(hostname, "ready");
    agentStatus.lastHostname = hostname;
    agentStatus.lastCreator = message.payload?.creator || agentStatus.lastCreator;
    agentStatus.lastSignalAt = Date.now();
    agentStatus.lastTabId = sender?.tab?.id ?? null;
    agentStatus.lastError = "";

    sendResponse({ ok: true, status: agentStatus });
    return true;
  }

  if (message?.type === "SMARTTIP_GET_AGENT_STATUS") {
    sendResponse({ ok: true, status: agentStatus });
    return true;
  }

  if (message?.type === "SMARTTIP_GET_HISTORY") {
    getTipHistory()
      .then((history) => sendResponse({ ok: true, history }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "SMARTTIP_GET_SETTINGS") {
    getSettings()
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "SMARTTIP_SAVE_SETTINGS") {
    saveSettings(message.payload)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

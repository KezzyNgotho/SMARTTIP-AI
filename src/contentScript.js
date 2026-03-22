function getCreatorName() {
  const fallback = "Live Creator";
  const selectors = ["#channel-name", "[data-a-target='stream-title']", "h1"];

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node?.textContent?.trim()) {
      return node.textContent.trim().slice(0, 60);
    }
  }

  return fallback;
}

function getCommentCountEstimate() {
  const containers = [
    document.querySelector("#comments"),
    document.querySelector("[data-a-target='chat-scrollable-area__message-container']"),
    document.querySelector("[class*='comment']")
  ].filter(Boolean);

  if (!containers.length) {
    return 0;
  }

  return containers.reduce((total, container) => total + (container.children?.length || 0), 0);
}

function showSmartTipToast(message) {
  const id = "smarttip-toast";
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  // Container for the toast
  const toast = document.createElement("div");
  toast.id = id;
  toast.style.position = "fixed";
  toast.style.right = "16px";
  toast.style.bottom = "16px";
  toast.style.zIndex = "2147483647";
  toast.style.padding = "12px 14px";
  toast.style.background = "linear-gradient(135deg, #0a7f49 0%, #078c44 100%)";
  toast.style.color = "#ffffff";
  toast.style.borderRadius = "8px";
  toast.style.fontSize = "13px";
  toast.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset";
  toast.style.maxWidth = "320px";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "10px";
  toast.style.fontWeight = "600";

  // Message text
  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;
  messageSpan.style.flex = "1";

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.background = "rgba(255,255,255,0.2)";
  closeBtn.style.border = "none";
  closeBtn.style.color = "#ffffff";
  closeBtn.style.fontSize = "16px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.padding = "2px 6px";
  closeBtn.style.borderRadius = "4px";
  closeBtn.style.transition = "background 150ms ease";
  closeBtn.style.fontWeight = "700";
  closeBtn.style.lineHeight = "1";

  closeBtn.onmouseover = () => {
    closeBtn.style.background = "rgba(255,255,255,0.3)";
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.background = "rgba(255,255,255,0.2)";
  };

  closeBtn.onclick = () => {
    toast.remove();
  };

  toast.appendChild(messageSpan);
  toast.appendChild(closeBtn);
  document.body.appendChild(toast);

  // No auto-dismiss - stays visible until user closes it or page reload
}

function inferPlatformFromHost(hostname = "") {
  const value = String(hostname).toLowerCase();
  if (value.includes("youtube")) return "youtube";
  if (value.includes("rumble")) return "rumble";
  if (value.includes("twitch")) return "twitch";
  if (value.includes("tiktok")) return "tiktok";
  return "unknown";
}

function findPotentialCreatorWallet() {
  const bodyText = document.body?.innerText || "";
  const match = bodyText.match(/0x[a-fA-F0-9]{40}/);
  return match?.[0] || "";
}

function inferLiveSignal(video, platform) {
  if (!video) {
    return false;
  }

  const durationLooksLive = !Number.isFinite(video.duration) || video.duration === Infinity;
  if (durationLooksLive) {
    return true;
  }

  const liveTextSelectors = [
    "[aria-label*='Live' i]",
    "[class*='live' i]",
    "[data-a-target*='live' i]",
    "[id*='live' i]"
  ];

  const hasLiveBadge = liveTextSelectors.some((selector) => {
    return Array.from(document.querySelectorAll(selector)).some((node) => {
      const text = String(node?.textContent || "").toLowerCase();
      return text.includes("live") || text.includes("watching now");
    });
  });

  if (hasLiveBadge) {
    return true;
  }

  const href = String(globalThis.location.href || "").toLowerCase();
  if (platform === "twitch") {
    return /twitch\.tv\/[a-z0-9_\-]+$/i.test(href);
  }

  if (platform === "youtube") {
    return href.includes("/live") || href.includes("live_chat");
  }

  return false;
}

(function bootstrapSmartTipEngagement() {
  if (!globalThis.chrome?.runtime?.sendMessage) {
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: "SMARTTIP_CONTENTSCRIPT_READY",
      payload: {
        hostname: globalThis.location.hostname,
        creator: getCreatorName()
      }
    },
    () => {
      void chrome.runtime.lastError;
    }
  );

  const platform = inferPlatformFromHost(globalThis.location.hostname);
  if (platform !== "unknown") {
    showSmartTipToast(`SmartTip monitoring active on ${platform}`);
  }

  const state = {
    watchTimeSeconds: 0,
    playEvents: 0,
    pauseEvents: 0,
    commentCount: 0,
    chatSpikeScore: 0,
    creatorTrust: 0.7,
    isVideoDetected: false,
    isPlaying: false,
    isLive: false,
    videoCurrentTime: 0,
    pageUrl: globalThis.location.href
  };

  let activeVideoElement = null;
  let engagementTimerId = null;
  let heartbeatTimerId = null;
  let lastCommentCount = 0;

  function clearEngagementTimer() {
    if (engagementTimerId) {
      clearInterval(engagementTimerId);
      engagementTimerId = null;
    }
  }

  function updateVideoSignals(video) {
    const currentPlatform = inferPlatformFromHost(globalThis.location.hostname);
    state.isVideoDetected = Boolean(video);
    state.isPlaying = Boolean(video && !video.paused && !video.ended);
    state.isLive = inferLiveSignal(video, currentPlatform);
    state.videoCurrentTime = Number(video?.currentTime || 0);
    state.pageUrl = globalThis.location.href;
  }

  const getSnapshotPayload = () => ({
    ...state,
    hostname: globalThis.location.hostname,
    creator: getCreatorName(),
    creatorWallet: findPotentialCreatorWallet()
  });

  const sendSnapshot = (video = activeVideoElement) => {
    state.commentCount = getCommentCountEstimate();
    updateVideoSignals(video);
    const payload = getSnapshotPayload();

    chrome.runtime.sendMessage(
      {
        type: "SMARTTIP_ENGAGEMENT_UPDATE",
        payload
      },
      () => {
        void chrome.runtime.lastError;
      }
    );

    return payload;
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SMARTTIP_REQUEST_LIVE_SNAPSHOT") {
      const payload = sendSnapshot();
      sendResponse({ ok: true, payload });
      return true;
    }

    if (message?.type === "TIP_TRIGGERED") {
      const tip = message.payload || {};
      const amount = Number(tip.amount || 0).toFixed(2);
      const token = tip.token || "USDt";
      const creator = tip.creator || getCreatorName();
      showSmartTipToast(`SmartTip tipped ${amount} ${token} to ${creator}`);
      sendResponse?.({ ok: true });
      return true;
    }

    return false;
  });

  function attachToVideo(video) {
    if (!video || video.dataset.smarttipAttached === "1") {
      return;
    }

    activeVideoElement = video;
    clearEngagementTimer();

    video.dataset.smarttipAttached = "1";

    video.addEventListener("play", () => {
      state.playEvents += 1;
      updateVideoSignals(video);
    });

    video.addEventListener("pause", () => {
      state.pauseEvents += 1;
      updateVideoSignals(video);
    });

    video.addEventListener("ended", () => {
      updateVideoSignals(video);
    });

    engagementTimerId = setInterval(() => {
      if (!video.paused) {
        state.watchTimeSeconds += 15;
      }

      const comments = getCommentCountEstimate();
      const delta = comments - lastCommentCount;
      if (delta > 3) {
        state.chatSpikeScore = Math.min(1, state.chatSpikeScore + 0.15);
      } else {
        state.chatSpikeScore = Math.max(0, state.chatSpikeScore - 0.05);
      }

      lastCommentCount = comments;
      sendSnapshot(video);
    }, 15000);

    // Send a first snapshot quickly so background can confirm monitoring is live.
    sendSnapshot(video);
  }

  function detectAndAttachVideo() {
    const candidateVideos = Array.from(document.querySelectorAll("video"));
    if (!candidateVideos.length) {
      activeVideoElement = null;
      updateVideoSignals(null);
      sendSnapshot(null);
      return;
    }

    // Prefer currently playing video, else first visible one.
    const playingVideo = candidateVideos.find((video) => !video.paused && !video.ended);
    const visibleVideo = candidateVideos.find((video) => {
      const rect = video.getBoundingClientRect?.() || { width: 0, height: 0 };
      return rect.width > 120 && rect.height > 80;
    });

    const selectedVideo = playingVideo || visibleVideo || candidateVideos[0];
    attachToVideo(selectedVideo);
  }

  function notifyReadyState() {
    chrome.runtime.sendMessage(
      {
        type: "SMARTTIP_CONTENTSCRIPT_READY",
        payload: {
          hostname: globalThis.location.hostname,
          creator: getCreatorName()
        }
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  }

  function handleNavigationChange() {
    notifyReadyState();
    detectAndAttachVideo();
  }

  const originalPushState = history.pushState;
  history.pushState = function pushStatePatched(...args) {
    const result = originalPushState.apply(this, args);
    setTimeout(handleNavigationChange, 150);
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function replaceStatePatched(...args) {
    const result = originalReplaceState.apply(this, args);
    setTimeout(handleNavigationChange, 150);
    return result;
  };

  globalThis.addEventListener("popstate", () => {
    setTimeout(handleNavigationChange, 150);
  });

  const observer = new MutationObserver(() => {
    detectAndAttachVideo();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  heartbeatTimerId = setInterval(() => {
    sendSnapshot(activeVideoElement);
  }, 20000);

  handleNavigationChange();
})();

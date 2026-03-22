import { useEffect, useState } from "react";
import { connectWallet, generateWallet, importWallet } from "../wallet/wallet";
import { getPublicSettings, getTipHistory, savePublicSettings } from "../wallet/storage";

function hasExtensionRuntimeMessaging() {
  return Boolean(
    globalThis.chrome?.runtime?.id &&
      typeof globalThis.chrome?.runtime?.sendMessage === "function"
  );
}

export default function Dashboard() {
  const supportedPlatforms = ["youtube", "rumble", "twitch", "tiktok"];
  const [wallet, setWallet] = useState(null);
  const [settings, setSettings] = useState(null);
  const [editSettings, setEditSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [agentStatus, setAgentStatus] = useState(null);
  const [seedPhrase, setSeedPhrase] = useState("");
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [seedInput, setSeedInput] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [settingsSaved, setSettingsSaved] = useState(false);

  async function loadDashboardData() {
    const [storedSettings, storedHistory] = await Promise.all([
      getPublicSettings(),
      getTipHistory()
    ]);
    setSettings(storedSettings);
    setEditSettings({ ...storedSettings });
    setHistory(storedHistory);
  }

  const totalTips = history.length;
  const platformMonitor = agentStatus?.platformMonitor || {};
  const activePlatformEntry = Object.entries(platformMonitor)
    .filter(([, monitor]) =>
      Boolean(monitor?.detected || monitor?.readyCount > 0 || monitor?.signalCount > 0)
    )
    .sort((a, b) => Number(b?.[1]?.lastSeenAt || 0) - Number(a?.[1]?.lastSeenAt || 0))[0];
  const activeWatchingPlatform = activePlatformEntry?.[0] || "idle";
  const isWatchingActive = activeWatchingPlatform !== "idle";
  const totalAmount = history
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    .toFixed(2);
  const latestTip = history[0] || null;
  const latestTxHash = latestTip?.txHash || "";
  const sepoliaExplorerBase = "https://sepolia.etherscan.io/tx/";
  const avgConfidence = totalTips
    ? (
        history.reduce((sum, item) => sum + Number(item.confidence || 0), 0) /
        totalTips
      ).toFixed(2)
    : "0.00";

  useEffect(() => {
    loadDashboardData();
    handleConnect();

    let timerId;
    if (hasExtensionRuntimeMessaging()) {
      loadAgentStatus();
      timerId = setInterval(loadAgentStatus, 5000);
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, []);

  function loadAgentStatus() {
    if (!hasExtensionRuntimeMessaging()) {
      setAgentStatus(null);
      return;
    }

    try {
      chrome.runtime.sendMessage({ type: "SMARTTIP_GET_AGENT_STATUS" }, (response) => {
        if (chrome.runtime.lastError) {
          return;
        }

        if (response?.ok && response?.status) {
          setAgentStatus(response.status);
        }
      });
    } catch (error) {
      setAgentStatus(null);
      console.warn("Extension messaging unavailable in web mode:", error.message);
    }
  }

  function getPlatformTone(platform) {
    const value = String(platform || "unknown").toLowerCase();
    return supportedPlatforms.includes(value) ? "good" : "warn";
  }

  async function handleGenerateWallet() {
    const result = await generateWallet();

    if (result.ok) {
      setSeedPhrase(result.seedPhrase);
      await handleConnect();
    }
  }

  async function handleImportWallet() {
    if (!seedInput.trim()) {
      return;
    }

    const result = await importWallet(seedInput.trim());

    if (result.ok) {
      setSeedPhrase("");
      setSeedInput("");
      setShowSeedInput(false);
      await handleConnect();
    }
  }

  async function handleConnect() {
    const data = await connectWallet();
    setWallet(data);
  }

  async function handleSaveSettings() {
    if (!editSettings) return;
    const next = {
      ...editSettings,
      remainingBudget: Number(
        Math.min(editSettings.remainingBudget, editSettings.dailyBudget).toFixed(2)
      )
    };
    await savePublicSettings(next);
    setSettings(next);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  function updateSetting(key, value) {
    if (!editSettings) return;
    setEditSettings({ ...editSettings, [key]: value });
    setSettingsSaved(false);
  }

  return (
    <div className="dashboard-container">
      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Settings
        </button>
        <button
          className={`tab-button ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📜 History
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <section className="panel dashboard-panel">
          <h2>Live Dashboard</h2>
          <p className="subtitle">Monitor wallet, agent status, and platform engagement</p>
          
          {/* Platform Status Badge */}
          <div className="status-card highlight">
            <p className="status-label">🎯 Agent Status</p>
            <p className="status-value">
              {isWatchingActive
                ? `Watching: ${activeWatchingPlatform}`
                : "Watching: idle (open YouTube, Rumble, Twitch, or TikTok)"}
            </p>
          </div>

          {/* Wallet Section */}
          <div className="section-divider">
            <h3>💼 Wallet</h3>
            {!wallet?.connected ? (
              <div className="wallet-actions">
                <p className="subtitle">Create or import your wallet to get started</p>
                <div className="button-row">
                  <button onClick={handleGenerateWallet} className="btn-primary">
                    Generate Wallet
                  </button>
                  <button
                    onClick={() => setShowSeedInput(!showSeedInput)}
                    className="btn-secondary"
                  >
                    {showSeedInput ? "Cancel" : "Import Wallet"}
                  </button>
                </div>

                {showSeedInput && (
                  <div className="seed-input-panel">
                    <h4>Import Wallet from Seed Phrase</h4>
                    <textarea
                      value={seedInput}
                      onChange={(e) => setSeedInput(e.target.value)}
                      placeholder="Enter your 12 or 24 word seed phrase..."
                      rows={4}
                      className="seed-textarea"
                    />
                    <div className="button-row">
                      <button onClick={handleImportWallet} className="btn-primary">Import</button>
                      <button onClick={() => setShowSeedInput(false)} className="btn-secondary">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="wallet-info">
                <div className="info-row">
                  <span className="label">Address:</span>
                  <span className="value">{wallet.address}</span>
                </div>
                <div className="info-row">
                  <span className="label">Network:</span>
                  <span className="value">{wallet.network}</span>
                </div>
                <div className="info-row">
                  <span className="label">STT Contract:</span>
                  <span className="value">{wallet.tokenContractAddress || "-"}</span>
                </div>
                <div className="info-row">
                  <span className="label">Provider:</span>
                  <span className="value">WDK Live</span>
                </div>
                <div className="info-row">
                  <span className="label">Assets:</span>
                  <span className="value">{wallet.supportedAssets.join(", ")}</span>
                </div>
              </div>
            )}

            {seedPhrase && (
              <div className="seed-backup-panel">
                <h4>⚠️ Save Your Seed Phrase</h4>
                <p className="subtitle">Write this down in a safe place. You will need it to restore your wallet.</p>
                <div className="seed-display">
                  <code>{seedPhrase}</code>
                </div>
                <div className="button-row">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(seedPhrase);
                    }}
                    className="btn-secondary"
                  >
                    Copy Seed Phrase
                  </button>
                  <button onClick={() => setSeedPhrase("")} className="btn-secondary">I've saved it</button>
                </div>
              </div>
            )}
          </div>

          {/* KPI Cards */}
          {wallet?.connected && (
            <div className="section-divider">
              <h3>📈 Performance</h3>
              <div className="kpi-row">
                <article className="kpi-card">
                  <p className="kpi-label">Total Tips</p>
                  <strong>{totalTips}</strong>
                </article>
                <article className="kpi-card">
                  <p className="kpi-label">Total Value</p>
                  <strong>${totalAmount}</strong>
                </article>
                <article className="kpi-card">
                  <p className="kpi-label">Avg Confidence</p>
                  <strong>{avgConfidence}%</strong>
                </article>
              </div>
              <div className="status-card" style={{ marginTop: "12px" }}>
                <p className="status-label">Latest Tip Transaction</p>
                {latestTxHash ? (
                  <p className="status-value" style={{ fontSize: "13px", wordBreak: "break-all" }}>
                    <a
                      href={`${sepoliaExplorerBase}${latestTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {latestTxHash}
                    </a>
                  </p>
                ) : (
                  <p className="status-value" style={{ fontSize: "13px" }}>No transaction yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Agent Monitor */}
          {agentStatus && (
            <div className="section-divider">
              <h3>👁️ Platform Monitor</h3>
              <p className="subtitle">Real-time monitoring of active platforms</p>
              <button
                onClick={() => {
                  loadDashboardData();
                  loadAgentStatus();
                }}
                className="btn-secondary"
                style={{ marginBottom: "14px" }}
              >
                🔄 Refresh Now
              </button>
              <div className="status-card" style={{ marginBottom: "14px" }}>
                <p className="status-label">Live Detection Status</p>
                <p style={{ margin: "6px 0 0" }}>
                  Video detected: <strong>{agentStatus.lastSignal?.isVideoDetected ? "yes" : "no"}</strong>
                </p>
                <p style={{ margin: "4px 0 0" }}>
                  Playing: <strong>{agentStatus.lastSignal?.isPlaying ? "yes" : "no"}</strong>
                </p>
                <p style={{ margin: "4px 0 0" }}>
                  Live: <strong>{agentStatus.lastSignal?.isLive ? "yes" : "no"}</strong>
                </p>
                <p style={{ margin: "4px 0 0" }}>
                  Watch time: <strong>{Number(agentStatus.lastSignal?.watchTimeSeconds || 0)}s</strong>
                </p>
                <p style={{ margin: "4px 0 0" }}>
                  Comments: <strong>{Number(agentStatus.lastSignal?.commentCount || 0)}</strong> | Spike: <strong>{Number(agentStatus.lastSignal?.chatSpikeScore || 0).toFixed(2)}</strong>
                </p>
              </div>
              <div className="monitor-grid">
                {supportedPlatforms.map((platformId) => {
                  const monitor = platformMonitor[platformId] || {
                    detected: false,
                    readyCount: 0,
                    signalCount: 0,
                    lastSeenAt: 0,
                  };

                  return (
                    <div key={platformId} className="monitor-card">
                      <p className="platform-name">{platformId}</p>
                      <p>Status: <span className={monitor.detected ? "status-active" : "status-idle"}>
                        {monitor.detected ? "Watching" : "Idle"}
                      </span></p>
                      <p>Ready: <strong>{monitor.readyCount}</strong></p>
                      <p>Signals: <strong>{monitor.signalCount}</strong></p>
                      {monitor.lastSeenAt && (
                        <p className="time-small">{new Date(monitor.lastSeenAt).toLocaleTimeString()}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <section className="panel settings-panel">
          <h2>⚙️ Agent Settings</h2>
          <p className="subtitle">Configure budget, token preferences, and agent behavior</p>

          {editSettings && (
            <form className="settings-form">
              {/* Budget Section */}
              <div className="settings-section">
                <h3>💰 Budget Settings</h3>
                <label>
                  <span className="label-text">Daily Budget (USDt)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editSettings.dailyBudget}
                    onChange={(e) => updateSetting("dailyBudget", Number(e.target.value))}
                  />
                </label>

                <label>
                  <span className="label-text">Remaining Budget (USDt)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editSettings.remainingBudget}
                    onChange={(e) => updateSetting("remainingBudget", Number(e.target.value))}
                  />
                </label>

                <label>
                  <span className="label-text">Max Single Tip (USDt)</span>
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={editSettings.maxSingleTip}
                    onChange={(e) => updateSetting("maxSingleTip", Number(e.target.value))}
                  />
                </label>

                <div className="budget-info">
                  <p className="info-text">
                    Daily budget: <strong>${editSettings.dailyBudget.toFixed(2)}</strong> | 
                    Remaining: <strong>${editSettings.remainingBudget.toFixed(2)}</strong>
                  </p>
                </div>
              </div>

              {/* Token Settings */}
              <div className="settings-section">
                <h3>🪙 Token Settings</h3>
                <label>
                  <span className="label-text">Preferred Token</span>
                  <select
                    value={editSettings.preferredToken}
                    onChange={(e) => updateSetting("preferredToken", e.target.value)}
                  >
                    <option value="STT">STT (SmartTip Token - Sepolia)</option>
                    <option value="USDt">USDt (Tether)</option>
                    <option value="BTC">BTC (Bitcoin)</option>
                    <option value="XAUt">XAUt (Gold)</option>
                  </select>
                </label>
                <label>
                  <span className="label-text">Recipient Wallet (for real tips)</span>
                  <input
                    type="text"
                    placeholder="0x... creator/test wallet address"
                    value={editSettings.recipientWallet || ""}
                    onChange={(e) => updateSetting("recipientWallet", e.target.value.trim())}
                  />
                </label>
                <p className="subtitle">
                  Real tips require a valid EVM wallet address. If platform creator wallet is missing, this address is used.
                </p>
              </div>

              {/* Agent Behavior */}
              <div className="settings-section">
                <h3>🤖 Agent Behavior</h3>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editSettings.autoTip}
                    onChange={(e) => updateSetting("autoTip", e.target.checked)}
                  />
                  <span>Enable auto-tip recommendations</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editSettings.cloudEnabled}
                    onChange={(e) => updateSetting("cloudEnabled", e.target.checked)}
                  />
                  <span>Enable collective cloud signal (optional)</span>
                </label>
              </div>

              {/* Save Button */}
              <div className="settings-actions">
                <button onClick={handleSaveSettings} className="btn-primary" type="button">
                  💾 Save Settings
                </button>
                {settingsSaved && (
                  <span className="saved-indicator">✓ Settings saved</span>
                )}
              </div>
            </form>
          )}
        </section>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <section className="panel history-panel">
          <h2>📜 Tip History</h2>
          <p className="subtitle">View all tips sent by the agent</p>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-state">
                <p className="subtitle">No tips yet. Keep a supported platform open and ensure recipient wallet is set in Settings.</p>
              </div>
            ) : (
              history.map((item) => (
                <article key={item.id} className="history-item">
                  <div className="history-header">
                    <strong>{item.creator}</strong>
                    <span className="history-date">
                      {new Date(item.timestamp || 0).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="history-details">
                    <p>
                      <span className="amount">${item.amount} {item.token}</span>
                      <span className="platform">{item.platform}</span>
                    </p>
                    <p className="confidence">
                      Confidence: <strong>{Number(item.confidence || 0).toFixed(0)}%</strong> | 
                      Risk: <strong>{Number(item.creatorRisk || 0).toFixed(2)}</strong>
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

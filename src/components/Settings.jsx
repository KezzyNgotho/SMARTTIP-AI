import { useEffect, useState } from "react";
import { getPublicSettings, savePublicSettings } from "../wallet/storage";

export default function Settings() {
  const [settings, setSettings] = useState({
    dailyBudget: 25,
    remainingBudget: 25,
    autoTip: true,
    maxSingleTip: 10,
    preferredToken: "STT",
    recipientWallet: "",
    cloudEnabled: false
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPublicSettings().then((stored) => setSettings(stored));
  }, []);

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    const next = {
      ...settings,
      remainingBudget: Number(
        Math.min(settings.remainingBudget, settings.dailyBudget).toFixed(2)
      )
    };

    await savePublicSettings(next);
    setSettings(next);
    setSaved(true);
  }

  return (
    <section className="panel settings-panel">
      <h2>Agent Settings</h2>
      <p className="status">Tune budget, token preferences, and runtime behavior.</p>
      <label>
        Daily Budget (USDT)
        <input
          type="number"
          min="0"
          value={settings.dailyBudget}
          onChange={(event) => update("dailyBudget", Number(event.target.value))}
        />
      </label>
      <label>
        Remaining Budget (USDT)
        <input
          type="number"
          min="0"
          value={settings.remainingBudget}
          onChange={(event) =>
            update("remainingBudget", Number(event.target.value))
          }
        />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={settings.autoTip}
          onChange={(event) => update("autoTip", event.target.checked)}
        />
        Enable auto-tip recommendations
      </label>
      <label>
        Max Single Tip
        <input
          type="number"
          min="0.25"
          step="0.25"
          value={settings.maxSingleTip}
          onChange={(event) => update("maxSingleTip", Number(event.target.value))}
        />
      </label>
      <label>
        Preferred Token
        <select
          value={settings.preferredToken}
          onChange={(event) => update("preferredToken", event.target.value)}
        >
          <option value="STT">STT</option>
          <option value="USDt">USDt</option>
          <option value="BTC">BTC</option>
          <option value="XAUt">XAUt</option>
        </select>
      </label>
      <label>
        Recipient Wallet (0x...)
        <input
          type="text"
          value={settings.recipientWallet || ""}
          onChange={(event) => update("recipientWallet", event.target.value.trim())}
        />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={settings.cloudEnabled}
          onChange={(event) => update("cloudEnabled", event.target.checked)}
        />
        Enable collective cloud signal (optional)
      </label>
      <button onClick={handleSave}>Save Settings</button>
      {saved && <p className="status">Saved.</p>}
    </section>
  );
}

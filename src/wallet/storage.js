const HISTORY_KEY = "smarttip_tip_history";
const SETTINGS_KEY = "smarttip_settings";

const defaultSettings = {
  dailyBudget: 25,
  remainingBudget: 25,
  autoTip: true,
  maxSingleTip: 10,
  preferredToken: "STT",
  recipientWallet: "",
  chainId: 11155111,
  networkName: "Ethereum Sepolia",
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  tokenContractAddress: "0x9333Cfe4Ad586e3450a3234D24F03131b8FBD9C2",
  cloudEnabled: false,
  llmEndpoint: "https://api.openai.com/v1/responses",
  llmModel: "gpt-5-nano",
  llmApiKey: "",
  llmSystemPrompt:
    "You are SmartTip Agent for creator tipping. Return strict JSON only with keys: shouldTip (boolean), amount (number), token (STT|USDt|BTC|XAUt), reason (string), confidence (0-1), creatorRisk (0-1). Use engagement data, budget remaining, and recent tip history. Never exceed remaining budget or max single tip."
};

function toPublicSettings(settings) {
  const { llmEndpoint, llmModel, llmApiKey, llmSystemPrompt, ...publicSettings } =
    settings || {};
  return publicSettings;
}

function hasChromeStorage() {
  return Boolean(globalThis.chrome?.storage?.local);
}

export async function getSettings() {
  if (hasChromeStorage()) {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    return {
      ...defaultSettings,
      ...(data[SETTINGS_KEY] || {})
    };
  }

  const raw = globalThis.localStorage?.getItem(SETTINGS_KEY);
  return {
    ...defaultSettings,
    ...(raw ? JSON.parse(raw) : {})
  };
}

export async function saveSettings(settings) {
  const next = { ...defaultSettings, ...(settings || {}) };

  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: next });
    return next;
  }

  globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function getPublicSettings() {
  const settings = await getSettings();
  return toPublicSettings(settings);
}

export async function savePublicSettings(publicSettings) {
  const current = await getSettings();
  const next = {
    ...current,
    ...toPublicSettings(publicSettings)
  };

  await saveSettings(next);
  return toPublicSettings(next);
}

export async function getTipHistory() {
  if (hasChromeStorage()) {
    const data = await chrome.storage.local.get([HISTORY_KEY]);
    return data[HISTORY_KEY] || [];
  }

  const raw = globalThis.localStorage?.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function appendTipHistory(tipItem) {
  const history = await getTipHistory();
  const next = [tipItem, ...history].slice(0, 100);

  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [HISTORY_KEY]: next });
    return next;
  }

  globalThis.localStorage?.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

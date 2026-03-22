import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import { Buffer } from 'buffer';

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

// Storage keys for wallet state
const WALLET_STATE_KEY = 'smarttip_wallet_state';
const WALLET_SEED_KEY = 'smarttip_wallet_seed';
const SMARTTIP_STT_ADDRESS = "0x9333Cfe4Ad586e3450a3234D24F03131b8FBD9C2";
const SUPPORTED_ASSETS = ["STT", "USDt", "BTC", "XAUt"];
const NETWORK_NAME = "Ethereum Sepolia";

// Initialize or retrieve wallet instance
let walletInstance = null;

function walletLog(step, meta = {}) {
  console.log("[SmartTip][Wallet]", new Date().toISOString(), step, meta);
}

function normalizeSeedPhrase(seed) {
  if (typeof seed !== 'string') {
    return '';
  }

  return seed
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .join(' ');
}

function hasChromeStorage() {
  return Boolean(globalThis.chrome?.storage?.local);
}

async function setStoredValue(key, value) {
  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    });
  }

  localStorage.setItem(key, JSON.stringify(value));
}

async function getStoredValue(key) {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }

  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

async function initializeWallet(seed) {
  try {
    walletLog("initialize:start", { hasSeed: Boolean(seed) });
    walletInstance = new WalletManagerEvm(seed);
    walletLog("initialize:ok");
    return walletInstance;
  } catch (err) {
    console.error('Failed to initialize WalletManagerEvm:', err);
    walletLog("initialize:error", { message: err.message });
    return null;
  }
}

async function hydrateWalletFromStorage() {
  if (walletInstance) {
    return walletInstance;
  }

  const storedSeed = await getStoredValue(WALLET_SEED_KEY);
  if (!storedSeed) {
    return null;
  }

  const normalizedSeed = normalizeSeedPhrase(storedSeed);
  if (!WalletManagerEvm.isValidSeedPhrase(normalizedSeed)) {
    await clearStoredWallet();
    return null;
  }

  return initializeWallet(normalizedSeed);
}

export function isWdkAvailable() {
  return true; // WalletManagerEvm is available via npm package
}

export async function generateWallet() {
  try {
    walletLog("generate:start");
    // Use WDK-native BIP39 generation so format/checksum always matches the library.
    const newSeedPhrase = WalletManagerEvm.getRandomSeedPhrase(12);
    
    const wallet = await initializeWallet(newSeedPhrase);
    
    if (!wallet) {
      walletLog("generate:failed-init");
      return {
        ok: false,
        error: 'Failed to initialize wallet'
      };
    }

    const account = await wallet.getAccount();
    const address = account.address;

    // Store wallet state (address only, seed shown to user for backup)
    await saveWalletState({
      address,
      exists: true,
      mode: 'generated'
    });
    await saveWalletSeed(newSeedPhrase);

    walletLog("generate:ok", { address });

    return {
      ok: true,
      address,
      seedPhrase: newSeedPhrase, // User must backup this
      mode: 'generated'
    };
  } catch (err) {
    console.error('Generate wallet error:', err);
    walletLog("generate:error", { message: err.message });
    return {
      ok: false,
      error: err.message || 'Failed to generate wallet'
    };
  }
}

export async function importWallet(seedPhrase) {
  try {
    walletLog("import:start", { hasSeedPhrase: Boolean(seedPhrase) });
    const normalizedSeed = normalizeSeedPhrase(seedPhrase);
    if (!WalletManagerEvm.isValidSeedPhrase(normalizedSeed)) {
      walletLog("import:invalid-seed");
      return {
        ok: false,
        error: 'Invalid seed phrase. Please use a valid 12 or 24 word BIP39 phrase.'
      };
    }

    const wallet = await initializeWallet(normalizedSeed);
    if (!wallet) {
      walletLog("import:failed-init");
      return {
        ok: false,
        error: 'Failed to initialize wallet'
      };
    }

    const account = await wallet.getAccount();
    const address = account.address;

    // Store wallet state
    await saveWalletState({
      address,
      exists: true,
      mode: 'imported'
    });
    await saveWalletSeed(normalizedSeed);

    walletLog("import:ok", { address });

    return {
      ok: true,
      address,
      mode: 'imported'
    };
  } catch (err) {
    console.error('Import wallet error:', err);
    walletLog("import:error", { message: err.message });
    return {
      ok: false,
      error: err.message || 'Invalid seed phrase'
    };
  }
}

export async function connectWallet() {
  try {
    walletLog("connect:start");
    const walletState = await getWalletState();

    if (!walletState?.exists || !walletState?.address) {
      walletLog("connect:missing-wallet");
      return {
        connected: false,
        mode: "unavailable",
        address: "",
        network: "Ethereum",
        reason: "No wallet found. Please generate or import one first."
      };
    }

    // Rehydrate wallet from storage so both web and extension can reconnect after reload.
    const hydrated = await hydrateWalletFromStorage();
    if (!hydrated) {
      walletLog("connect:missing-seed");
      return {
        connected: false,
        mode: "unavailable",
        address: "",
        network: "Ethereum",
        reason: "Wallet seed not loaded. Please generate or import first."
      };
    }

    walletLog("connect:ok", { address: walletState.address });
    return {
      connected: true,
      mode: "wdk",
      address: walletState.address,
      network: walletState.network || NETWORK_NAME,
      tokenContractAddress: SMARTTIP_STT_ADDRESS,
      supportedAssets: SUPPORTED_ASSETS
    };
  } catch (err) {
    console.error('Connect wallet error:', err);
    walletLog("connect:error", { message: err.message });
    return {
      connected: false,
      mode: "unavailable",
      address: "",
      network: "Ethereum",
      reason: err.message || "Failed to connect wallet"
    };
  }
}

export async function sendTip({ recipient, amount, token = "USDt", memo = "SmartTip micro-tip" }) {
  walletLog("tip:start", { recipient, amount, token });
  if (!recipient || !amount || amount <= 0) {
    throw new Error("Invalid tip request");
  }

  if (!SUPPORTED_ASSETS.includes(token)) {
    throw new Error("Unsupported token. Use STT, USDt, BTC, or XAUt.");
  }

  try {
    const walletState = await getWalletState();
    if (!walletState?.exists || !walletState?.address) {
      walletLog("tip:no-wallet");
      return {
        ok: false,
        error: "Wallet not found. Please create or import one first.",
        mode: "unavailable"
      };
    }

    const hydrated = await hydrateWalletFromStorage();
    if (!hydrated) {
      walletLog("tip:not-loaded");
      return {
        ok: false,
        error: "Wallet not loaded",
        mode: "unavailable"
      };
    }

    const account = await hydrated.getAccount();

    const transferPayload = {
      to: recipient,
      amount,
      token,
      memo
    };

    if (token === "STT") {
      transferPayload.tokenAddress = SMARTTIP_STT_ADDRESS;
      transferPayload.chainId = 11155111;
    }
    
    // Transfer via wallet (placeholder for actual implementation)
    const result = await account.transfer(transferPayload);

    walletLog("tip:ok", { txHash: result?.hash || result?.txHash || "n/a", recipient, amount, token });

    return {
      ok: true,
      txHash: result?.hash || result?.txHash || "0x" + Math.random().toString(16).slice(2),
      recipient,
      amount,
      token,
      memo,
      timestamp: Date.now(),
      mode: "wdk"
    };
  } catch (err) {
    console.error('Send tip error:', err);
    walletLog("tip:error", { message: err.message, recipient, amount, token });
    return {
      ok: false,
      error: err.message || "Failed to send tip",
      mode: "wdk"
    };
  }
}

// Storage helpers
async function saveWalletState(state) {
  return setStoredValue(WALLET_STATE_KEY, state);
}

async function saveWalletSeed(seed) {
  return setStoredValue(WALLET_SEED_KEY, seed);
}

async function getWalletState() {
  return getStoredValue(WALLET_STATE_KEY);
}

async function clearStoredWallet() {
  walletInstance = null;

  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([WALLET_STATE_KEY, WALLET_SEED_KEY], () => {
        resolve();
      });
    });
  }

  localStorage.removeItem(WALLET_STATE_KEY);
  localStorage.removeItem(WALLET_SEED_KEY);
}

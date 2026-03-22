export const SUPPORTED_TOKENS = ["STT", "USDt", "BTC", "XAUt"];

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

export function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function safeToken(token, fallback = "STT") {
  return SUPPORTED_TOKENS.includes(token) ? token : fallback;
}

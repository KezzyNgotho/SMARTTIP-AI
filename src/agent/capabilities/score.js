import { clamp } from "../constants";

export function computeEngagementScore(signal = {}) {
  const watchTimeScore = clamp(signal.watchTimeSeconds / 600, 0, 1);
  const interactionScore = clamp(
    (Number(signal.playEvents || 0) +
      Number(signal.pauseEvents || 0) +
      Number(signal.commentCount || 0) * 0.6) /
      30,
    0,
    1
  );
  const momentumScore = clamp(signal.chatSpikeScore, 0, 1);
  const trustScore = clamp(signal.creatorTrust ?? 0.6, 0, 1);

  return clamp(
    watchTimeScore * 0.35 + interactionScore * 0.25 + momentumScore * 0.2 + trustScore * 0.2,
    0,
    1
  );
}

export function platformMultiplier(platform = "unknown") {
  const table = {
    youtube: 1.05,
    rumble: 1,
    twitch: 1.1,
    tiktok: 0.95,
    unknown: 0.9
  };

  return table[platform] || table.unknown;
}

export function recentTipPenalty(history = []) {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recent = history.filter((item) => Number(item.timestamp || 0) >= oneHourAgo);
  return clamp(recent.length / 10, 0, 0.3);
}

export function computeCompositeScore({ signal, platform, history }) {
  return clamp(
    computeEngagementScore(signal) * platformMultiplier(platform) - recentTipPenalty(history),
    0,
    1
  );
}

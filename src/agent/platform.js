export function inferPlatform(hostname = "") {
  const value = hostname.toLowerCase();
  if (value.includes("youtube")) return "youtube";
  if (value.includes("rumble")) return "rumble";
  if (value.includes("twitch")) return "twitch";
  if (value.includes("tiktok")) return "tiktok";
  return "unknown";
}

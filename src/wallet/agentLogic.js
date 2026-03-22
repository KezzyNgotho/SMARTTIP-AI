import { inferPlatform as inferPlatformFromLayer, runSmartTipAgent } from "../agent";

export const inferPlatform = inferPlatformFromLayer;

export async function decideTip({
  signal = {},
  settings = {},
  budget = {},
  platform = "unknown",
  history = []
}) {
  return runSmartTipAgent({ signal, settings, budget, platform, history });
}

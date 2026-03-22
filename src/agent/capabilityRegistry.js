const capabilityMap = new Map();

export function registerCapability(name, handler) {
  if (!name || typeof handler !== "function") {
    throw new Error("Capability registration requires a name and function handler.");
  }

  capabilityMap.set(name, handler);
}

export function getCapability(name) {
  return capabilityMap.get(name);
}

export function listCapabilities() {
  return Array.from(capabilityMap.keys());
}

export function ensureCapabilities(required = []) {
  required.forEach((name) => {
    if (!capabilityMap.has(name)) {
      throw new Error(`Missing required capability: ${name}`);
    }
  });
}

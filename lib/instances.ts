/**
 * lib/instances.ts — Multi-LLM instance registry.
 *
 * Stores instances in ~/.hermes/llm-instances.json.
 * Supports: CRUD, tagging, priority ordering, fallback chains.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { PROVIDERS, PROVIDER_MODELS } from "./hermes-types";
import type { InstanceTag, LlmInstance, InstanceRegistry } from "./hermes-types";
import { getHermesHome } from "./hermes-home";

function instancesPath(): string {
  return join(getHermesHome(), "llm-instances.json");
}

// ─── Read/write ──────────────────────────────────────────────────────────────

function readRegistry(): InstanceRegistry {
  const INSTANCES_PATH = instancesPath();
  if (!existsSync(INSTANCES_PATH)) {
    return { version: 1, instances: [], strategy: "priority", fallbackEnabled: false };
  }
  try {
    return JSON.parse(readFileSync(INSTANCES_PATH, "utf-8"));
  } catch {
    return { version: 1, instances: [], strategy: "priority", fallbackEnabled: false };
  }
}

function writeRegistry(reg: InstanceRegistry): void {
  writeFileSync(instancesPath(), JSON.stringify(reg, null, 2), "utf-8");
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getInstances(masked = true): (LlmInstance & { apiKeyPreview: string })[] {
  const reg = readRegistry();
  return reg.instances
    .sort((a, b) => a.priority - b.priority)
    .map((inst) => ({
      ...inst,
      apiKey: masked ? maskKey(inst.apiKey) : inst.apiKey,
      apiKeyPreview: maskKey(inst.apiKey),
    }));
}

export function getRegistry(): InstanceRegistry {
  return readRegistry();
}

export function getInstanceById(id: string): LlmInstance | null {
  const reg = readRegistry();
  return reg.instances.find((i) => i.id === id) || null;
}

export function addInstance(inst: Omit<LlmInstance, "id" | "createdAt" | "updatedAt">): LlmInstance {
  const reg = readRegistry();
  const newInst: LlmInstance = {
    ...inst,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  reg.instances.push(newInst);
  writeRegistry(reg);
  return newInst;
}

export function updateInstance(id: string, updates: Partial<LlmInstance>): LlmInstance | null {
  const reg = readRegistry();
  const idx = reg.instances.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  reg.instances[idx] = {
    ...reg.instances[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeRegistry(reg);
  return reg.instances[idx];
}

export function deleteInstance(id: string): boolean {
  const reg = readRegistry();
  const idx = reg.instances.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  reg.instances.splice(idx, 1);
  writeRegistry(reg);
  return true;
}

export function updateStrategy(strategy: InstanceRegistry["strategy"], fallbackEnabled: boolean): void {
  const reg = readRegistry();
  reg.strategy = strategy;
  reg.fallbackEnabled = fallbackEnabled;
  writeRegistry(reg);
}

/** Reorder priorities: takes array of instance IDs in desired priority order (lowest first) */
export function reorderPriorities(orderedIds: string[]): void {
  const reg = readRegistry();
  for (let i = 0; i < orderedIds.length; i++) {
    const inst = reg.instances.find((x) => x.id === orderedIds[i]);
    if (inst) inst.priority = i + 1;
  }
  writeRegistry(reg);
}

// ─── Config generation ───────────────────────────────────────────────────────

interface GeneratedConfig {
  main: { provider: string; model: string; baseUrl?: string } | null;
  delegation: { provider: string; model: string } | null;
  vision: { provider: string; model: string } | null;
  compression: { provider: string; model: string } | null;
  /** Ordered list for fallback */
  fallbackChain: { provider: string; model: string; baseUrl?: string }[];
  /** Credential pool entries to add via `hermes auth add` */
  credentialPool: { provider: string; apiKey: string }[];
  /** Strategy being used */
  strategy: string;
  fallbackEnabled: boolean;
}

export function generateConfig(): GeneratedConfig {
  const reg = readRegistry();
  const enabled = reg.instances
    .filter((i) => i.enabled)
    .sort((a, b) => a.priority - b.priority);

  const byTag = (tag: InstanceTag) => enabled.find((i) => i.tags.includes(tag)) || null;

  const main = byTag("main");
  const delegation = byTag("delegation") || byTag("code");
  const vision = byTag("vision");
  const compression = byTag("fast");

  return {
    main: main ? { provider: main.provider, model: main.model, baseUrl: main.baseUrl } : null,
    delegation: delegation
      ? { provider: delegation.provider, model: delegation.model }
      : main
        ? { provider: main.provider, model: main.model }
        : null,
    vision: vision
      ? { provider: vision.provider, model: vision.model }
      : main
        ? { provider: main.provider, model: main.model }
        : null,
    compression: compression
      ? { provider: compression.provider, model: compression.model }
      : enabled.find((i) => i.tags.includes("backup")) || main
        ? { provider: (enabled.find((i) => i.tags.includes("backup")) || main)!.provider,
          model: (enabled.find((i) => i.tags.includes("backup")) || main)!.model }
        : null,
    fallbackChain: enabled.map((i) => ({
      provider: i.provider,
      model: i.model,
      baseUrl: i.baseUrl || undefined,
    })),
    credentialPool: enabled.map((i) => ({
      provider: i.provider,
      apiKey: i.apiKey,
    })),
    strategy: reg.strategy,
    fallbackEnabled: reg.fallbackEnabled,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 10) return key.slice(0, 4) + "•••";
  return key.slice(0, 6) + "•••" + key.slice(-4);
}

/** Generate a color-friendly ID from name */
export function instanceColor(name: string): string {
  const colors = ["#60a5fa", "#c084fc", "#4ade80", "#fbbf24", "#f87171", "#34d399", "#a78bfa", "#fb923c"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

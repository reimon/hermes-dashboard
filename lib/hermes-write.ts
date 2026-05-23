/**
 * lib/hermes-write.ts — Write operations for Hermes config.
 *
 * Modifies ~/.hermes/config.yaml and ~/.hermes/.env.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as yaml from "js-yaml";
import { PROVIDERS, PROVIDER_MODELS } from "./hermes-types";
import type { ProviderInfo } from "./hermes-types";

// Re-export for server-side consumers
export { PROVIDERS, PROVIDER_MODELS };
export type { ProviderInfo };

const HERMES_HOME = process.env.HERMES_HOME || join(homedir(), ".hermes");
const CONFIG_PATH = join(HERMES_HOME, "config.yaml");
const ENV_PATH = join(HERMES_HOME, ".env");

// ─── Read current state ──────────────────────────────────────────────────────

export interface HermesProviderState {
  activeProvider: string | null;
  activeModel: string | null;
  baseUrl: string | null;
  apiKeys: Record<string, string>;
  providerInfo: ProviderInfo | null;
}

export function getProviderState(): HermesProviderState {
  const configRaw = readYaml();
  const envVars = readEnv();

  const modelConfig = (configRaw.model as Record<string, unknown>) || {};
  const provider = (modelConfig.provider as string) || null;
  const model = (modelConfig.default as string) || null;
  const baseUrl = (modelConfig.base_url as string) || null;

  const providerInfo = PROVIDERS.find((p) => p.value === provider) || null;

  return { activeProvider: provider, activeModel: model, baseUrl, apiKeys: envVars, providerInfo };
}

// ─── Read helpers ────────────────────────────────────────────────────────────

function readYaml(): Record<string, unknown> {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return (yaml.load(readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>) || {};
  } catch {
    return {};
  }
}

function readEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  const vars: Record<string, string> = {};
  const lines = readFileSync(ENV_PATH, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return vars;
}

// ─── Write operations ────────────────────────────────────────────────────────

export function saveEnvVar(key: string, value: string): void {
  const lines = existsSync(ENV_PATH)
    ? readFileSync(ENV_PATH, "utf-8").split("\n")
    : [];

  let found = false;
  const updated = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0 && trimmed.slice(0, eqIdx).trim() === key) {
      found = true;
      if (!value) return `# ${key}=`; // comment out if empty
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found && value) {
    // Remove trailing empty lines, append
    while (updated.length > 0 && updated[updated.length - 1].trim() === "") {
      updated.pop();
    }
    updated.push(`${key}=${value}`);
  }

  writeFileSync(ENV_PATH, updated.join("\n") + "\n", "utf-8");
}

export function saveConfigProvider(provider: string, model?: string): void {
  const config = readYaml();
  const modelConfig = (config.model as Record<string, unknown>) || {};

  modelConfig.provider = provider;
  if (model) modelConfig.default = model;

  // Set default base URL if switching provider
  const info = PROVIDERS.find((p) => p.value === provider);
  if (info?.defaultBaseUrl) {
    modelConfig.base_url = info.defaultBaseUrl;
  }

  config.model = modelConfig;
  writeFileSync(CONFIG_PATH, yaml.dump(config, { lineWidth: 120 }), "utf-8");
}

export function saveConfigModel(model: string): void {
  const config = readYaml();
  const modelConfig = (config.model as Record<string, unknown>) || {};
  modelConfig.default = model;
  config.model = modelConfig;
  writeFileSync(CONFIG_PATH, yaml.dump(config, { lineWidth: 120 }), "utf-8");
}

export function saveConfigBaseUrl(baseUrl: string): void {
  const config = readYaml();
  const modelConfig = (config.model as Record<string, unknown>) || {};
  if (baseUrl) modelConfig.base_url = baseUrl;
  else delete modelConfig.base_url;
  config.model = modelConfig;
  writeFileSync(CONFIG_PATH, yaml.dump(config, { lineWidth: 120 }), "utf-8");
}

// ─── Test connection ─────────────────────────────────────────────────────────

export interface TestResult {
  ok: boolean;
  provider: string;
  model: string;
  error?: string;
}

export async function testConnection(
  provider: string,
  model: string,
  apiKey: string,
  baseUrl?: string,
): Promise<TestResult> {
  const info = PROVIDERS.find((p) => p.value === provider);
  const url = baseUrl || info?.defaultBaseUrl || "";

  if (!url) {
    return { ok: false, provider, model, error: "No base URL configured for this provider." };
  }
  if (!apiKey && provider !== "ollama") {
    return { ok: false, provider, model, error: "No API key configured." };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    // Some providers use x-goog-api-key or x-api-key
    if (provider === "google") {
      headers["x-goog-api-key"] = apiKey;
      delete headers["Authorization"];
    }

    const endpoint = provider === "google"
      ? `${url}/models/${model}:generateContent`
      : `${url}/chat/completions`;

    const body = provider === "google"
      ? JSON.stringify({
          contents: [{ parts: [{ text: "Say 'ok'." }] }],
          generationConfig: { maxOutputTokens: 10 },
        })
      : JSON.stringify({
          model,
          messages: [{ role: "user", content: "Say ok." }],
          max_tokens: 10,
        });

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      return { ok: true, provider, model };
    }

    const errText = await res.text().catch(() => "");
    return {
      ok: false,
      provider,
      model,
      error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
    };
  } catch (err) {
    return {
      ok: false,
      provider,
      model,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

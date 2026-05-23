"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Zap, Key, Globe, Cpu, TestTube2, CheckCircle2,
  XCircle, Save, Eye, EyeOff, RefreshCw, AlertCircle,
  ChevronDown,
} from "lucide-react";
import type { ProviderInfo, HermesProviderState } from "@/lib/hermes-write";
import { PROVIDER_MODELS } from "@/lib/hermes-types";

interface ProviderData extends HermesProviderState {
  keyList: { key: string; value: string; masked: string }[];
  availableProviders: ProviderInfo[];
}

function ModelCombobox({
  value,
  onChange,
  provider,
  apiKey,
  baseUrl,
  placeholder = "Select or type a model...",
}: {
  value: string;
  onChange: (v: string) => void;
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [liveModels, setLiveModels] = useState<{ id: string; name: string }[]>([]);
  const [fetching, setFetching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live fetch from provider API (like Futuro Decodificado)
  useEffect(() => {
    if (!apiKey && provider !== "ollama") {
      setLiveModels([]);
      return;
    }
    let cancelled = false;
    setFetching(true);
    const params = new URLSearchParams({ provider });
    if (apiKey) params.set("apiKey", apiKey);
    if (baseUrl) params.set("baseUrl", baseUrl);
    fetch(`/api/providers/models?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.models?.length > 0) {
          setLiveModels(data.models);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [provider, apiKey, baseUrl]);

  // Merge: live models first, then static catalog as fallback (deduped)
  const staticModels = PROVIDER_MODELS[provider] || [];
  const liveIds = new Set(liveModels.map((m) => m.id));
  const merged = [
    ...liveModels,
    ...staticModels.filter((m) => !liveIds.has(m)).map((m) => ({ id: m, name: m })),
  ];

  const filtered = value
    ? merged.filter((m) => m.id.toLowerCase().includes(value.toLowerCase()) || m.name.toLowerCase().includes(value.toLowerCase()))
    : merged;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectModel = (model: string) => {
    onChange(model);
    setOpen(false);
    setHighlightIdx(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && highlightIdx >= 0 && open) {
      e.preventDefault();
      selectModel(filtered[highlightIdx].id);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIdx(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlightIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 pr-8 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {fetching && <RefreshCw className="h-3 w-3 animate-spin text-[var(--muted-foreground)]" />}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg max-h-56 overflow-y-auto">
          {liveModels.length > 0 && (
            <div className="px-3 py-1 text-[10px] text-[var(--accent)] border-b border-[var(--border)] sticky top-0 bg-[var(--card)]">
              Live from API ({liveModels.length} models)
            </div>
          )}
          {filtered.map((model, idx) => {
            const isLive = liveIds.has(model.id);
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => selectModel(model.id)}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`w-full text-left px-3 py-1.5 text-sm font-mono transition-colors flex items-center gap-2 ${
                  idx === highlightIdx
                    ? "bg-[var(--accent)]/15 text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                } ${model.id === value ? "text-[var(--accent)]" : ""}`}
              >
                <span className="truncate flex-1">{model.id}</span>
                {isLive && (
                  <span className="text-[9px] px-1 rounded bg-[var(--accent)]/20 text-[var(--accent)] shrink-0">
                    live
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {open && value && filtered.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg p-3 text-xs text-[var(--muted-foreground)] text-center">
          {fetching ? "Loading models..." : "Type to use a custom model"}
        </div>
      )}
    </div>
  );
}

export default function ProvidersPage() {
  const [data, setData] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    provider: string;
    model: string;
    error?: string;
  } | null>(null);

  // Editable state
  const [selectedProvider, setSelectedProvider] = useState("");
  const [modelName, setModelName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [showAllProviders, setShowAllProviders] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      const d: ProviderData = await res.json();
      setData(d);
      setSelectedProvider(d.activeProvider || "");
      setModelName(d.activeModel || "");
      setBaseUrl(d.baseUrl || "");
      // Pre-fill API key fields from env
      const keys: Record<string, string> = {};
      for (const p of d.availableProviders) {
        if (p.envKey) keys[p.envKey] = d.apiKeys[p.envKey] || "";
      }
      setApiKeyValues(keys);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentProviderInfo = data?.availableProviders.find(
    (p) => p.value === selectedProvider,
  );

  const saveApiKey = async (envKey: string) => {
    setSaving(envKey);
    try {
      const res = await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveApiKey",
          key: envKey,
          value: apiKeyValues[envKey] || "",
        }),
      });
      if (res.ok) {
        setTestResult(null);
        await fetchData();
      }
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const saveProvider = async () => {
    setSaving("provider");
    try {
      await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveProvider",
          provider: selectedProvider,
          model: modelName || undefined,
        }),
      });
      setTestResult(null);
      await fetchData();
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const saveModel = async () => {
    setSaving("model");
    try {
      await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveModel", model: modelName }),
      });
      await fetchData();
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const saveBaseUrlFn = async () => {
    setSaving("baseUrl");
    try {
      await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveBaseUrl", baseUrl }),
      });
      await fetchData();
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const apiKey = currentProviderInfo?.envKey
        ? apiKeyValues[currentProviderInfo.envKey] || ""
        : "";
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          model: modelName,
          apiKey,
          baseUrl: baseUrl || undefined,
        }),
      });
      const result = await res.json();
      setTestResult(result);
    } catch (err) {
      setTestResult({
        ok: false,
        provider: selectedProvider,
        model: modelName,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl">
        <div className="h-8 w-48 bg-[var(--card)] rounded" />
        <div className="h-64 bg-[var(--card)] rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[var(--muted-foreground)]">
          Could not load provider config.
        </p>
      </div>
    );
  }

  const activeProviderInfo = data.availableProviders.find(
    (p) => p.value === data.activeProvider,
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-[var(--accent)]" />
          Providers
        </h1>
        <button
          onClick={() => setShowAllProviders(!showAllProviders)}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          {showAllProviders ? "Hide all providers" : "Show all providers"}
        </button>
      </div>

      {/* Active provider card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          Active Provider
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          Currently used for all Hermes sessions. Change here or via{" "}
          <code className="text-[var(--foreground)]">hermes model</code>.
        </p>

        {/* Provider selector */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--muted-foreground)] block mb-1.5">
              Provider
            </label>
            <div className="flex gap-2">
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  const info = data.availableProviders.find(
                    (p) => p.value === e.target.value,
                  );
                  if (info?.defaultModel) setModelName(info.defaultModel);
                  if (info?.defaultBaseUrl) setBaseUrl(info.defaultBaseUrl);
                }}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--foreground)]"
              >
                {data.availableProviders.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                onClick={saveProvider}
                disabled={saving === "provider" || selectedProvider === data.activeProvider}
                className="px-3 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5 shrink-0"
              >
                {saving === "provider" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {selectedProvider === data.activeProvider ? "Active" : "Activate"}
              </button>
            </div>
            {currentProviderInfo && (
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                {currentProviderInfo.description}
              </p>
            )}
          </div>

          {/* Model — combobox com dropdown + free text */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)] block mb-1.5">
              Model
            </label>
            <div className="flex gap-2">
              <ModelCombobox
                value={modelName}
                onChange={setModelName}
                provider={selectedProvider}
                apiKey={currentProviderInfo?.envKey ? apiKeyValues[currentProviderInfo.envKey] : undefined}
                baseUrl={baseUrl || undefined}
                placeholder={currentProviderInfo?.defaultModel || "Select or type a model..."}
              />
              <button
                onClick={saveModel}
                disabled={saving === "model" || modelName === data.activeModel}
                className="px-3 py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--border)] disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {saving === "model" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)] block mb-1.5">
              Base URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={currentProviderInfo?.defaultBaseUrl || "https://api.openai.com/v1"}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
              <button
                onClick={saveBaseUrlFn}
                disabled={saving === "baseUrl" || baseUrl === data.baseUrl}
                className="px-3 py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--border)] disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {saving === "baseUrl" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </button>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
            <button
              onClick={handleTest}
              disabled={testing || !modelName}
              className="px-4 py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--border)] disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {testing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <TestTube2 className="h-3.5 w-3.5" />
              )}
              Test Connection
            </button>

            {testResult && (
              <div
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                  testResult.ok
                    ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800"
                    : "bg-red-950/50 text-red-400 border border-red-800"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {testResult.ok
                  ? `OK — ${testResult.provider} / ${testResult.model}`
                  : testResult.error || "Connection failed"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Key for active/focused provider */}
      {currentProviderInfo?.envKey && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Key — {currentProviderInfo.label}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Stored in <code>~/.hermes/.env</code> as{" "}
            <code className="text-[var(--foreground)]">{currentProviderInfo.envKey}</code>
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={revealedKeys.has(currentProviderInfo.envKey) ? "text" : "password"}
                value={apiKeyValues[currentProviderInfo.envKey] || ""}
                onChange={(e) =>
                  setApiKeyValues((prev) => ({
                    ...prev,
                    [currentProviderInfo.envKey]: e.target.value,
                  }))
                }
                placeholder="sk-or-..."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 pr-10 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
              <button
                type="button"
                onClick={() => {
                  setRevealedKeys((prev) => {
                    const next = new Set(prev);
                    if (next.has(currentProviderInfo.envKey)) next.delete(currentProviderInfo.envKey);
                    else next.add(currentProviderInfo.envKey);
                    return next;
                  });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {revealedKeys.has(currentProviderInfo.envKey) ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <button
              onClick={() => saveApiKey(currentProviderInfo.envKey)}
              disabled={
                saving === currentProviderInfo.envKey ||
                apiKeyValues[currentProviderInfo.envKey] === data.apiKeys[currentProviderInfo.envKey]
              }
              className="px-3 py-2 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5 shrink-0"
            >
              {saving === currentProviderInfo.envKey ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      )}

      {/* All providers grid (expandable) */}
      {showAllProviders && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            All Providers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.availableProviders.map((p) => {
              const isActive = data.activeProvider === p.value;
              const hasKey = p.envKey ? !!data.apiKeys[p.envKey] : true;
              return (
                <div
                  key={p.value}
                  className={`p-3 rounded-md border ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border)] hover:border-[var(--muted)]"
                  } cursor-pointer transition-colors`}
                  onClick={() => {
                    setSelectedProvider(p.value);
                    if (p.defaultModel) setModelName(p.defaultModel);
                    if (p.defaultBaseUrl) setBaseUrl(p.defaultBaseUrl);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{p.label}</span>
                    <div className="flex items-center gap-1.5">
                      {hasKey ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                      )}
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)]">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {p.description}
                  </p>
                  {p.envKey && (
                    <p className="text-[10px] font-mono text-[var(--muted-foreground)] mt-1">
                      {p.envKey}
                      {data.apiKeys[p.envKey]
                        ? ` = ${data.apiKeys[p.envKey].slice(0, 6)}•••`
                        : " (not set)"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Help section */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-3">How providers work</h2>
        <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
          <p>
            Hermes supports 20+ providers. This dashboard edits{" "}
            <code>~/.hermes/config.yaml</code> (provider/model/url) and{" "}
            <code>~/.hermes/.env</code> (API keys).
          </p>
          <p>
            Changes take effect on the <strong>next Hermes session</strong>.
            Running sessions are unaffected.
          </p>
          <p>
            CLI alternative: <code>hermes model</code> (interactive picker) or{" "}
            <code>hermes config edit</code> (manual YAML).
          </p>
          <p>
            Credential pools: Use <code>hermes auth add</code> to add multiple
            keys for the same provider with automatic rotation.
          </p>
        </div>
      </div>
    </div>
  );
}

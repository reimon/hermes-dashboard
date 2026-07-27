"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { PROVIDER_MODELS } from "@/lib/hermes-types";

/**
 * Model picker with live fetch + type-to-filter + scroll.
 *
 * - Auto-loads models from the provider API (`/api/providers/models`).
 * - Providers in KEYLESS_MODEL_PROVIDERS list models without an API key
 *   (OpenRouter's catalog is public; Ollama is local), so the full list
 *   shows the moment the provider is selected.
 * - Falls back to the static catalog (PROVIDER_MODELS) and always allows a
 *   free-typed custom model.
 */
const KEYLESS_MODEL_PROVIDERS = new Set(["openrouter", "ollama"]);

interface Model {
  id: string;
  name: string;
}

export function ModelCombobox({
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
  const [liveModels, setLiveModels] = useState<Model[]>([]);
  const [fetching, setFetching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Returns the models array on success, [] when the provider needs a key we
  // don't have (clear the list), or null on failure (keep what we have).
  const fetchModels = useCallback(async (): Promise<Model[] | null> => {
    const keyless = KEYLESS_MODEL_PROVIDERS.has(provider);
    if (!apiKey && !keyless) return [];
    const params = new URLSearchParams({ provider });
    if (apiKey) params.set("apiKey", apiKey);
    if (baseUrl) params.set("baseUrl", baseUrl);
    const r = await fetch(`/api/providers/models?${params}`);
    const data = await r.json();
    if (r.ok && Array.isArray(data.models)) return data.models as Model[];
    return null;
  }, [provider, apiKey, baseUrl]);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    fetchModels()
      .then((models) => {
        if (!cancelled && models) setLiveModels(models);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchModels]);

  const refresh = useCallback(() => {
    setFetching(true);
    fetchModels()
      .then((models) => {
        if (models) setLiveModels(models);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [fetchModels]);

  // Merge: live models first, then static catalog as fallback (deduped)
  const staticModels = PROVIDER_MODELS[provider] || [];
  const liveIds = new Set(liveModels.map((m) => m.id));
  const merged: Model[] = [
    ...liveModels,
    ...staticModels.filter((m) => !liveIds.has(m)).map((m) => ({ id: m, name: m })),
  ];

  const filtered = value
    ? merged.filter(
        (m) =>
          m.id.toLowerCase().includes(value.toLowerCase()) ||
          m.name.toLowerCase().includes(value.toLowerCase()),
      )
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
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 pr-16 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {liveModels.length > 0 && !fetching && (
            <span
              className="text-[10px] text-[var(--muted-foreground)] tabular-nums"
              title={`${liveModels.length} models loaded`}
            >
              {liveModels.length}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={fetching}
            title="Refresh models"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${fetching ? "animate-spin" : ""}`} />
          </button>
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

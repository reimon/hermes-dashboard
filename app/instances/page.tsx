"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash2, Power, PowerOff,
  Zap, Save, RefreshCw,
  Tags, Shield, ZapIcon, Code, Search, Eye, EyeOff,
  Box, Play, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PROVIDERS, PROVIDER_MODELS } from "@/lib/hermes-types";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PageShell, FadeIn } from "@/components/ui/motion";
import { ModelCombobox } from "@/components/ui/model-combobox";
import {
  ALL_TAGS,
  type InstanceTag,
  type LlmInstance,
  type InstanceRegistry,
} from "@/lib/hermes-types";

interface InstancesData {
  instances: (LlmInstance & { apiKeyPreview: string })[];
  registry: InstanceRegistry;
  providers: typeof PROVIDERS;
  models: typeof PROVIDER_MODELS;
}

interface GeneratedConfig {
  main: { provider: string; model: string } | null;
  delegation: { provider: string; model: string } | null;
  vision: { provider: string; model: string } | null;
  compression: { provider: string; model: string } | null;
  fallbackChain: { provider: string; model: string }[];
  credentialPool: { provider: string; apiKey: string }[];
  strategy: string;
  fallbackEnabled: boolean;
}

const tagIcons: Record<InstanceTag, React.ElementType> = {
  main: Zap, code: Code, analysis: Search, fast: ZapIcon,
  vision: Eye, delegation: Box, backup: Shield,
};

const tagColors: Record<InstanceTag, string> = {
  main: "bg-emerald-950/50 text-emerald-400 border-emerald-800",
  code: "bg-blue-950/50 text-blue-400 border-blue-800",
  analysis: "bg-purple-950/50 text-purple-400 border-purple-800",
  fast: "bg-amber-950/50 text-amber-400 border-amber-800",
  vision: "bg-pink-950/50 text-pink-400 border-pink-800",
  delegation: "bg-cyan-950/50 text-cyan-400 border-cyan-800",
  backup: "bg-slate-800/50 text-slate-400 border-slate-700",
};

export default function InstancesPage() {
  const [data, setData] = useState<InstancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<GeneratedConfig | null>(null);
  const [showRevealedKeys, setShowRevealedKeys] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState("openrouter");
  const [formModel, setFormModel] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formTags, setFormTags] = useState<InstanceTag[]>([]);
  const [formPriority, setFormPriority] = useState(1);
  const [formEnabled, setFormEnabled] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/instances");
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormProvider("openrouter");
    setFormModel("");
    setFormApiKey("");
    setFormBaseUrl("");
    setFormTags([]);
    setFormPriority(1);
    setFormEnabled(true);
  };

  const editInstance = (inst: LlmInstance) => {
    setEditingId(inst.id);
    setFormName(inst.name);
    setFormProvider(inst.provider);
    setFormModel(inst.model);
    setFormApiKey(""); // don't refill API key (security)
    setFormBaseUrl(inst.baseUrl || "");
    setFormTags(inst.tags);
    setFormPriority(inst.priority);
    setFormEnabled(inst.enabled);
    setShowForm(true);
  };

  const toggleTag = (tag: InstanceTag) => {
    setFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = async () => {
    if (!formName.trim() || !formModel.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        action: editingId ? "update" : "add",
        name: formName,
        provider: formProvider,
        model: formModel,
        apiKey: formApiKey || undefined,
        baseUrl: formBaseUrl || undefined,
        tags: formTags,
        priority: formPriority,
        enabled: formEnabled,
      };
      if (editingId) body.id = editingId;

      await fetch("/api/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      resetForm();
      await fetchData();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/instances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    await fetchData();
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await fetch("/api/instances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, enabled }),
    });
    await fetchData();
  };

  const handleGenerateConfig = async () => {
    const res = await fetch("/api/instances?action=config");
    const config = await res.json();
    setGeneratedConfig(config);
  };

  const handleStrategy = async (strategy: string, fallbackEnabled: boolean) => {
    await fetch("/api/instances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "strategy", strategy, fallbackEnabled }),
    });
    await fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-5xl">
        <div className="h-8 w-48 bg-[var(--card)] rounded" />
        <div className="h-32 bg-[var(--card)] rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  const { instances, registry, providers } = data;
  return (
    <PageShell className="space-y-6 max-w-5xl">
      <FadeIn className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">
            <Sparkles className="h-3 w-3 text-[var(--accent)]" />
            Registry
          </div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Box className="h-7 w-7 text-[var(--accent)]" strokeWidth={2.2} />
            LLM Instances
            <span className="text-xs font-normal text-[var(--muted-foreground)] font-mono px-2 py-1 rounded-md bg-[var(--card)] border border-[var(--border)]">
              {instances.length}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateConfig}
            className="px-3 py-1.5 rounded-md border border-[var(--border)] text-xs hover:bg-[var(--card-elevated)] hover:border-[var(--border-strong)] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            Generate Config
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-[0_0_20px_var(--accent-glow)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Instance
          </button>
        </div>
      </FadeIn>

      {/* Strategy config */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted-foreground)]">Strategy:</span>
            <select
              value={registry.strategy}
              onChange={(e) => handleStrategy(e.target.value, registry.fallbackEnabled)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--foreground)]"
            >
              <option value="priority">Priority (ordered)</option>
              <option value="round-robin">Round Robin (alternate)</option>
              <option value="random">Random</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted-foreground)]">Fallback:</span>
            <button
              onClick={() => handleStrategy(registry.strategy, !registry.fallbackEnabled)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                registry.fallbackEnabled
                  ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800"
                  : "bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--border)]"
              }`}
            >
              {registry.fallbackEnabled ? "ON — auto-switch on failure" : "OFF"}
            </button>
          </div>
          <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
            {instances.filter((i) => i.enabled).length} enabled / {instances.length} total
          </span>
        </div>
      </div>

      {/* Add/Edit form */}
      <AnimatePresence>
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
        <div className="bg-[var(--card)] border border-[var(--accent)]/60 rounded-[var(--radius)] p-5 space-y-4 shadow-[0_0_30px_var(--accent-glow)]">
          <h2 className="text-sm font-semibold">
            {editingId ? "Edit Instance" : "New Instance"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--muted-foreground)] block mb-1">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. DeepSeek V4 (main)"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] block mb-1">Priority *</label>
              <input
                type="number"
                min={1}
                value={formPriority}
                onChange={(e) => setFormPriority(Number(e.target.value) || 1)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] block mb-1">Provider</label>
              <select
                value={formProvider}
                onChange={(e) => {
                  setFormProvider(e.target.value);
                  setFormModel("");
                }}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--foreground)]"
              >
                {providers.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] block mb-1">Model *</label>
              <ModelCombobox
                value={formModel}
                onChange={setFormModel}
                provider={formProvider}
                apiKey={formApiKey || undefined}
                baseUrl={formBaseUrl || undefined}
                placeholder="Select or type..."
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] block mb-1">API Key</label>
              <div className="relative">
                <input
                  type={showRevealedKeys.has("form") ? "text" : "password"}
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder={editingId ? "Leave empty to keep current" : "sk-or-..."}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 pr-8 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowRevealedKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has("form")) next.delete("form");
                      else next.add("form");
                      return next;
                    });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                >
                  {showRevealedKeys.has("form") ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] block mb-1">Base URL</label>
              <input
                type="text"
                value={formBaseUrl}
                onChange={(e) => setFormBaseUrl(e.target.value)}
                placeholder={providers.find((p) => p.value === formProvider)?.defaultBaseUrl || "https://..."}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)] block mb-2">
              <Tags className="h-3.5 w-3.5 inline mr-1" />
              Tags ({formTags.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => {
                const active = formTags.includes(tag.value);
                const Icon = tagIcons[tag.value];
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                      active ? tagColors[tag.value] : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted)]"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enabled toggle + save */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <button
              onClick={() => setFormEnabled(!formEnabled)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors ${
                formEnabled
                  ? "bg-emerald-950/50 text-emerald-400 border-emerald-800"
                  : "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]"
              }`}
            >
              {formEnabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
              {formEnabled ? "Enabled" : "Disabled"}
            </button>
            <div className="flex gap-2">
              <button
                onClick={resetForm}
                className="px-3 py-1.5 rounded-md border border-[var(--border)] text-xs hover:bg-[var(--border)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formModel.trim()}
                className="px-4 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] text-xs font-medium hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
              >
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Generated config preview */}
      <AnimatePresence>
      {generatedConfig && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="bg-[var(--card)] border border-[var(--accent)]/60 rounded-[var(--radius)] p-5 space-y-3 shadow-[0_0_30px_var(--accent-glow)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Play className="h-4 w-4 text-[var(--accent)]" />
              Generated Hermes Config
            </h2>
            <button
              onClick={() => setGeneratedConfig(null)}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Dismiss
            </button>
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            Run these commands to apply, or copy into <code>~/.hermes/config.yaml</code>:
          </p>

          <div className="bg-[var(--background)] rounded-md p-3 font-mono text-xs space-y-1 overflow-x-auto">
            {generatedConfig.main && (
              <div>
                <span className="text-[var(--muted-foreground)]"># Main agent</span><br />
                <span>hermes config set model.provider {generatedConfig.main.provider}</span><br />
                <span>hermes config set model.default {generatedConfig.main.model}</span>
              </div>
            )}
            {generatedConfig.delegation && (
              <div className="mt-2">
                <span className="text-[var(--muted-foreground)]"># Delegation (subagents)</span><br />
                <span>hermes config set delegation.model {generatedConfig.delegation.model}</span><br />
                <span>hermes config set delegation.provider {generatedConfig.delegation.provider}</span>
              </div>
            )}
            {generatedConfig.vision && (
              <div className="mt-2">
                <span className="text-[var(--muted-foreground)]"># Vision</span><br />
                <span>hermes config set auxiliary.vision.model {generatedConfig.vision.model}</span><br />
                <span>hermes config set auxiliary.vision.provider {generatedConfig.vision.provider}</span>
              </div>
            )}
            {generatedConfig.compression && (
              <div className="mt-2">
                <span className="text-[var(--muted-foreground)]"># Compression (cheap/fast)</span><br />
                <span>hermes config set auxiliary.compression.model {generatedConfig.compression.model}</span><br />
                <span>hermes config set auxiliary.compression.provider {generatedConfig.compression.provider}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-[var(--muted-foreground)]">
            <strong>Fallback chain:</strong>{" "}
            {generatedConfig.fallbackChain.map((f, i) => (
              <span key={i}>
                {i > 0 && " → "}
                <code>{f.provider}/{f.model}</code>
              </span>
            ))}
            {generatedConfig.fallbackChain.length === 0 && "No instances configured"}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Instances list */}
      {instances.length === 0 && !showForm ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius)] p-12 text-center">
          <Box className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-3" />
          <p className="text-sm text-[var(--muted-foreground)] mb-3">
            No LLM instances registered yet
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5 inline mr-1" />
            Add your first instance
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((inst, idx) => {
            const providerInfo = providers.find((p) => p.value === inst.provider);
            return (
              <motion.div
                key={inst.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.35 }}
                className={`spotlight bg-[var(--card)] border rounded-[var(--radius)] p-4 transition-colors ${
                  inst.enabled
                    ? "border-[var(--border)] hover:border-[var(--border-strong)]"
                    : "border-[var(--border)] opacity-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Priority indicator */}
                  <div className="flex flex-col items-center gap-0.5 mt-0.5 shrink-0">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] w-5 text-center">
                      {inst.priority}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{inst.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--muted-foreground)]">
                        {providerInfo?.label || inst.provider}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--muted-foreground)] truncate max-w-[200px]">
                        {inst.model}
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(inst.tags || []).map((tag) => {
                        const tagInfo = ALL_TAGS.find((t) => t.value === tag);
                        const Icon = tagIcons[tag];
                        return (
                          <span
                            key={tag}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border ${tagColors[tag]}`}
                          >
                            <Icon className="h-2.5 w-2.5" />
                            {tagInfo?.label || tag}
                          </span>
                        );
                      })}
                      {(inst.tags || []).length === 0 && (
                        <span className="text-[10px] text-[var(--muted-foreground)] italic">
                          No tags
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-[var(--muted-foreground)] font-mono">
                      {inst.apiKeyPreview || "(no key)"}
                      {inst.baseUrl && ` · ${inst.baseUrl}`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleEnabled(inst.id, !inst.enabled)}
                      className="p-1 rounded hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      title={inst.enabled ? "Disable" : "Enable"}
                    >
                      {inst.enabled ? (
                        <Power className="h-3.5 w-3.5 text-[var(--accent)]" />
                      ) : (
                        <PowerOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => editInstance(inst)}
                      className="p-1 rounded hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      title="Edit"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(inst.id)}
                      className="p-1 rounded hover:bg-red-950/50 text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PageShell, FadeIn } from "@/components/ui/motion";
import { PROVIDERS } from "@/lib/hermes-types";

interface EnvVar {
  key: string;
  value: string;
  masked: string;
}

interface ConfigData {
  provider: string | null;
  model: string | null;
  api_keys: EnvVar[];
  env_vars: EnvVar[];
  hermes_home: string;
  resolved_from: "env" | "settings" | "default";
}

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const providerKeys = PROVIDERS.filter((p) => p.envKey);

export default function ConfigPage() {
  const [data, setData] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  // Add / edit form
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [showValue, setShowValue] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/config");
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error || `Request failed (${r.status})`);
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleReveal = (key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyKey = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  function resetForm() {
    setEditingKey(null);
    setNameInput("");
    setValueInput("");
    setFormError(null);
  }

  function startAdd(key = "") {
    setEditingKey(null);
    setNameInput(key);
    setValueInput("");
    setShowValue(true);
    setFormError(null);
  }

  function startEdit(v: EnvVar) {
    setEditingKey(v.key);
    setNameInput(v.key);
    setValueInput(v.value);
    setShowValue(false);
    setFormError(null);
  }

  async function save() {
    const key = nameInput.trim();
    if (!NAME_RE.test(key)) {
      setFormError("Invalid name. Use letters, digits and underscore; cannot start with a digit.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const r = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setEnv", key, value: valueInput }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error || `Request failed (${r.status})`);
      resetForm();
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(key: string) {
    setConfirmKey(null);
    try {
      const r = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteEnv", key }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error || `Request failed (${r.status})`);
      if (editingKey === key) resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[var(--card)]/60 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-[var(--card)]/60 rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <SpotlightCard className="p-8 text-center space-y-3 max-w-md">
          <AlertCircle className="h-8 w-8 mx-auto text-[var(--destructive)]" />
          <p className="text-sm text-[var(--muted-foreground)]">
            {error || "Could not load config."}
          </p>
          <Link
            href="/setup"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors"
          >
            Go to Setup
          </Link>
        </SpotlightCard>
      </div>
    );
  }

  const isEditing = editingKey !== null;

  return (
    <PageShell className="space-y-6 max-w-3xl">
      <FadeIn>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">
          <Sparkles className="h-3 w-3 text-[var(--accent)]" />
          Credentials
        </div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Key className="h-7 w-7 text-[var(--accent)]" strokeWidth={2.2} />
          API Keys &amp; Environment
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Writing to{" "}
          <code className="text-[var(--foreground-soft)]">{data.hermes_home}/.env</code>{" "}
          <Link href="/setup" className="text-[var(--accent)] hover:underline">
            (change)
          </Link>
        </p>
      </FadeIn>

      {/* Active configuration */}
      <FadeIn>
        <SpotlightCard className="p-5">
          <h2 className="text-sm font-semibold mb-3">Active Configuration</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Provider
              </p>
              <p className="font-mono text-[var(--foreground-soft)]">
                {data.provider || "Not configured"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Default Model
              </p>
              <p className="font-mono text-[var(--foreground-soft)]">
                {data.model || "Not configured"}
              </p>
            </div>
          </div>
        </SpotlightCard>
      </FadeIn>

      {/* Add / edit variable */}
      <FadeIn>
        <SpotlightCard className="p-5">
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="h-4 w-4 text-[var(--accent)]" /> Edit{" "}
                <code className="font-mono">{editingKey}</code>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-[var(--accent)]" /> Add a variable
              </>
            )}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            {isEditing
              ? "Update the value and save."
              : "Add an API key or any environment variable. Quick-add a known provider key:"}
          </p>

          {!isEditing && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {providerKeys.map((p) => (
                <button
                  key={p.value}
                  onClick={() => startAdd(p.envKey)}
                  className="px-2.5 py-1 rounded-md text-xs bg-[var(--background)]/60 border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)] text-[var(--muted-foreground)] transition-colors cursor-pointer font-mono"
                  title={p.envKey}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="VARIABLE_NAME"
              readOnly={isEditing}
              spellCheck={false}
              className={`w-full px-3 py-2 rounded-md bg-[var(--background)]/60 border border-[var(--border)] focus:border-[var(--accent)]/50 outline-none text-sm font-mono text-[var(--foreground-soft)] placeholder:text-[var(--muted-foreground)] ${
                isEditing ? "opacity-60" : ""
              }`}
            />
            <div className="relative">
              <input
                type={showValue ? "text" : "password"}
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
                placeholder="value"
                spellCheck={false}
                autoComplete="off"
                className="w-full px-3 py-2 pr-10 rounded-md bg-[var(--background)]/60 border border-[var(--border)] focus:border-[var(--accent)]/50 outline-none text-sm font-mono text-[var(--foreground-soft)] placeholder:text-[var(--muted-foreground)]"
              />
              <button
                onClick={() => setShowValue((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title={showValue ? "Hide" : "Show"}
              >
                {showValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-[var(--destructive)] mt-2">{formError}</p>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving || !nameInput.trim()}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-md bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving…" : isEditing ? "Save changes" : "Add variable"}
            </button>
            {isEditing && (
              <button
                onClick={resetForm}
                className="text-sm px-3 py-2 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-3">
            Tip: an empty value comments the variable out. Restart Hermes to pick up changes.
          </p>
        </SpotlightCard>
      </FadeIn>

      {/* Existing variables */}
      <FadeIn>
        <SpotlightCard className="p-5">
          <h2 className="text-sm font-semibold mb-1">
            Environment variables{" "}
            <span className="text-[var(--muted-foreground)] font-normal">
              ({data.env_vars.length})
            </span>
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Loaded from <code>{data.hermes_home}/.env</code>
          </p>

          {data.env_vars.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              No variables yet. Add one above.
            </p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {data.env_vars.map((k, idx) => (
                  <motion.div
                    key={k.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.3 }}
                    className="flex items-center gap-3 p-3 rounded-md bg-[var(--background)]/60 border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                        {k.key}
                      </p>
                      <p className="text-sm font-mono truncate text-[var(--foreground-soft)]">
                        {revealed.has(k.key) ? k.value || "(empty)" : k.masked || "(empty)"}
                      </p>
                    </div>

                    {confirmKey === k.key ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[var(--muted-foreground)] mr-1">Delete?</span>
                        <button
                          onClick={() => remove(k.key)}
                          className="p-1.5 rounded bg-[var(--destructive)]/15 text-[var(--destructive)] hover:bg-[var(--destructive)]/25 transition-colors cursor-pointer"
                          title="Confirm delete"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmKey(null)}
                          className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleReveal(k.key)}
                          className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          title={revealed.has(k.key) ? "Hide" : "Reveal"}
                        >
                          {revealed.has(k.key) ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => copyKey(k.key, k.value)}
                          className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          title="Copy value"
                        >
                          {copied === k.key ? (
                            <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(k)}
                          className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmKey(k.key)}
                          className="p-1.5 rounded hover:bg-[var(--destructive)]/15 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </SpotlightCard>
      </FadeIn>
    </PageShell>
  );
}

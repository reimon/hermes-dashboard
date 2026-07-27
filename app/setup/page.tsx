"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wrench,
  Sparkles,
  Check,
  X,
  FolderSearch,
  AlertTriangle,
  Database,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PageShell, FadeIn } from "@/components/ui/motion";

interface Inspection {
  path: string;
  exists: boolean;
  isDir: boolean;
  files: {
    stateDb: boolean;
    configYaml: boolean;
    env: boolean;
    instances: boolean;
    logs: boolean;
  };
  valid: boolean;
}

interface SetupInfo {
  current: string;
  resolvedFrom: "env" | "settings" | "default";
  currentInspection: Inspection;
  detected: Inspection[];
  envOverride: boolean;
}

const FILE_LABELS: { key: keyof Inspection["files"]; label: string }[] = [
  { key: "stateDb", label: "state.db" },
  { key: "configYaml", label: "config.yaml" },
  { key: "env", label: ".env" },
  { key: "instances", label: "llm-instances.json" },
  { key: "logs", label: "logs/agent.log" },
];

const RESOLVED_LABEL: Record<SetupInfo["resolvedFrom"], string> = {
  env: "HERMES_HOME environment variable",
  settings: "saved in dashboard settings",
  default: "default (~/.hermes)",
};

function FileBadges({ files }: { files: Inspection["files"] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILE_LABELS.map(({ key, label }) => {
        const ok = files[key];
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${
              ok
                ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
                : "bg-[var(--background)]/40 border-[var(--border)] text-[var(--muted-foreground)]"
            }`}
          >
            {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {label}
          </span>
        );
      })}
    </div>
  );
}

export default function SetupPage() {
  const [info, setInfo] = useState<SetupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customPath, setCustomPath] = useState("");
  const [customInspection, setCustomInspection] = useState<Inspection | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/setup");
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error || `Request failed (${r.status})`);
      setInfo(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(action: string, path?: string) {
    const r = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, path }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body?.error || `Request failed (${r.status})`);
    return body;
  }

  async function applyLocation(path: string) {
    setBusy(path);
    setNotice(null);
    try {
      await post("save", path);
      setNotice(`Using ${path}. Other pages will load data from here now.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function checkCustom() {
    if (!customPath.trim()) return;
    setBusy("check");
    setError(null);
    try {
      const { inspection } = await post("inspect", customPath.trim());
      setCustomInspection(inspection);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function initCustom() {
    if (!customPath.trim()) return;
    setBusy("init");
    setNotice(null);
    try {
      const { inspection } = await post("init", customPath.trim());
      setCustomInspection(inspection);
      setNotice(`Created ${customPath.trim()} with an empty .env and config.yaml.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function resetToDefault() {
    setBusy("reset");
    setNotice(null);
    try {
      await post("reset");
      setNotice("Reset to the default location.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[var(--card)]/60 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[var(--card)]/60 rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  const current = info?.currentInspection;

  return (
    <PageShell className="space-y-6 max-w-3xl">
      <FadeIn>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">
          <Sparkles className="h-3 w-3 text-[var(--accent)]" />
          Installation
        </div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Wrench className="h-7 w-7 text-[var(--accent)]" strokeWidth={2.2} />
          Setup
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Point the dashboard at your Hermes data directory (the folder that holds{" "}
          <code>state.db</code>, <code>config.yaml</code> and <code>.env</code>).
        </p>
      </FadeIn>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 p-3 rounded-md bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-sm text-[var(--foreground-soft)]"
          >
            <Check className="h-4 w-4 text-[var(--accent)] shrink-0" />
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 text-sm text-[var(--foreground-soft)]">
          <AlertTriangle className="h-4 w-4 text-[var(--destructive)] shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {info?.envOverride && (
        <FadeIn>
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm text-[var(--foreground-soft)]">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <code>HERMES_HOME</code> is set in the environment and takes precedence over anything
              you choose here. Unset it (and restart the dashboard) to manage the path from this
              page.
            </span>
          </div>
        </FadeIn>
      )}

      {/* Current location */}
      <FadeIn>
        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--accent)]" />
              Current location
            </h2>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                current?.valid
                  ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
                  : "bg-[var(--destructive)]/10 border-[var(--destructive)]/30 text-[var(--destructive)]"
              }`}
            >
              {current?.valid ? "Hermes found" : "Not found"}
            </span>
          </div>
          <p className="font-mono text-sm text-[var(--foreground-soft)] break-all mb-1">
            {info?.current}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            Resolved from {info ? RESOLVED_LABEL[info.resolvedFrom] : ""}
          </p>
          {current && <FileBadges files={current.files} />}
          {!current?.valid && (
            <p className="text-xs text-[var(--muted-foreground)] mt-3">
              No <code>state.db</code> or <code>config.yaml</code> here. Pick a detected location
              below, enter a path manually, or run the Hermes Agent to create the data.
            </p>
          )}
          {info?.resolvedFrom === "settings" && !info.envOverride && (
            <button
              onClick={resetToDefault}
              disabled={busy === "reset"}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to default (~/.hermes)
            </button>
          )}
        </SpotlightCard>
      </FadeIn>

      {/* Detected locations */}
      <FadeIn>
        <SpotlightCard className="p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-1">
            <FolderSearch className="h-4 w-4 text-[var(--accent)]" />
            Detected locations
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Folders found in common locations. Choose the one that holds your Hermes data.
          </p>

          {!info || info.detected.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-6">
              No Hermes folders detected in common locations.
            </p>
          ) : (
            <div className="space-y-2">
              {info.detected.map((d) => {
                const isCurrent = d.path === info.current;
                return (
                  <div
                    key={d.path}
                    className="flex flex-col gap-2 p-3 rounded-md bg-[var(--background)]/60 border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-sm text-[var(--foreground-soft)] break-all">
                        {d.path}
                      </p>
                      {isCurrent ? (
                        <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)]">
                          In use
                        </span>
                      ) : (
                        <button
                          onClick={() => applyLocation(d.path)}
                          disabled={busy === d.path}
                          className="shrink-0 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {busy === d.path ? "Saving…" : "Use"}
                          {busy !== d.path && <ArrowRight className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                    <FileBadges files={d.files} />
                  </div>
                );
              })}
            </div>
          )}
        </SpotlightCard>
      </FadeIn>

      {/* Custom path */}
      <FadeIn>
        <SpotlightCard className="p-5">
          <h2 className="text-sm font-semibold mb-1">Enter a path manually</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Absolute path to the Hermes home directory.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={customPath}
              onChange={(e) => {
                setCustomPath(e.target.value);
                setCustomInspection(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") checkCustom();
              }}
              placeholder="/home/you/.hermes"
              spellCheck={false}
              className="flex-1 px-3 py-2 rounded-md bg-[var(--background)]/60 border border-[var(--border)] focus:border-[var(--accent)]/50 outline-none text-sm font-mono text-[var(--foreground-soft)] placeholder:text-[var(--muted-foreground)]"
            />
            <button
              onClick={checkCustom}
              disabled={!customPath.trim() || busy === "check"}
              className="px-4 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-strong)] text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {busy === "check" ? "Checking…" : "Check"}
            </button>
          </div>

          {customInspection && (
            <div className="mt-4 p-3 rounded-md bg-[var(--background)]/60 border border-[var(--border)] space-y-3">
              {!customInspection.exists ? (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    This path does not exist yet.
                  </p>
                  <button
                    onClick={initCustom}
                    disabled={busy === "init"}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busy === "init" ? "Creating…" : "Create empty Hermes folder here"}
                  </button>
                </div>
              ) : (
                <>
                  <FileBadges files={customInspection.files} />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => applyLocation(customInspection.path)}
                      disabled={busy === customInspection.path || !customInspection.isDir}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Use this path
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    {!customInspection.valid && customInspection.isDir && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        (no state.db / config.yaml — you can still point here)
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </SpotlightCard>
      </FadeIn>
    </PageShell>
  );
}

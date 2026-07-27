"use client";

import { useEffect, useState } from "react";
import { Key, Eye, EyeOff, Copy, Check, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PageShell, FadeIn } from "@/components/ui/motion";

interface ApiKey {
  key: string;
  value: string;
  masked: string;
}

interface ConfigData {
  provider: string | null;
  model: string | null;
  api_keys: ApiKey[];
}

export default function ConfigPage() {
  const [data, setData] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <SpotlightCard className="p-8 text-center space-y-3 max-w-md">
          <AlertCircle className="h-8 w-8 mx-auto text-[var(--destructive)]" />
          <p className="text-sm text-[var(--muted-foreground)]">
            Could not load config. Check ~/.hermes/config.yaml and ~/.hermes/.env
          </p>
        </SpotlightCard>
      </div>
    );
  }

  return (
    <PageShell className="space-y-6 max-w-3xl">
      <FadeIn>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">
          <Sparkles className="h-3 w-3 text-[var(--accent)]" />
          Credentials
        </div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Key className="h-7 w-7 text-[var(--accent)]" strokeWidth={2.2} />
          API Keys
        </h1>
      </FadeIn>

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
          <p className="text-xs text-[var(--muted-foreground)] mt-3">
            Edit these via <code className="text-[var(--foreground)]">hermes config edit</code> or{" "}
            <code className="text-[var(--foreground)]">hermes model</code>
          </p>
        </SpotlightCard>
      </FadeIn>

      <FadeIn>
        <SpotlightCard className="p-5">
          <h2 className="text-sm font-semibold mb-1">API Keys</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Loaded from <code>~/.hermes/.env</code>. Edit the file directly or use{" "}
            <code>hermes config env-path</code> to find it.
          </p>

          {data.api_keys.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              No API keys found in ~/.hermes/.env
            </p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {data.api_keys.map((k, idx) => (
                  <motion.div
                    key={k.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.35 }}
                    className="flex items-center gap-3 p-3 rounded-md bg-[var(--background)]/60 border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                        {k.key}
                      </p>
                      <p className="text-sm font-mono truncate text-[var(--foreground-soft)]">
                        {revealed.has(k.key) ? k.value : k.masked}
                      </p>
                    </div>
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
                      title="Copy"
                    >
                      <AnimatePresence mode="wait">
                        {copied === k.key ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </SpotlightCard>
      </FadeIn>

      <FadeIn>
        <SpotlightCard className="p-5">
          <h2 className="text-sm font-semibold mb-3">How to change API keys</h2>
          <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
            <p>
              1. Open the env file:{" "}
              <code className="text-[var(--foreground)]">
                {process.env.NEXT_PUBLIC_HERMES_ENV_PATH || "~/.hermes/.env"}
              </code>
            </p>
            <p>
              2. Edit the key value (e.g., <code>OPENROUTER_API_KEY=sk-or-...</code>)
            </p>
            <p>
              3. Restart Hermes: <code>hermes chat</code> will pick up the new key
            </p>
            <p className="mt-2">
              Tip: Run <code className="text-[var(--foreground)]">hermes config env-path</code> to
              find the exact path on your system.
            </p>
          </div>
        </SpotlightCard>
      </FadeIn>
    </PageShell>
  );
}

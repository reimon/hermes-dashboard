"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Clock, Activity, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Session } from "@/lib/hermes";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { PageShell, FadeIn } from "@/components/ui/motion";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtCost(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toFixed(4);
}

function dateStr(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sessions?days=${days}&limit=200`)
      .then((r) => r.json())
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[var(--card)]/60 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-[var(--card)]/60 rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  const totalCalls = sessions.reduce((s, x) => s + x.api_call_count, 0);
  const totalTokens = sessions.reduce((s, x) => s + x.input_tokens + x.output_tokens, 0);
  const totalCost = sessions.reduce((s, x) => s + (x.estimated_cost_usd ?? 0), 0);

  return (
    <PageShell className="space-y-6">
      <FadeIn className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">
            <Sparkles className="h-3 w-3 text-[var(--accent)]" />
            History
          </div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            Sessions
            <span className="text-xs font-normal text-[var(--muted-foreground)] font-mono px-2 py-1 rounded-md bg-[var(--card)] border border-[var(--border)]">
              {sessions.length}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--card)] border border-[var(--border)]">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`relative px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                days === d
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {days === d && (
                <motion.span
                  layoutId="sessions-period"
                  className="absolute inset-0 bg-[var(--accent)]/15 border border-[var(--accent)]/30 rounded-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{d}d</span>
            </button>
          ))}
        </div>
      </FadeIn>

      {sessions.length === 0 ? (
        <SpotlightCard className="p-12 text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-3" />
          <p className="text-sm text-[var(--muted-foreground)]">
            No sessions found in the last {days} days
          </p>
        </SpotlightCard>
      ) : (
        <FadeIn>
          <div className="space-y-2">
            <AnimatePresence>
              {sessions.map((s, idx) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.025, 0.5), duration: 0.4 }}
                >
                  <SpotlightCard className="p-4 cursor-default">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold truncate">
                            {s.title || s.id.slice(0, 20) + "…"}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)]/60 text-[var(--muted-foreground)] font-mono">
                            {s.source}
                          </span>
                          {s.cost_status && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)]/60 text-[var(--muted-foreground)]">
                              {s.cost_status}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {dateStr(s.started_at)}
                            {s.ended_at && ` → ${dateStr(s.ended_at)}`}
                          </span>
                          <span className="tabular">{s.message_count} msgs</span>
                          <span className="tabular">{s.tool_call_count} tools</span>
                          <span className="tabular">{s.api_call_count} calls</span>
                          {s.model && (
                            <span className="font-mono text-[10px] text-[var(--foreground-soft)]">
                              {s.model}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="text-xs space-x-2 tabular">
                          <span className="text-sky-400">{fmt(s.input_tokens)} in</span>
                          <span className="text-violet-400">{fmt(s.output_tokens)} out</span>
                        </div>
                        {s.cache_read_tokens > 0 && (
                          <div className="text-[10px] text-emerald-400 tabular">
                            {fmt(s.cache_read_tokens)} cache
                          </div>
                        )}
                        <div className="text-xs font-mono text-[var(--cost)] font-medium tabular">
                          {fmtCost(s.estimated_cost_usd)}
                        </div>
                      </div>
                    </div>

                    {s.billing_provider && (
                      <div className="mt-2 pt-2 border-t border-[var(--border)]/60 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--muted-foreground)]">
                        <span>Provider: {s.billing_provider}</span>
                        {s.billing_mode && <span>Mode: {s.billing_mode}</span>}
                        {s.reasoning_tokens > 0 && (
                          <span>Reasoning: {fmt(s.reasoning_tokens)}</span>
                        )}
                        {s.cache_write_tokens > 0 && (
                          <span>Cache write: {fmt(s.cache_write_tokens)}</span>
                        )}
                        <span className="font-mono">ID: {s.id.slice(0, 12)}…</span>
                      </div>
                    )}
                  </SpotlightCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </FadeIn>
      )}

      {sessions.length > 0 && (
        <FadeIn>
          <SpotlightCard className="p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--accent)]" />
              Aggregate ({days}d)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  Sessions
                </p>
                <NumberTicker
                  value={sessions.length}
                  className="text-xl font-semibold"
                />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  API Calls
                </p>
                <NumberTicker
                  value={totalCalls}
                  className="text-xl font-semibold text-amber-400"
                />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  Tokens
                </p>
                <NumberTicker
                  value={totalTokens}
                  format={fmt}
                  className="text-xl font-semibold text-sky-400"
                />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  Est. Cost
                </p>
                <NumberTicker
                  value={totalCost}
                  format={(n) => "$" + n.toFixed(2)}
                  className="text-xl font-semibold text-[var(--cost)]"
                />
              </div>
            </div>
          </SpotlightCard>
        </FadeIn>
      )}
    </PageShell>
  );
}

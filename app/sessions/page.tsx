"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ExternalLink, Clock, Activity } from "lucide-react";
import type { Session } from "@/lib/hermes";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtCost(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toFixed(4);
}

function ago(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
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
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-5xl">
        <div className="h-8 w-48 bg-[var(--card)] rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-[var(--card)] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[var(--accent)]" />
          Sessions
          <span className="text-sm font-normal text-[var(--muted-foreground)]">
            ({sessions.length})
          </span>
        </h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-[var(--card)] border border-[var(--border)] rounded-md px-3 py-1.5 text-sm text-[var(--foreground)]"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-12 text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-3" />
          <p className="text-sm text-[var(--muted-foreground)]">
            No sessions found in the last {days} days
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--muted)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">
                      {s.title || s.id.slice(0, 20) + "…"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--muted-foreground)]">
                      {s.source}
                    </span>
                    {s.cost_status && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--muted-foreground)]">
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
                    <span>{s.message_count} msgs</span>
                    <span>{s.tool_call_count} tools</span>
                    <span>{s.api_call_count} API calls</span>
                    {s.model && (
                      <span className="font-mono text-[10px]">{s.model}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <div className="text-xs space-x-2">
                    <span className="text-blue-400">
                      {fmt(s.input_tokens)} in
                    </span>
                    <span className="text-purple-400">
                      {fmt(s.output_tokens)} out
                    </span>
                  </div>
                  {s.cache_read_tokens > 0 && (
                    <div className="text-[10px] text-[var(--accent)]">
                      {fmt(s.cache_read_tokens)} cache
                    </div>
                  )}
                  <div className="text-xs font-mono text-[var(--accent)]">
                    {fmtCost(s.estimated_cost_usd)}
                  </div>
                </div>
              </div>

              {/* Session detail expandable — show full summary */}
              {s.billing_provider && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--muted-foreground)]">
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
            </div>
          ))}
        </div>
      )}

      {/* Aggregate stats */}
      {sessions.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Aggregate ({days}d)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Total Sessions
              </p>
              <p className="font-bold">{sessions.length}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Total API Calls
              </p>
              <p className="font-bold">
                {sessions.reduce((s, x) => s + x.api_call_count, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Total Tokens
              </p>
              <p className="font-bold">
                {fmt(
                  sessions.reduce(
                    (s, x) => s + x.input_tokens + x.output_tokens,
                    0,
                  ),
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Est. Total Cost
              </p>
              <p className="font-bold text-[var(--accent)]">
                {fmtCost(
                  sessions.reduce(
                    (s, x) => s + (x.estimated_cost_usd ?? 0),
                    0,
                  ),
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

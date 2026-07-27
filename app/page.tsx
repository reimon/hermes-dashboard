"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Zap, Cpu, Database, DollarSign, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { PageShell, FadeIn } from "@/components/ui/motion";

interface TokenBreakdown {
  model: string;
  provider: string | null;
  sessions: number;
  api_calls: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  reasoning_tokens: number;
  estimated_cost_usd: number;
}

interface DailyUsage {
  date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
}

interface Totals {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_sessions: number;
  total_api_calls: number;
  total_cost_usd: number;
  models_used: number;
}

interface InsightsData {
  breakdown: TokenBreakdown[];
  daily: DailyUsage[];
  totals: Totals;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return Math.round(n).toLocaleString();
}

function fmtCost(n: number): string {
  return "$" + n.toFixed(4);
}

type Tone = "emerald" | "sky" | "violet" | "amber" | "rose";
const toneStyles: Record<Tone, { icon: string; ring: string; bar: string }> = {
  emerald: { icon: "text-emerald-400", ring: "from-emerald-500/30", bar: "bg-emerald-400" },
  sky: { icon: "text-sky-400", ring: "from-sky-500/30", bar: "bg-sky-400" },
  violet: { icon: "text-violet-400", ring: "from-violet-500/30", bar: "bg-violet-400" },
  amber: { icon: "text-amber-400", ring: "from-amber-500/30", bar: "bg-amber-400" },
  rose: { icon: "text-rose-400", ring: "from-rose-500/30", bar: "bg-rose-400" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  formatFn,
  suffix,
  tone,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  formatFn?: (n: number) => string;
  suffix?: string;
  tone: Tone;
  hint?: string;
}) {
  const t = toneStyles[tone];
  return (
    <SpotlightCard className="group p-4 cursor-default">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${t.ring} to-transparent ring-1 ring-inset ring-white/5`}>
            <Icon className={`h-3.5 w-3.5 ${t.icon}`} />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
            {label}
          </span>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex items-baseline gap-1">
        <NumberTicker
          value={value}
          format={formatFn}
          className={`text-2xl font-semibold tracking-tight ${t.icon}`}
        />
        {suffix && <span className="text-sm text-[var(--muted-foreground)]">{suffix}</span>}
      </div>
      {hint && (
        <p className="text-[10px] text-[var(--muted-foreground)] mt-1.5 font-mono">{hint}</p>
      )}
    </SpotlightCard>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/insights?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <SpotlightCard className="p-8 text-center space-y-3 max-w-md">
          <p className="text-[var(--destructive)] font-semibold">Error loading data</p>
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Make sure Hermes Agent is installed and state.db exists at ~/.hermes/
          </p>
        </SpotlightCard>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-[var(--card)]/60 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-[var(--card)]/60 rounded-[var(--radius)]" />
          ))}
        </div>
        <div className="h-80 bg-[var(--card)]/60 rounded-[var(--radius)]" />
      </div>
    );
  }

  const { breakdown, daily, totals } = data;
  const cacheHitRate =
    totals.total_input_tokens > 0
      ? (totals.total_cache_read_tokens /
          (totals.total_input_tokens + totals.total_cache_read_tokens)) *
        100
      : 0;

  const models = [...new Set(daily.map((d) => d.model))];
  const dailyChartData = daily.reduce<Record<string, string | number>[]>((acc, d) => {
    let entry = acc.find((e) => e.date === d.date);
    if (!entry) {
      entry = { date: d.date };
      acc.push(entry);
    }
    entry[d.model + "_in"] = d.input_tokens;
    return acc;
  }, []);

  return (
    <PageShell className="space-y-6">
      {/* Header */}
      <FadeIn className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">
            <Sparkles className="h-3 w-3 text-[var(--accent)]" />
            Overview
          </div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            Token Usage
            <span className="text-xs font-normal text-[var(--muted-foreground)] font-mono px-2 py-1 rounded-md bg-[var(--card)] border border-[var(--border)]">
              last {days}d
            </span>
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Live insights across {totals.models_used} models · {totals.total_sessions} sessions
          </p>
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
                  layoutId="period-active"
                  className="absolute inset-0 bg-[var(--accent)]/15 border border-[var(--accent)]/30 rounded-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{d}d</span>
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Stat cards */}
      <FadeIn className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          icon={Zap}
          label="API Calls"
          value={totals.total_api_calls}
          tone="amber"
          hint={`${totals.total_sessions} sessions`}
        />
        <StatCard
          icon={Cpu}
          label="Input Tokens"
          value={totals.total_input_tokens}
          formatFn={fmt}
          tone="sky"
        />
        <StatCard
          icon={Cpu}
          label="Output Tokens"
          value={totals.total_output_tokens}
          formatFn={fmt}
          tone="violet"
        />
        <StatCard
          icon={Database}
          label="Cache Hit"
          value={cacheHitRate}
          formatFn={(n) => n.toFixed(1)}
          suffix="%"
          tone="emerald"
          hint={`${fmt(totals.total_cache_read_tokens)} cached`}
        />
        <StatCard
          icon={DollarSign}
          label="Est. Cost"
          value={totals.total_cost_usd}
          formatFn={(n) => "$" + n.toFixed(2)}
          tone="rose"
          hint={fmtCost(totals.total_cost_usd)}
        />
      </FadeIn>

      {/* Bento: Model breakdown + Daily chart */}
      <FadeIn className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <SpotlightCard className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
              Tokens by Model
            </h2>
            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
              {breakdown.length} models
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={breakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmt} />
              <YAxis
                type="category"
                dataKey="model"
                width={170}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => {
                  const parts = v.split("/");
                  return parts[parts.length - 1];
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(20, 20, 25, 0.95)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  backdropFilter: "blur(12px)",
                }}
                formatter={(value, name) => [fmt(value as number), name]}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="input_tokens" name="Input" fill="var(--data-in)" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="output_tokens" name="Output" fill="var(--data-out)" stackId="a" />
              <Bar dataKey="cache_read_tokens" name="Cache" fill="var(--data-cache)" stackId="a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SpotlightCard>

        <SpotlightCard className="lg:col-span-2 p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Daily Trend
          </h2>
          {daily.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyChartData} margin={{ left: 0, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20, 20, 25, 0.95)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "10px",
                    fontSize: "12px",
                    backdropFilter: "blur(12px)",
                  }}
                  formatter={(value) => fmt(value as number)}
                />
                {models.map((model, i) => {
                  const colors = [
                    "var(--data-in)",
                    "var(--data-out)",
                    "var(--data-cache)",
                    "var(--cost)",
                    "var(--destructive)",
                  ];
                  return (
                    <Line
                      key={model}
                      type="monotone"
                      dataKey={model + "_in"}
                      name={model.split("/").pop()}
                      stroke={colors[i % colors.length]}
                      strokeWidth={2}
                      dot={false}
                      animationDuration={900}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-12">
              No daily data available
            </p>
          )}
        </SpotlightCard>
      </FadeIn>

      {/* Model breakdown table */}
      <FadeIn>
        <SpotlightCard className="p-5">
          <h2 className="text-sm font-semibold mb-4">Model Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                  <th className="text-left py-2 font-medium">Model</th>
                  <th className="text-left py-2 font-medium">Provider</th>
                  <th className="text-right py-2 font-medium">Sessions</th>
                  <th className="text-right py-2 font-medium">Calls</th>
                  <th className="text-right py-2 font-medium">Input</th>
                  <th className="text-right py-2 font-medium">Output</th>
                  <th className="text-right py-2 font-medium">Cache</th>
                  <th className="text-right py-2 font-medium">Reasoning</th>
                  <th className="text-right py-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {breakdown.map((b, idx) => (
                    <motion.tr
                      key={b.model + (b.provider ?? "")}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.4 }}
                      className="border-b border-[var(--border)]/60 hover:bg-white/[0.015] transition-colors"
                    >
                      <td className="py-2.5 font-mono text-[var(--foreground-soft)]">{b.model}</td>
                      <td className="py-2.5 text-[var(--muted-foreground)]">{b.provider || "—"}</td>
                      <td className="py-2.5 text-right tabular">{b.sessions}</td>
                      <td className="py-2.5 text-right tabular">{b.api_calls}</td>
                      <td className="py-2.5 text-right tabular text-sky-400">{fmt(b.input_tokens)}</td>
                      <td className="py-2.5 text-right tabular text-violet-400">{fmt(b.output_tokens)}</td>
                      <td className="py-2.5 text-right tabular text-emerald-400">{fmt(b.cache_read_tokens)}</td>
                      <td className="py-2.5 text-right tabular text-orange-400">{fmt(b.reasoning_tokens)}</td>
                      <td className="py-2.5 text-right font-mono text-[var(--cost)] font-medium">
                        {fmtCost(b.estimated_cost_usd)}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </SpotlightCard>
      </FadeIn>

      {/* Recent API calls log */}
      <FadeIn>
        <ApiCallLog />
      </FadeIn>
    </PageShell>
  );
}

function ApiCallLog() {
  const [logs, setLogs] = useState<{ timestamp: string; message: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs?lines=100")
      .then((r) => r.json())
      .then((data) =>
        setLogs(
          data.map((e: { timestamp: string; message: string }) => ({
            timestamp: e.timestamp,
            message: e.message,
          })),
        ),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (logs.length === 0) return null;

  return (
    <SpotlightCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Recent API Calls
        </h2>
        <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
          {logs.length} entries
        </span>
      </div>
      <div className="space-y-0.5 max-h-64 overflow-y-auto pr-2">
        {logs.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.01, 0.4), duration: 0.3 }}
            className="text-xs text-[var(--muted-foreground)] font-mono py-1 border-b border-[var(--border)]/40 last:border-0 hover:bg-white/[0.015] px-1 rounded transition-colors"
          >
            <span className="text-[var(--accent)]/70">{l.timestamp}</span>
            <span className="text-[var(--muted-foreground)]/50 mx-2">›</span>
            <span className="text-[var(--foreground-soft)]">{l.message}</span>
          </motion.div>
        ))}
      </div>
    </SpotlightCard>
  );
}

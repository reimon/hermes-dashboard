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
import { Zap, Cpu, Database, DollarSign, TrendingUp } from "lucide-react";

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
  return n.toLocaleString();
}

function fmtCost(n: number): string {
  return "$" + n.toFixed(4);
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) => (
  <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

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
        <div className="text-center space-y-3">
          <p className="text-[var(--destructive)] font-semibold">Error loading data</p>
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Make sure Hermes Agent is installed and state.db exists at ~/.hermes/
          </p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-[var(--card)] rounded" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-[var(--card)] rounded-lg" />
          ))}
        </div>
        <div className="h-80 bg-[var(--card)] rounded-lg" />
      </div>
    );
  }

  const { breakdown, daily, totals } = data;
  const cacheHitRate =
    totals.total_input_tokens > 0
      ? ((totals.total_cache_read_tokens / (totals.total_input_tokens + totals.total_cache_read_tokens)) * 100).toFixed(1)
      : "0";

  // Prepare daily chart data: pivot by model
  const models = [...new Set(daily.map((d) => d.model))];
  const dailyChartData = daily.reduce<
    Record<string, string | number>[]
  >((acc, d) => {
    let entry = acc.find((e) => e.date === d.date);
    if (!entry) {
      entry = { date: d.date };
      acc.push(entry);
    }
    entry[d.model + "_in"] = d.input_tokens;
    return acc;
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
          Token Usage
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={Zap}
          label="API Calls"
          value={totals.total_api_calls.toLocaleString()}
          color="text-yellow-400"
        />
        <StatCard
          icon={Cpu}
          label="Input Tokens"
          value={fmt(totals.total_input_tokens)}
          color="text-blue-400"
        />
        <StatCard
          icon={Cpu}
          label="Output Tokens"
          value={fmt(totals.total_output_tokens)}
          color="text-purple-400"
        />
        <StatCard
          icon={Database}
          label="Cache Hit Rate"
          value={cacheHitRate + "%"}
          color="text-[var(--accent)]"
        />
        <StatCard
          icon={DollarSign}
          label="Est. Cost"
          value={fmtCost(totals.total_cost_usd)}
          color="text-amber-400"
        />
      </div>

      {/* Model breakdown bar chart */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Tokens by Model</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={breakdown} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={fmt} />
            <YAxis
              type="category"
              dataKey="model"
              width={180}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => {
                const parts = v.split("/");
                return parts[parts.length - 1];
              }}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value, name) => [fmt(value as number), name]}
            />
            <Legend />
            <Bar dataKey="input_tokens" name="Input" fill="#60a5fa" stackId="a" />
            <Bar dataKey="output_tokens" name="Output" fill="#c084fc" stackId="a" />
            <Bar dataKey="cache_read_tokens" name="Cache Read" fill="#4ade80" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily usage line chart */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Daily Usage</h2>
        {daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyChartData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmt} />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => fmt(value as number)}
              />
              {models.map((model, i) => {
                const colors = ["#60a5fa", "#c084fc", "#4ade80", "#fbbf24", "#f87171"];
                return (
                  <Line
                    key={model}
                    type="monotone"
                    dataKey={model + "_in"}
                    name={model.split("/").pop()}
                    stroke={colors[i % colors.length]}
                    strokeWidth={2}
                    dot={false}
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
      </div>

      {/* Model detail table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Model Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="text-left py-2">Model</th>
                <th className="text-left py-2">Provider</th>
                <th className="text-right py-2">Sessions</th>
                <th className="text-right py-2">API Calls</th>
                <th className="text-right py-2">Input</th>
                <th className="text-right py-2">Output</th>
                <th className="text-right py-2">Cache</th>
                <th className="text-right py-2">Reasoning</th>
                <th className="text-right py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b) => (
                <tr key={b.model + b.provider} className="border-b border-[var(--border)]">
                  <td className="py-2 font-mono">{b.model}</td>
                  <td className="py-2 text-[var(--muted-foreground)]">
                    {b.provider || "—"}
                  </td>
                  <td className="py-2 text-right">{b.sessions}</td>
                  <td className="py-2 text-right">{b.api_calls}</td>
                  <td className="py-2 text-right">{fmt(b.input_tokens)}</td>
                  <td className="py-2 text-right">{fmt(b.output_tokens)}</td>
                  <td className="py-2 text-right">{fmt(b.cache_read_tokens)}</td>
                  <td className="py-2 text-right">{fmt(b.reasoning_tokens)}</td>
                  <td className="py-2 text-right font-mono text-[var(--accent)]">
                    {fmtCost(b.estimated_cost_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent API calls log */}
      <ApiCallLog />
    </div>
  );
}

function ApiCallLog() {
  const [logs, setLogs] = useState<
    { timestamp: string; message: string }[]
  >([]);
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
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-3">Recent API Calls</h2>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {logs.map((l, i) => (
          <div
            key={i}
            className="text-xs text-[var(--muted-foreground)] font-mono py-0.5 border-b border-[var(--border)]/50 last:border-0"
          >
            <span className="text-[var(--foreground)]/60">{l.timestamp}</span>
            {" — "}
            {l.message}
          </div>
        ))}
      </div>
    </div>
  );
}

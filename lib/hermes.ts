/**
 * lib/hermes.ts — Data access layer for Hermes Agent.
 *
 * Reads state.db (SQLite), config.yaml, .env, and agent.log.
 * All paths resolve to ~/.hermes/ unless overridden.
 */
import Database from "better-sqlite3";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";
import { getHermesHome } from "./hermes-home";

// ─── SQLite connection (read-only, WAL-safe) ────────────────────────────────

let _db: Database.Database | null = null;
let _dbPath: string | null = null;

function getDb(): Database.Database {
  const dbPath = join(getHermesHome(), "state.db");
  // Rebuild the handle if the resolved Hermes home changed (e.g. via Setup page).
  if (_db && _dbPath === dbPath) return _db;
  if (_db) {
    try {
      _db.close();
    } catch {
      // ignore close errors
    }
    _db = null;
  }
  if (!existsSync(dbPath)) throw new Error(`state.db not found at ${dbPath}`);
  _db = new Database(dbPath, { readonly: true });
  _db.pragma("journal_mode = WAL");
  _dbPath = dbPath;
  return _db;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  source: string;
  model: string | null;
  billing_provider: string | null;
  billing_mode: string | null;
  title: string | null;
  started_at: number;
  ended_at: number | null;
  message_count: number;
  tool_call_count: number;
  api_call_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  estimated_cost_usd: number | null;
  actual_cost_usd: number | null;
  cost_status: string | null;
  cost_source: string | null;
}

export interface TokenBreakdown {
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

export interface DailyUsage {
  date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
}

export interface HermesConfig {
  provider: string | null;
  model: string | null;
  config_raw: Record<string, unknown>;
  env_vars: Record<string, string>;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  session_id?: string;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function getSessions(days = 30, limit = 100): Session[] {
  const db = getDb();
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const rows = db
    .prepare(
      `SELECT id, source, model, billing_provider, billing_mode, title,
              started_at, ended_at, message_count, tool_call_count, api_call_count,
              input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
              reasoning_tokens, estimated_cost_usd, actual_cost_usd, cost_status, cost_source
       FROM sessions
       WHERE started_at > ?
       ORDER BY started_at DESC
       LIMIT ?`,
    )
    .all(since, limit) as Session[];
  return rows;
}

export function getSessionById(id: string): Session | null {
  const db = getDb();
  return (
    (db
      .prepare(
        `SELECT id, source, model, billing_provider, billing_mode, title,
                started_at, ended_at, message_count, tool_call_count, api_call_count,
                input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
                reasoning_tokens, estimated_cost_usd, actual_cost_usd, cost_status, cost_source
         FROM sessions WHERE id = ?`,
      )
      .get(id) as Session | undefined) ?? null
  );
}

// ─── Token usage ─────────────────────────────────────────────────────────────

export function getTokenBreakdown(days = 30): TokenBreakdown[] {
  const db = getDb();
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  return db
    .prepare(
      `SELECT 
         COALESCE(model, 'unknown') as model,
         billing_provider as provider,
         COUNT(*) as sessions,
         COALESCE(SUM(api_call_count), 0) as api_calls,
         COALESCE(SUM(input_tokens), 0) as input_tokens,
         COALESCE(SUM(output_tokens), 0) as output_tokens,
         COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens,
         COALESCE(SUM(reasoning_tokens), 0) as reasoning_tokens,
         COALESCE(ROUND(SUM(estimated_cost_usd), 6), 0) as estimated_cost_usd
       FROM sessions
       WHERE started_at > ?
       GROUP BY model, billing_provider
       ORDER BY SUM(input_tokens + output_tokens) DESC`,
    )
    .all(since) as TokenBreakdown[];
}

export function getDailyUsage(days = 30): DailyUsage[] {
  const db = getDb();
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  return db
    .prepare(
      `SELECT 
         DATE(ROUND(started_at), 'unixepoch') as date,
         COALESCE(model, 'unknown') as model,
         COALESCE(SUM(input_tokens), 0) as input_tokens,
         COALESCE(SUM(output_tokens), 0) as output_tokens,
         COALESCE(ROUND(SUM(estimated_cost_usd), 6), 0) as estimated_cost_usd
       FROM sessions
       WHERE started_at > ?
       GROUP BY date, model
       ORDER BY date ASC`,
    )
    .all(since) as DailyUsage[];
}

export function getTotalStats(days = 30) {
  const breakdown = getTokenBreakdown(days);
  return {
    total_input_tokens: breakdown.reduce((s, b) => s + b.input_tokens, 0),
    total_output_tokens: breakdown.reduce((s, b) => s + b.output_tokens, 0),
    total_cache_read_tokens: breakdown.reduce((s, b) => s + b.cache_read_tokens, 0),
    total_sessions: breakdown.reduce((s, b) => s + b.sessions, 0),
    total_api_calls: breakdown.reduce((s, b) => s + b.api_calls, 0),
    total_cost_usd: breakdown.reduce((s, b) => s + b.estimated_cost_usd, 0),
    models_used: breakdown.length,
  };
}

// ─── Config ──────────────────────────────────────────────────────────────────

export function getConfig(): HermesConfig {
  const HERMES_HOME = getHermesHome();
  const configPath = join(HERMES_HOME, "config.yaml");
  const envPath = join(HERMES_HOME, ".env");

  let configRaw: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      configRaw = (yaml.load(raw) as Record<string, unknown>) || {};
    } catch {
      // config corrupt or unreadable
    }
  }

  const envVars: Record<string, string> = {};
  if (existsSync(envPath)) {
    try {
      const lines = readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          envVars[key] = value;
        }
      }
    } catch {
      // env file unreadable
    }
  }

  const modelConfig = (configRaw.model as Record<string, unknown>) || {};
  return {
    provider: (modelConfig.provider as string) || null,
    model: (modelConfig.default as string) || null,
    config_raw: configRaw,
    env_vars: envVars,
  };
}

export function getApiKeys(): { key: string; value: string; masked: string }[] {
  const config = getConfig();
  const keys: { key: string; value: string; masked: string }[] = [];

  for (const [key, value] of Object.entries(config.env_vars)) {
    if (!value) continue;
    // Only include API-key-like env vars
    const isApiKey =
      key.endsWith("_API_KEY") ||
      key.endsWith("_KEY") ||
      key.endsWith("_TOKEN") ||
      key === "GITHUB_TOKEN" ||
      key === "HF_TOKEN";
    if (!isApiKey) continue;

    const visible = value.length > 8 ? value.slice(0, 4) : value.slice(0, 2);
    const masked = visible + "•••" + (value.length > 8 ? value.slice(-4) : "");
    keys.push({ key, value, masked });
  }

  return keys;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export function getAgentLog(lines = 200): LogEntry[] {
  const logPath = join(getHermesHome(), "logs", "agent.log");
  if (!existsSync(logPath)) return [];

  try {
    const content = readFileSync(logPath, "utf-8");
    const allLines = content.split("\n").filter(Boolean);
    const tail = allLines.slice(-lines);

    return tail.map((line) => {
      // Parse: 2026-05-22 23:06:21,706 INFO [session_id] module: message
      const match = line.match(
        /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2},\d{3})\s+(\w+)\s+(?:\[([^\]]+)\]\s+)?(\S+):\s+(.*)$/,
      );
      if (!match) {
        return { timestamp: "", level: "INFO", module: "", message: line };
      }
      return {
        timestamp: match[1],
        level: match[2],
        session_id: match[3] || undefined,
        module: match[4],
        message: match[5],
      };
    });
  } catch {
    return [];
  }
}

// ─── API call log parsing (from agent.log) ───────────────────────────────────

export function getApiCallLogs(lines = 500): LogEntry[] {
  const all = getAgentLog(lines);
  return all.filter((e) => e.module === "agent.conversation_loop" && e.message.startsWith("API call #"));
}

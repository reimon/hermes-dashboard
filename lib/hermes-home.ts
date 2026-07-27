/**
 * lib/hermes-home.ts — Central resolution & detection of the Hermes home dir.
 *
 * Resolution order (highest priority first):
 *   1. process.env.HERMES_HOME   (explicit override, wins over everything)
 *   2. ~/.hermes-dashboard.json  { hermesHome }  (saved via the Setup page)
 *   3. ~/.hermes                 (default)
 *
 * Resolved PER CALL (not a module-load constant) so changes made through the
 * dashboard take effect without restarting the server.
 *
 * Server-only (uses fs/os) — never import from client components.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const SETTINGS_PATH = join(homedir(), ".hermes-dashboard.json");

export type ResolvedFrom = "env" | "settings" | "default";

export interface DashboardSettings {
  hermesHome?: string;
}

// ─── Dashboard settings (persisted choice) ───────────────────────────────────

function readSettings(): DashboardSettings {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf-8")) as DashboardSettings;
  } catch {
    return {};
  }
}

function writeSettings(settings: DashboardSettings): void {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

// ─── Resolution ──────────────────────────────────────────────────────────────

export function resolveHermesHome(): { path: string; from: ResolvedFrom } {
  const env = process.env.HERMES_HOME?.trim();
  if (env) return { path: env, from: "env" };

  const saved = readSettings().hermesHome?.trim();
  if (saved) return { path: saved, from: "settings" };

  return { path: join(homedir(), ".hermes"), from: "default" };
}

/** The active Hermes home directory. Use this everywhere instead of a constant. */
export function getHermesHome(): string {
  return resolveHermesHome().path;
}

/** Persist a chosen Hermes home. Ignored at runtime if HERMES_HOME env is set. */
export function setHermesHome(path: string): void {
  const settings = readSettings();
  settings.hermesHome = path;
  writeSettings(settings);
}

/** Forget the saved choice and fall back to the default. */
export function clearHermesHome(): void {
  const settings = readSettings();
  delete settings.hermesHome;
  writeSettings(settings);
}

export function isEnvOverride(): boolean {
  return Boolean(process.env.HERMES_HOME?.trim());
}

// ─── Detection & validation ──────────────────────────────────────────────────

export interface HermesInspection {
  path: string;
  exists: boolean; // path exists on disk
  isDir: boolean; // ...and is a directory
  files: {
    stateDb: boolean; // state.db          — sessions / token usage
    configYaml: boolean; // config.yaml    — provider / model
    env: boolean; // .env                  — API keys
    instances: boolean; // llm-instances.json
    logs: boolean; // logs/agent.log
  };
  /** Usable as a Hermes home: a directory that has at least state.db or config.yaml. */
  valid: boolean;
}

export function inspectHermesHome(path: string): HermesInspection {
  let exists = false;
  let isDir = false;
  try {
    const st = statSync(path);
    exists = true;
    isDir = st.isDirectory();
  } catch {
    // path does not exist / not accessible
  }

  const has = (rel: string): boolean => {
    if (!isDir) return false;
    try {
      return existsSync(join(path, rel));
    } catch {
      return false;
    }
  };

  const files = {
    stateDb: has("state.db"),
    configYaml: has("config.yaml"),
    env: has(".env"),
    instances: has("llm-instances.json"),
    logs: has(join("logs", "agent.log")),
  };

  return {
    path,
    exists,
    isDir,
    files,
    valid: isDir && (files.stateDb || files.configYaml),
  };
}

/** Candidate locations, in priority order. Only existing paths are returned. */
export function detectHermesHomes(): HermesInspection[] {
  const home = homedir();
  const candidates = [
    process.env.HERMES_HOME?.trim(),
    join(home, ".hermes"),
    join(home, ".config", "hermes"),
    join(home, "hermes"),
    "/opt/hermes",
    "/etc/hermes",
    join(process.cwd(), ".hermes"),
  ].filter((c): c is string => Boolean(c));

  const seen = new Set<string>();
  const found: HermesInspection[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const inspection = inspectHermesHome(candidate);
    if (inspection.exists) found.push(inspection);
  }
  return found;
}

/** Scaffold an empty Hermes home (dir + empty .env + minimal config.yaml). */
export function initHermesHome(path: string): HermesInspection {
  mkdirSync(path, { recursive: true });

  const envPath = join(path, ".env");
  if (!existsSync(envPath)) {
    writeFileSync(envPath, "# Hermes environment variables\n", "utf-8");
  }

  const configPath = join(path, "config.yaml");
  if (!existsSync(configPath)) {
    writeFileSync(configPath, "model:\n  provider: openrouter\n", "utf-8");
  }

  return inspectHermesHome(path);
}

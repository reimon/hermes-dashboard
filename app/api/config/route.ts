import { NextResponse } from "next/server";
import { getConfig, getApiKeys } from "@/lib/hermes";
import { saveEnvVar, deleteEnvVar } from "@/lib/hermes-write";
import { resolveHermesHome } from "@/lib/hermes-home";

function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return value.slice(0, 2) + "•••";
  return value.slice(0, 4) + "•••" + value.slice(-4);
}

export async function GET() {
  try {
    const config = getConfig();
    const apiKeys = getApiKeys();
    const resolved = resolveHermesHome();

    const env_vars = Object.entries(config.env_vars).map(([key, value]) => ({
      key,
      value,
      masked: maskValue(value),
    }));

    return NextResponse.json({
      provider: config.provider,
      model: config.model,
      api_keys: apiKeys,
      env_vars,
      hermes_home: resolved.path,
      resolved_from: resolved.from,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "setEnv") {
      const key = String(body.key || "").trim();
      const value = String(body.value ?? "");
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        throw new Error(
          "Invalid variable name. Use letters, digits and underscore; it cannot start with a digit.",
        );
      }
      if (/[\r\n]/.test(value)) {
        throw new Error("Value cannot contain line breaks.");
      }
      saveEnvVar(key, value);
      return NextResponse.json({ ok: true });
    }

    if (action === "deleteEnv") {
      const key = String(body.key || "").trim();
      if (!key) throw new Error("key is required");
      deleteEnvVar(key);
      return NextResponse.json({ ok: true });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}

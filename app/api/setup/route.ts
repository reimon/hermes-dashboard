import { NextResponse } from "next/server";
import {
  resolveHermesHome,
  detectHermesHomes,
  inspectHermesHome,
  setHermesHome,
  clearHermesHome,
  initHermesHome,
  isEnvOverride,
} from "@/lib/hermes-home";

export async function GET() {
  const resolved = resolveHermesHome();
  return NextResponse.json({
    current: resolved.path,
    resolvedFrom: resolved.from,
    currentInspection: inspectHermesHome(resolved.path),
    detected: detectHermesHomes(),
    envOverride: isEnvOverride(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action || "");
    const path = typeof body.path === "string" ? body.path.trim() : "";

    switch (action) {
      case "inspect": {
        if (!path) throw new Error("path is required");
        return NextResponse.json({ inspection: inspectHermesHome(path) });
      }
      case "save": {
        if (!path) throw new Error("path is required");
        const inspection = inspectHermesHome(path);
        if (!inspection.exists || !inspection.isDir) {
          throw new Error(`Not a directory: ${path}`);
        }
        setHermesHome(path);
        return NextResponse.json({
          ok: true,
          inspection,
          resolvedFrom: resolveHermesHome().from,
        });
      }
      case "init": {
        if (!path) throw new Error("path is required");
        const inspection = initHermesHome(path);
        setHermesHome(path);
        return NextResponse.json({ ok: true, inspection });
      }
      case "reset": {
        clearHermesHome();
        const resolved = resolveHermesHome();
        return NextResponse.json({
          ok: true,
          current: resolved.path,
          resolvedFrom: resolved.from,
        });
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}

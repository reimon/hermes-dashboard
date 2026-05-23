import { NextResponse } from "next/server";
import {
  getInstances,
  getRegistry,
  addInstance,
  updateInstance,
  deleteInstance,
  updateStrategy,
  reorderPriorities,
  generateConfig,
} from "@/lib/instances";
import { PROVIDERS, PROVIDER_MODELS } from "@/lib/hermes-write";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "config") {
      return NextResponse.json(generateConfig());
    }
    return NextResponse.json({
      instances: getInstances(true),
      registry: getRegistry(),
      providers: PROVIDERS,
      models: PROVIDER_MODELS,
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
    const { action } = body;

    switch (action) {
      case "add": {
        const inst = addInstance({
          name: body.name,
          provider: body.provider,
          model: body.model,
          apiKey: body.apiKey || "",
          baseUrl: body.baseUrl || "",
          tags: body.tags || [],
          priority: body.priority ?? 99,
          enabled: body.enabled ?? true,
        });
        return NextResponse.json({ ok: true, instance: inst });
      }

      case "update": {
        const inst = updateInstance(body.id, {
          name: body.name,
          provider: body.provider,
          model: body.model,
          apiKey: body.apiKey,
          baseUrl: body.baseUrl,
          tags: body.tags,
          priority: body.priority,
          enabled: body.enabled,
        });
        if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true, instance: inst });
      }

      case "delete": {
        const ok = deleteInstance(body.id);
        return NextResponse.json({ ok });
      }

      case "reorder": {
        reorderPriorities(body.ids);
        return NextResponse.json({ ok: true });
      }

      case "strategy": {
        updateStrategy(body.strategy, body.fallbackEnabled);
        return NextResponse.json({ ok: true });
      }

      case "generateConfig": {
        return NextResponse.json(generateConfig());
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

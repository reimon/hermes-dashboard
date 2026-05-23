import { NextResponse } from "next/server";
import {
  getProviderState,
  saveEnvVar,
  saveConfigProvider,
  saveConfigModel,
  saveConfigBaseUrl,
  PROVIDERS,
} from "@/lib/hermes-write";
import { getApiKeys } from "@/lib/hermes";

export async function GET() {
  try {
    const state = getProviderState();
    const keys = getApiKeys();
    return NextResponse.json({
      ...state,
      apiKeys: state.apiKeys,
      keyList: keys,
      availableProviders: PROVIDERS,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "saveApiKey") {
      const { key, value } = body;
      if (!key) throw new Error("key is required");
      saveEnvVar(key, value || "");
      return NextResponse.json({ ok: true });
    }

    if (body.action === "saveProvider") {
      const { provider, model } = body;
      if (!provider) throw new Error("provider is required");
      saveConfigProvider(provider, model);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "saveModel") {
      const { model } = body;
      if (!model) throw new Error("model is required");
      saveConfigModel(model);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "saveBaseUrl") {
      const { baseUrl } = body;
      saveConfigBaseUrl(baseUrl || "");
      return NextResponse.json({ ok: true });
    }

    throw new Error(`Unknown action: ${body.action}`);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

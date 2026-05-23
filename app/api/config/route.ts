import { NextResponse } from "next/server";
import { getConfig, getApiKeys } from "@/lib/hermes";

export async function GET() {
  try {
    const config = getConfig();
    const apiKeys = getApiKeys();
    return NextResponse.json({
      provider: config.provider,
      model: config.model,
      api_keys: apiKeys,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

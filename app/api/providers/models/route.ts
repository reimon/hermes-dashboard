import { NextResponse } from "next/server";
import { fetchProviderModels } from "@/lib/hermes-write";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const apiKey = searchParams.get("apiKey") || "";
  const baseUrl = searchParams.get("baseUrl") || undefined;

  if (!provider) {
    return NextResponse.json(
      { error: "provider is required" },
      { status: 400 },
    );
  }

  try {
    const models = await fetchProviderModels(provider, apiKey, baseUrl);
    return NextResponse.json({ provider, models });
  } catch (err) {
    return NextResponse.json(
      {
        provider,
        models: [],
        error: err instanceof Error ? err.message : "Failed to fetch models",
      },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { testConnection } from "@/lib/hermes-write";

export async function POST(request: Request) {
  try {
    const { provider, model, apiKey, baseUrl } = await request.json();
    if (!provider || !model) {
      return NextResponse.json(
        { error: "provider and model are required" },
        { status: 400 },
      );
    }
    const result = await testConnection(provider, model, apiKey, baseUrl);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

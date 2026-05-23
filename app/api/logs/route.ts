import { NextResponse } from "next/server";
import { getApiCallLogs } from "@/lib/hermes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lines = parseInt(searchParams.get("lines") || "200", 10);

  try {
    const logs = getApiCallLogs(lines);
    return NextResponse.json(logs);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

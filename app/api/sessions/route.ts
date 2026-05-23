import { NextResponse } from "next/server";
import { getSessions } from "@/lib/hermes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const sessions = getSessions(days, limit);
    return NextResponse.json(sessions);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

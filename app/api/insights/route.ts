import { NextResponse } from "next/server";
import { getTokenBreakdown, getDailyUsage, getTotalStats } from "@/lib/hermes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const [breakdown, daily, totals] = await Promise.all([
      Promise.resolve(getTokenBreakdown(days)),
      Promise.resolve(getDailyUsage(days)),
      Promise.resolve(getTotalStats(days)),
    ]);
    return NextResponse.json({ breakdown, daily, totals });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

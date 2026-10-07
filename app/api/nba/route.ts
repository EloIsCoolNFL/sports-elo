import { NextResponse } from "next/server";
import { fetchNBASeason } from "@/lib/nba";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const season = Number(
      searchParams.get("season") ?? "2024"
    );

    const games = await fetchNBASeason(season);

    return NextResponse.json({
      season,
      count: games.length,
      games,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch NBA data" },
      { status: 500 }
    );
  }
}
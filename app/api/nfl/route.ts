import { NextResponse } from "next/server";
import { fetchNFLSeason } from "@/lib/nfl";

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const season = Number(
      searchParams.get("season") ??
        "2026"
    );

    const games =
      await fetchNFLSeason(season);

    return NextResponse.json({
      season,
      count: games.length,
      games,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to fetch NFL data",
      },
      {
        status: 500,
      }
    );
  }
}
import { NextResponse } from "next/server";
import { fetchNHLSeason } from "@/lib/nhl";

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

    if (
      !Number.isInteger(season) ||
      season < 1900 ||
      season > 2100
    ) {
      return NextResponse.json(
        {
          error: "Invalid NHL season",
        },
        {
          status: 400,
        }
      );
    }

    const games =
      await fetchNHLSeason(season);

    return NextResponse.json({
      season,
      count: games.length,
      games,
    });
  } catch (error) {
    console.error(
      "Failed to fetch NHL season:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch NHL data",
      },
      {
        status: 500,
      }
    );
  }
}
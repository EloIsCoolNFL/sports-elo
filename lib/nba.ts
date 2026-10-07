import type { Game } from "./games";

export async function fetchNBASeason(
  seasonYear: number
): Promise<Game[]> {
  if (seasonYear <= 2024) {
    return fetchLegacyNBASeason(seasonYear);
  }

  return fetchStatsNBASeason(seasonYear);
}

async function fetchLegacyNBASeason(
  seasonYear: number
): Promise<Game[]> {
  const url =
    `https://data.nba.com/data/10s/v2015/json/mobile_teams/nba/` +
    `${seasonYear}/league/00_full_schedule.json`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `NBA historical request failed: ${response.status}`
    );
  }

  const data = await response.json();

  const games: Game[] = [];

  for (const month of data.lscd ?? []) {
    for (const game of month.mscd?.g ?? []) {
      if (game.stt !== "Final") {
        continue;
      }

      const homeScore = Number(game.h?.s);
      const awayScore = Number(game.v?.s);

      if (
        !Number.isFinite(homeScore) ||
        !Number.isFinite(awayScore)
      ) {
        continue;
      }

      if (
        !game.gdte ||
        !game.h?.tc ||
        !game.h?.tn ||
        !game.v?.tc ||
        !game.v?.tn
      ) {
        continue;
      }

      games.push({
        date: game.gdte,
        homeTeam: `${game.h.tc} ${game.h.tn}`,
        awayTeam: `${game.v.tc} ${game.v.tn}`,
        homeScore,
        awayScore,
      });
    }
  }

  return sortGames(games);
}

async function fetchStatsNBASeason(
  seasonYear: number
): Promise<Game[]> {
  const season = `${seasonYear}-${String(
    seasonYear + 1
  ).slice(-2)}`;

  const url =
    `https://stats.nba.com/stats/scheduleleaguev2` +
    `?LeagueID=00&Season=${season}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.nba.com/",
      Origin: "https://www.nba.com",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `NBA Stats request failed: ${response.status}`
    );
  }

  const data = await response.json();

  const games: Game[] = [];

  for (
    const dateBlock of
      data.leagueSchedule?.gameDates ?? []
  ) {
    for (const game of dateBlock.games ?? []) {
      // Only completed games
      if (game.gameStatus !== 3) {
        continue;
      }

      const label =
        (game.gameLabel ?? "").toLowerCase();

      // Exclude preseason and All-Star games
      if (
        label.includes("preseason") ||
        label.includes("all-star")
      ) {
        continue;
      }

      const date = getGameDate(
        game.gameDateEst ?? dateBlock.gameDate
      );

      if (!date) {
        continue;
      }

      const homeScore = Number(
        game.homeTeam?.score
      );

      const awayScore = Number(
        game.awayTeam?.score
      );

      if (
        !Number.isFinite(homeScore) ||
        !Number.isFinite(awayScore)
      ) {
        continue;
      }

      const homeTeam = buildTeamName(
        game.homeTeam
      );

      const awayTeam = buildTeamName(
        game.awayTeam
      );

      if (!homeTeam || !awayTeam) {
        continue;
      }

      games.push({
        date,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
      });
    }
  }

  return sortGames(games);
}

function buildTeamName(team: any): string {
  const city = team?.teamCity ?? "";
  const name = team?.teamName ?? "";

  if (!city || !name) {
    return "";
  }

  return `${city} ${name}`;
}

function getGameDate(
  rawDate: string | undefined
): string | null {
  if (!rawDate) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    return rawDate.slice(0, 10);
  }

  const parsed = new Date(rawDate);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function sortGames(games: Game[]): Game[] {
  return [...games].sort(
    (a, b) =>
      new Date(`${a.date}T12:00:00`).getTime() -
      new Date(`${b.date}T12:00:00`).getTime()
  );
}
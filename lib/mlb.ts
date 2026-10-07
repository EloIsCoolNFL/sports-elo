import type { Game } from "./games";

export async function fetchMLBSeason(
  seasonYear: number
): Promise<Game[]> {
  const url =
    `https://statsapi.mlb.com/api/v1/schedule` +
    `?sportId=1` +
    `&season=${seasonYear}` +
    `&gameTypes=R,F,D,L,W`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `MLB request failed: ${response.status}`
    );
  }

  const data = await response.json();

  const games: Game[] = [];

  for (const dateGroup of data.dates ?? []) {
    for (const game of dateGroup.games ?? []) {
      const detailedState =
        game.status?.detailedState ?? "";

      const abstractState =
        game.status?.abstractGameState ?? "";

      const isCompleted =
        detailedState === "Final" ||
        detailedState === "Game Over" ||
        abstractState === "Final";

      if (!isCompleted) {
        continue;
      }

      const home =
        game.teams?.home;

      const away =
        game.teams?.away;

      if (!home || !away) {
        continue;
      }

      const homeScore =
        Number(home.score);

      const awayScore =
        Number(away.score);

      if (
        !Number.isFinite(homeScore) ||
        !Number.isFinite(awayScore)
      ) {
        continue;
      }

      const homeTeam =
        home.team?.name;

      const awayTeam =
        away.team?.name;

      if (!homeTeam || !awayTeam) {
        continue;
      }

      const date =
        game.officialDate ??
        dateGroup.date;

      if (!date) {
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

function sortGames(
  games: Game[]
): Game[] {
  const uniqueGames =
    new Map<string, Game>();

  for (const game of games) {
    const key =
      `${game.date}|` +
      `${game.awayTeam}|` +
      `${game.homeTeam}`;

    uniqueGames.set(
      key,
      game
    );
  }

  return Array.from(
    uniqueGames.values()
  ).sort(
    (a, b) =>
      new Date(
        `${a.date}T12:00:00`
      ).getTime() -
      new Date(
        `${b.date}T12:00:00`
      ).getTime()
  );
}
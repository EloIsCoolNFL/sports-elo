import type { Game } from "./games";

export async function fetchNHLSeason(
  seasonYear: number
): Promise<Game[]> {
  const games: Game[] = [];

  /*
   * NHL seasons begin in the fall and can run
   * through June of the following calendar year.
   *
   * We start October 1 and walk forward one week
   * at a time through June 30.
   */
  const startDate = new Date(
    `${seasonYear}-10-01T12:00:00`
  );

  const endDate = new Date(
    `${seasonYear + 1}-06-30T12:00:00`
  );

  const currentDate =
    new Date(startDate);

  while (currentDate <= endDate) {
    const dateString =
      formatDate(currentDate);

    const url =
      `https://api-web.nhle.com/v1/schedule/${dateString}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `NHL request failed for ${dateString}: ${response.status}`
      );
    }

    const data =
      await response.json();

    for (
      const day of
        data.gameWeek ?? []
    ) {
      for (
        const game of
          day.games ?? []
      ) {
        /*
         * NHL game types:
         *
         * 1 = preseason
         * 2 = regular season
         * 3 = playoffs
         *
         * We only want regular season + playoffs.
         */
        if (
          game.gameType !== 2 &&
          game.gameType !== 3
        ) {
          continue;
        }

        /*
         * Only completed games should affect Elo.
         *
         * NHL responses may use FINAL or OFF
         * for finished games.
         */
        const gameState =
          game.gameState ?? "";

        if (
          gameState !== "FINAL" &&
          gameState !== "OFF"
        ) {
          continue;
        }

        const home =
          game.homeTeam;

        const away =
          game.awayTeam;

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
          getTeamName(home);

        const awayTeam =
          getTeamName(away);

        if (
          !homeTeam ||
          !awayTeam
        ) {
          continue;
        }

        const date =
          game.gameDate ??
          day.date;

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

    /*
     * NHL schedule endpoint returns roughly
     * one week at a time, so jump forward
     * seven days.
     */
    currentDate.setDate(
      currentDate.getDate() + 7
    );
  }

  return sortGames(games);
}

function getTeamName(
  team: any
): string {
  /*
   * Some NHL responses may provide a full
   * name directly.
   */
  const fullName =
    team.name?.default;

  if (fullName) {
    return fullName;
  }

  /*
   * Otherwise build the full franchise name
   * from place + common name.
   */
  const place =
    team.placeName?.default ?? "";

  const commonName =
    team.commonName?.default ?? "";

  if (
    place &&
    commonName
  ) {
    return `${place} ${commonName}`;
  }

  /*
   * Final fallback.
   */
  return (
    team.abbrev ??
    ""
  );
}

function formatDate(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sortGames(
  games: Game[]
): Game[] {
  /*
   * Since each NHL request returns a week,
   * adjacent requests can overlap.
   *
   * Deduplicate before calculating Elo.
   */
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
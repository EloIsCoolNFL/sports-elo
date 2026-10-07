import type { Game } from "./games";

export async function fetchNFLSeason(
  seasonYear: number
): Promise<Game[]> {
  const regularSeason = await fetchNFLSeasonType(
    seasonYear,
    2,
    18
  );

  const postseason = await fetchNFLSeasonType(
    seasonYear,
    3,
    5
  );

  return sortGames([
    ...regularSeason,
    ...postseason,
  ]);
}

async function fetchNFLSeasonType(
  seasonYear: number,
  seasonType: number,
  maxWeek: number
): Promise<Game[]> {
  const games: Game[] = [];

  for (
    let week = 1;
    week <= maxWeek;
    week++
  ) {
    const url =
      `https://cdn.espn.com/core/nfl/scoreboard` +
      `?xhr=1` +
      `&year=${seasonYear}` +
      `&week=${week}` +
      `&seasontype=${seasonType}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `NFL request failed for ${seasonYear}, season type ${seasonType}, week ${week}: ${response.status}`
      );
    }

    const data = await response.json();

    const scoreboard =
      data.content?.sbData ?? data;

    for (
      const event of scoreboard.events ?? []
    ) {
      /*
       * Make sure ESPN actually returned
       * the season we requested.
       */
      if (
        event.season?.year !== seasonYear ||
        event.season?.type !== seasonType
      ) {
        continue;
      }

      const competition =
        event.competitions?.[0];

      if (!competition) {
        continue;
      }

      /*
       * Only completed games affect Elo.
       */
      const completed =
        competition.status?.type?.completed;

      if (!completed) {
        continue;
      }

      const home =
        competition.competitors?.find(
          (competitor: any) =>
            competitor.homeAway === "home"
        );

      const away =
        competition.competitors?.find(
          (competitor: any) =>
            competitor.homeAway === "away"
        );

      if (!home || !away) {
        continue;
      }

      const homeScore = Number(home.score);
      const awayScore = Number(away.score);

      if (
        !Number.isFinite(homeScore) ||
        !Number.isFinite(awayScore)
      ) {
        continue;
      }

      const homeTeam =
        home.team?.displayName;

      const awayTeam =
        away.team?.displayName;

      if (!homeTeam || !awayTeam) {
        continue;
      }

      /*
       * ESPN includes the Pro Bowl / all-star
       * matchup in some postseason feeds.
       *
       * AFC and NFC are not NFL franchises,
       * so we exclude them completely from
       * the Elo dataset.
       */
      const excludedTeams = new Set([
        "AFC",
        "NFC",
      ]);

      if (
        excludedTeams.has(homeTeam) ||
        excludedTeams.has(awayTeam)
      ) {
        continue;
      }

      /*
       * Additional protection against
       * Pro Bowl / all-star events.
       */
      const eventName =
        (
          event.name ??
          event.shortName ??
          ""
        ).toLowerCase();

      if (
        eventName.includes("pro bowl") ||
        eventName.includes("afc vs") ||
        eventName.includes("nfc vs")
      ) {
        continue;
      }

      const date =
        getGameDate(event.date);

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

  return games;
}

function getGameDate(
  rawDate: string | undefined
): string | null {
  if (!rawDate) {
    return null;
  }

  const parsed =
    new Date(rawDate);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed
    .toISOString()
    .slice(0, 10);
}

function sortGames(
  games: Game[]
): Game[] {
  /*
   * ESPN can occasionally return the same
   * game more than once across scoreboard
   * requests.
   *
   * Deduplicate before Elo calculations.
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
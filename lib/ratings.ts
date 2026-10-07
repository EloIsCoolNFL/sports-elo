import { updateRating } from "./elo";
import type { Game } from "./games";

export type EloPoint = {
  date: string;
  rating: number;
};

export function calculateTeamRatings(
  teamName: string,
  games: Game[],
  startingRating = 1500
): EloPoint[] {
  const sortedGames = [...games].sort(
    (a, b) =>
      new Date(`${a.date}T12:00:00`).getTime() -
      new Date(`${b.date}T12:00:00`).getTime()
  );

  const ratings: Record<string, number> = {};

  const allTeams = new Set<string>();

  sortedGames.forEach((game) => {
    allTeams.add(game.homeTeam);
    allTeams.add(game.awayTeam);
  });

  allTeams.forEach((team) => {
    ratings[team] = startingRating;
  });

  const history: EloPoint[] = [];

  sortedGames.forEach((game) => {
    const homeRating = ratings[game.homeTeam];
    const awayRating = ratings[game.awayTeam];

    let homeResult: number;
    let awayResult: number;

    if (game.homeScore > game.awayScore) {
      homeResult = 1;
      awayResult = 0;
    } else if (game.homeScore < game.awayScore) {
      homeResult = 0;
      awayResult = 1;
    } else {
      // Elo treats a tie as half a win for each team.
      homeResult = 0.5;
      awayResult = 0.5;
    }

    ratings[game.homeTeam] = updateRating(
      homeRating,
      awayRating,
      homeResult
    );

    ratings[game.awayTeam] = updateRating(
      awayRating,
      homeRating,
      awayResult
    );

    if (
      game.homeTeam === teamName ||
      game.awayTeam === teamName
    ) {
      history.push({
        date: game.date,
        rating: Math.round(ratings[teamName]),
      });
    }
  });

  const startingDate =
    sortedGames.length > 0
      ? sortedGames[0].date
      : "2025-10-01";

  return [
    {
      date: startingDate,
      rating: startingRating,
    },
    ...history,
  ];
}
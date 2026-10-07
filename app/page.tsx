"use client";

import { useEffect, useMemo, useState } from "react";
import type { Game } from "@/lib/games";
import { calculateTeamRatings } from "@/lib/ratings";

type Sport = "NBA" | "NFL" | "MLB" | "NHL";
type GameResult = "W" | "L" | "T";

const nbaSeasons = [
  { label: "2026–27", year: 2026 },
  { label: "2025–26", year: 2025 },
  { label: "2024–25", year: 2024 },
  { label: "2023–24", year: 2023 },
];

const nflSeasons = [
  { label: "2026", year: 2026 },
  { label: "2025", year: 2025 },
  { label: "2024", year: 2024 },
  { label: "2023", year: 2023 },
];

const mlbSeasons = [
  { label: "2026", year: 2026 },
  { label: "2025", year: 2025 },
  { label: "2024", year: 2024 },
  { label: "2023", year: 2023 },
];

const nhlSeasons = [
  { label: "2026–27", year: 2026 },
  { label: "2025–26", year: 2025 },
  { label: "2024–25", year: 2024 },
  { label: "2023–24", year: 2023 },
];

type HoveredPoint = {
  x: number;
  y: number;
  date: string;
  opponent: string;
  result: GameResult;
  teamScore: number;
  opponentScore: number;
  previousRating: number;
  rating: number;
  eloChange: number;
};

export default function Home() {
  const [sport, setSport] = useState<Sport>("NBA");
  const [team, setTeam] = useState("New York Knicks");
  const [selectedSeason, setSelectedSeason] = useState(2026);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const [hoveredPoint, setHoveredPoint] =
    useState<HoveredPoint | null>(null);

  const seasons =
    sport === "NBA"
      ? nbaSeasons
      : sport === "NFL"
        ? nflSeasons
        : sport === "MLB"
          ? mlbSeasons
          : nhlSeasons;

  const teams = useMemo(() => {
    return Array.from(
      new Set(
        games.flatMap((game) => [
          game.homeTeam,
          game.awayTeam,
        ])
      )
    ).sort();
  }, [games]);

  const eloStandings = useMemo(() => {
    return teams
      .map((teamName) => {
        const history =
          calculateTeamRatings(
            teamName,
            games
          );

        const currentRating =
          history[
            history.length - 1
          ]?.rating ?? 1500;

        return {
          team: teamName,
          rating: currentRating,
        };
      })
      .sort(
        (a, b) =>
          b.rating - a.rating
      );
  }, [teams, games]);

  const topFive =
    eloStandings.slice(0, 5);

  const bottomFive =
    eloStandings
      .slice(-5)
      .reverse();

  useEffect(() => {
    setLoading(true);
    setHoveredPoint(null);
    setGames([]);

    let endpoint = "";

    if (sport === "NBA") {
      endpoint = "/api/nba";
    } else if (sport === "NFL") {
      endpoint = "/api/nfl";
    } else if (sport === "MLB") {
      endpoint = "/api/mlb";
    } else {
      endpoint = "/api/nhl";
    }

    fetch(
      `${endpoint}?season=${selectedSeason}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `${sport} API returned ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        setGames(
          data.games ?? []
        );

        setLoading(false);
      })
      .catch((error) => {
        console.error(
          `Failed to load ${sport} games:`,
          error
        );

        setGames([]);
        setLoading(false);
      });
  }, [sport, selectedSeason]);

  useEffect(() => {
    if (teams.length === 0) {
      return;
    }

    if (!teams.includes(team)) {
      setTeam(teams[0]);
    }
  }, [teams, team]);

  useEffect(() => {
    setHoveredPoint(null);
  }, [team]);

  const ratingHistory =
    games.length > 0
      ? calculateTeamRatings(
          team,
          games
        )
      : [];

  const ratings =
    ratingHistory.map(
      (point) => point.rating
    );

  const currentElo =
    ratings[
      ratings.length - 1
    ] ?? 1500;

  const seasonPeak =
    ratings.length > 0
      ? Math.max(...ratings)
      : 1500;

  const seasonLow =
    ratings.length > 0
      ? Math.min(...ratings)
      : 1500;

  const startingElo =
    ratings[0] ?? 1500;

  const minRating =
    ratings.length > 0
      ? Math.min(...ratings)
      : 1500;

  const maxRating =
    ratings.length > 0
      ? Math.max(...ratings)
      : 1500;

  const chartMin =
    Math.floor(
      (minRating - 25) / 25
    ) * 25;

  const chartMax =
    Math.ceil(
      (maxRating + 25) / 25
    ) * 25;

  const chartRatingRange =
    chartMax - chartMin || 100;

  const yAxisTicks =
    Array.from(
      { length: 5 },
      (_, index) =>
        Math.round(
          chartMax -
            (index / 4) *
              chartRatingRange
        )
    );

  const chartStartDate =
    ratingHistory.length > 0
      ? new Date(
          `${ratingHistory[0].date}T12:00:00`
        ).getTime()
      : 0;

  const chartEndDate =
    ratingHistory.length > 1
      ? new Date(
          `${
            ratingHistory[
              ratingHistory.length - 1
            ].date
          }T12:00:00`
        ).getTime()
      : chartStartDate;

  const chartTimeRange =
    chartEndDate -
    chartStartDate;

  const teamGames =
    games.filter(
      (game) =>
        game.homeTeam === team ||
        game.awayTeam === team
    );

  const chartPoints =
    ratingHistory.map(
      (point, index) => {
        const pointDate =
          new Date(
            `${point.date}T12:00:00`
          ).getTime();

        const x =
          chartTimeRange > 0
            ? 75 +
              ((pointDate -
                chartStartDate) /
                chartTimeRange) *
                695
            : 75;

        const y =
          250 -
          ((point.rating -
            chartMin) /
            chartRatingRange) *
            200;

        if (index === 0) {
          return {
            x,
            y,
            date: point.date,
            rating:
              point.rating,
            game: null,
          };
        }

        const game =
          teamGames[
            index - 1
          ];

        if (!game) {
          return {
            x,
            y,
            date:
              point.date,
            rating:
              point.rating,
            game: null,
          };
        }

        const isHome =
          game.homeTeam ===
          team;

        const opponent =
          isHome
            ? game.awayTeam
            : game.homeTeam;

        const teamScore =
          isHome
            ? game.homeScore
            : game.awayScore;

        const opponentScore =
          isHome
            ? game.awayScore
            : game.homeScore;

        let result: GameResult;

        if (
          teamScore >
          opponentScore
        ) {
          result = "W";
        } else if (
          teamScore <
          opponentScore
        ) {
          result = "L";
        } else {
          result = "T";
        }

        const previousRating =
          ratingHistory[
            index - 1
          ].rating;

        const eloChange =
          point.rating -
          previousRating;

        return {
          x,
          y,
          date:
            point.date,
          rating:
            point.rating,

          game: {
            opponent,
            teamScore,
            opponentScore,
            result,
            previousRating,
            eloChange,
          },
        };
      }
    );

  const recentGames =
    teamGames
      .map(
        (game, index) => {
          const isHome =
            game.homeTeam ===
            team;

          const opponent =
            isHome
              ? game.awayTeam
              : game.homeTeam;

          const teamScore =
            isHome
              ? game.homeScore
              : game.awayScore;

          const opponentScore =
            isHome
              ? game.awayScore
              : game.homeScore;

          let result:
            GameResult;

          if (
            teamScore >
            opponentScore
          ) {
            result = "W";
          } else if (
            teamScore <
            opponentScore
          ) {
            result = "L";
          } else {
            result = "T";
          }

          const previousRating =
            index === 0
              ? 1500
              : ratingHistory[
                  index
                ]?.rating ??
                1500;

          const newRating =
            ratingHistory[
              index + 1
            ]?.rating ??
            previousRating;

          const eloChange =
            newRating -
            previousRating;

          return {
            date:
              game.date,
            opponent,
            result,
            teamScore,
            opponentScore,
            eloChange,
          };
        }
      )
      .slice(-5)
      .reverse();

  const selectedSeasonLabel =
    seasons.find(
      (season) =>
        season.year ===
        selectedSeason
    )?.label ?? "";

  function handleSportChange(
    newSport: Sport
  ) {
    setSport(newSport);
    setSelectedSeason(2026);
    setHoveredPoint(null);

    if (newSport === "NBA") {
      setTeam(
        "New York Knicks"
      );
    } else if (
      newSport === "NFL"
    ) {
      setTeam(
        "New York Giants"
      );
    } else if (
      newSport === "MLB"
    ) {
      setTeam(
        "New York Yankees"
      );
    } else {
      setTeam(
        "New York Rangers"
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        <header className="mb-10">
          <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
            Sports Analytics
          </div>

          <h1 className="text-5xl font-bold tracking-tight">
            Sports Elo
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-slate-400">
            Measure how good professional sports teams are over time.
          </p>
        </header>

        <section className="mb-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:grid-cols-3">

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Sport
            </label>

            <select
              value={sport}
              onChange={(e) =>
                handleSportChange(
                  e.target.value as Sport
                )
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
            >
              <option value="NBA">
                NBA
              </option>

              <option value="NFL">
                NFL
              </option>

              <option value="MLB">
                MLB
              </option>

              <option value="NHL">
                NHL
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Season
            </label>

            <select
              value={
                selectedSeason
              }
              onChange={(e) =>
                setSelectedSeason(
                  Number(
                    e.target.value
                  )
                )
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
            >
              {seasons.map(
                (season) => (
                  <option
                    key={
                      season.year
                    }
                    value={
                      season.year
                    }
                  >
                    {
                      season.label
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Team
            </label>

            <select
              value={
                teams.includes(
                  team
                )
                  ? team
                  : ""
              }
              onChange={(e) =>
                setTeam(
                  e.target.value
                )
              }
              disabled={
                loading ||
                teams.length ===
                  0
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {teams.length ===
              0 ? (
                <option value="">
                  No completed games yet
                </option>
              ) : (
                teams.map(
                  (teamName) => (
                    <option
                      key={
                        teamName
                      }
                      value={
                        teamName
                      }
                    >
                      {
                        teamName
                      }
                    </option>
                  )
                )
              )}
            </select>
          </div>

        </section>

        {loading ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <p className="text-slate-400">
              Loading {sport} games...
            </p>
          </section>
        ) : games.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">

            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              {sport}{" "}
              {
                selectedSeasonLabel
              }
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              No completed games yet
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Elo ratings will begin at 1500 and update as completed games are added.
            </p>

            <div className="mt-8">
              <p className="text-sm text-slate-400">
                Starting Elo
              </p>

              <p className="mt-1 text-5xl font-bold">
                1500
              </p>
            </div>

          </section>
        ) : (
          <>

            <section className="mb-8 grid gap-6 md:grid-cols-3">

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:col-span-2">

                <div className="mb-6">
                  <p className="text-sm text-slate-400">
                    Current Elo
                  </p>

                  <p className="mt-1 text-5xl font-bold">
                    {currentElo}
                  </p>
                </div>

                <div className="relative h-80">

                  <svg
                    viewBox="0 0 800 300"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                    onMouseLeave={() =>
                      setHoveredPoint(
                        null
                      )
                    }
                  >

                    {yAxisTicks.map(
                      (
                        tick,
                        index
                      ) => {
                        const y =
                          50 +
                          (index /
                            4) *
                            200;

                        return (
                          <g
                            key={`${tick}-${index}`}
                          >
                            <line
                              x1="75"
                              y1={y}
                              x2="780"
                              y2={y}
                              stroke="#334155"
                              strokeDasharray="4 4"
                            />

                            <text
                              x="62"
                              y={y + 4}
                              fill="#94a3b8"
                              fontSize="12"
                              textAnchor="end"
                            >
                              {tick}
                            </text>
                          </g>
                        );
                      }
                    )}

                    <line
                      x1="75"
                      y1="50"
                      x2="75"
                      y2="250"
                      stroke="#475569"
                    />

                    <line
                      x1="75"
                      y1="250"
                      x2="780"
                      y2="250"
                      stroke="#475569"
                    />

                    <polyline
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartPoints
                        .map(
                          (
                            point
                          ) =>
                            `${point.x},${point.y}`
                        )
                        .join(
                          " "
                        )}
                    />

                    {chartPoints.map(
                      (
                        point,
                        index
                      ) => (
                        <g
                          key={`${point.date}-${index}`}
                        >
                          {point.game && (
                            <circle
                              cx={
                                point.x
                              }
                              cy={
                                point.y
                              }
                              r="12"
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => {
                                if (
                                  !point.game
                                ) {
                                  return;
                                }

                                setHoveredPoint(
                                  {
                                    x:
                                      point.x,
                                    y:
                                      point.y,
                                    date:
                                      point.date,
                                    opponent:
                                      point.game
                                        .opponent,
                                    result:
                                      point.game
                                        .result,
                                    teamScore:
                                      point.game
                                        .teamScore,
                                    opponentScore:
                                      point.game
                                        .opponentScore,
                                    previousRating:
                                      point.game
                                        .previousRating,
                                    rating:
                                      point.rating,
                                    eloChange:
                                      point.game
                                        .eloChange,
                                  }
                                );
                              }}
                            />
                          )}

                          <circle
                            cx={
                              point.x
                            }
                            cy={
                              point.y
                            }
                            r={
                              point.game
                                ? "4"
                                : "3"
                            }
                            fill="#60a5fa"
                            stroke="#0f172a"
                            strokeWidth="2"
                            pointerEvents="none"
                          />
                        </g>
                      )
                    )}

                  </svg>

                  {hoveredPoint && (
                    <div
                      className="pointer-events-none absolute z-20 w-60 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm shadow-2xl"
                      style={{
                        left: `${Math.min(
                          Math.max(
                            (hoveredPoint.x /
                              800) *
                              100,
                            17
                          ),
                          80
                        )}%`,

                        top: `${Math.max(
                          (hoveredPoint.y /
                            300) *
                            100 -
                            38,
                          0
                        )}%`,

                        transform:
                          "translateX(-50%)",
                      }}
                    >

                      <div className="flex items-center justify-between gap-3">

                        <p className="font-semibold text-white">
                          {hoveredPoint.result ===
                          "W"
                            ? "Win"
                            : hoveredPoint.result ===
                                "L"
                              ? "Loss"
                              : "Tie"}
                        </p>

                        <span
                          className={
                            hoveredPoint.result ===
                            "W"
                              ? "font-semibold text-green-400"
                              : hoveredPoint.result ===
                                  "L"
                                ? "font-semibold text-red-400"
                                : "font-semibold text-yellow-400"
                          }
                        >
                          {
                            hoveredPoint.result
                          }
                        </span>

                      </div>

                      <p className="mt-1 font-medium text-slate-200">
                        vs.{" "}
                        {
                          hoveredPoint.opponent
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(
                          `${hoveredPoint.date}T12:00:00`
                        ).toLocaleDateString(
                          "en-US",
                          {
                            month:
                              "short",
                            day:
                              "numeric",
                            year:
                              "numeric",
                          }
                        )}
                      </p>

                      <div className="my-3 border-t border-slate-800" />

                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Score
                        </span>

                        <span className="font-semibold">
                          {
                            hoveredPoint.teamScore
                          }
                          -
                          {
                            hoveredPoint.opponentScore
                          }
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between">
                        <span className="text-slate-400">
                          Elo
                        </span>

                        <span className="font-semibold">
                          {
                            hoveredPoint.previousRating
                          }
                          {" → "}
                          {
                            hoveredPoint.rating
                          }
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between">
                        <span className="text-slate-400">
                          Change
                        </span>

                        <span
                          className={
                            hoveredPoint.eloChange >
                            0
                              ? "font-semibold text-green-400"
                              : hoveredPoint.eloChange <
                                  0
                                ? "font-semibold text-red-400"
                                : "font-semibold text-yellow-400"
                          }
                        >
                          {hoveredPoint.eloChange >
                          0
                            ? "+"
                            : ""}
                          {
                            hoveredPoint.eloChange
                          }
                        </span>
                      </div>

                    </div>
                  )}

                </div>

                <div className="mt-3 flex justify-between pl-16 text-xs text-slate-500">

                  <span>
                    {ratingHistory.length >
                    0
                      ? new Date(
                          `${ratingHistory[0].date}T12:00:00`
                        ).toLocaleDateString(
                          "en-US",
                          {
                            month:
                              "short",
                            year:
                              "numeric",
                          }
                        )
                      : ""}
                  </span>

                  <span>
                    {ratingHistory.length >
                    0
                      ? new Date(
                          `${
                            ratingHistory[
                              ratingHistory.length -
                                1
                            ].date
                          }T12:00:00`
                        ).toLocaleDateString(
                          "en-US",
                          {
                            month:
                              "short",
                            year:
                              "numeric",
                          }
                        )
                      : ""}
                  </span>

                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Hover over a game point to see the opponent, score, and Elo change.
                </p>

              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                <p className="text-sm text-slate-400">
                  Team
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {team}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {sport}{" "}
                  {
                    selectedSeasonLabel
                  }
                </p>

                <div className="mt-8">
                  <p className="text-sm text-slate-400">
                    Season peak
                  </p>

                  <p className="mt-1 text-3xl font-semibold">
                    {seasonPeak}
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-slate-400">
                    Current Elo
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {currentElo}
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-slate-400">
                    Season low
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {seasonLow}
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-slate-400">
                    Starting Elo
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {startingElo}
                  </p>
                </div>

              </div>

            </section>

            <section className="mb-8 grid gap-6 md:grid-cols-2">

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

                <div className="border-b border-slate-800 p-6">

                  <p className="text-sm font-semibold uppercase tracking-widest text-green-400">
                    League Leaders
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    Top 5 Elo
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {sport}{" "}
                    {
                      selectedSeasonLabel
                    }
                  </p>

                </div>

                <div className="divide-y divide-slate-800">

                  {topFive.map(
                    (
                      entry,
                      index
                    ) => (
                      <button
                        key={
                          entry.team
                        }
                        onClick={() =>
                          setTeam(
                            entry.team
                          )
                        }
                        className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 p-5 text-left transition hover:bg-slate-800"
                      >

                        <span className="text-lg font-semibold text-slate-500">
                          {index + 1}
                        </span>

                        <span className="font-medium">
                          {
                            entry.team
                          }
                        </span>

                        <span className="text-xl font-bold text-green-400">
                          {
                            entry.rating
                          }
                        </span>

                      </button>
                    )
                  )}

                </div>

              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

                <div className="border-b border-slate-800 p-6">

                  <p className="text-sm font-semibold uppercase tracking-widest text-red-400">
                    League Bottom
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    Bottom 5 Elo
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {sport}{" "}
                    {
                      selectedSeasonLabel
                    }
                  </p>

                </div>

                <div className="divide-y divide-slate-800">

                  {bottomFive.map(
                    (
                      entry,
                      index
                    ) => (
                      <button
                        key={
                          entry.team
                        }
                        onClick={() =>
                          setTeam(
                            entry.team
                          )
                        }
                        className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 p-5 text-left transition hover:bg-slate-800"
                      >

                        <span className="text-lg font-semibold text-slate-500">
                          {eloStandings.length -
                            index}
                        </span>

                        <span className="font-medium">
                          {
                            entry.team
                          }
                        </span>

                        <span className="text-xl font-bold text-red-400">
                          {
                            entry.rating
                          }
                        </span>

                      </button>
                    )
                  )}

                </div>

              </div>

            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 p-6">

                <h2 className="text-xl font-semibold">
                  Recent Games
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {team}
                </p>

              </div>

              {recentGames.length ===
              0 ? (
                <div className="p-6 text-sm text-slate-400">
                  No completed games found for this team.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">

                  {recentGames.map(
                    (
                      game,
                      index
                    ) => (
                      <div
                        key={`${game.date}-${game.opponent}-${index}`}
                        className="grid grid-cols-5 items-center gap-2 p-5 text-sm"
                      >

                        <span className="text-slate-400">
                          {new Date(
                            `${game.date}T12:00:00`
                          ).toLocaleDateString(
                            "en-US",
                            {
                              month:
                                "short",
                              day:
                                "numeric",
                            }
                          )}
                        </span>

                        <span>
                          {
                            game.opponent
                          }
                        </span>

                        <span
                          className={
                            game.result ===
                            "W"
                              ? "text-green-400"
                              : game.result ===
                                  "L"
                                ? "text-red-400"
                                : "text-yellow-400"
                          }
                        >
                          {
                            game.result
                          }
                        </span>

                        <span className="text-slate-400">
                          {
                            game.teamScore
                          }
                          -
                          {
                            game.opponentScore
                          }
                        </span>

                        <span
                          className={`text-right ${
                            game.eloChange >
                            0
                              ? "text-green-400"
                              : game.eloChange <
                                  0
                                ? "text-red-400"
                                : "text-yellow-400"
                          }`}
                        >
                          {game.eloChange >
                          0
                            ? "+"
                            : ""}
                          {
                            game.eloChange
                          }
                        </span>

                      </div>
                    )
                  )}

                </div>
              )}

            </section>

          </>
        )}

      </div>
    </main>
  );
}
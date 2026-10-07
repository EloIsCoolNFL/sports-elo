export function expectedScore(
  ratingA: number,
  ratingB: number
) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function updateRating(
  rating: number,
  opponentRating: number,
  actualScore: number,
  kFactor = 20
) {
  const expected = expectedScore(rating, opponentRating);

  return rating + kFactor * (actualScore - expected);
}
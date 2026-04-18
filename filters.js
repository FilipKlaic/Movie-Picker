export const WATCH_REGION = "SE";

export function getQualityConfig(mode, isReroll = false) {
  const configMap = {
    balanced: { sortBy: "popularity.desc", voteCountGte: 150, rerollBoost: 100 },
    popular: { sortBy: "popularity.desc", voteCountGte: 600, rerollBoost: 300 },
    hidden: { sortBy: "vote_average.desc", voteCountGte: 60, rerollBoost: 40 }
  };

  const selected = configMap[mode] || configMap.balanced;
  return {
    sortBy: selected.sortBy,
    voteCountGte: selected.voteCountGte + (isReroll ? selected.rerollBoost : 0)
  };
}

export function buildDiscoverParams(filters, page = 1, options = {}) {
  const qualityConfig = getQualityConfig(filters.qualityMode, Boolean(options.isReroll));
  const params = {
    language: "sv-SE",
    sort_by: qualityConfig.sortBy,
    include_adult: "false",
    include_video: "false",
    "vote_count.gte": String(qualityConfig.voteCountGte),
    page: String(page)
  };

  if (filters.genre) {
    params.with_genres = filters.genre;
  }

  if (filters.year) {
    params.primary_release_year = filters.year;
  }

  if (Number(filters.minRating) > 0) {
    params["vote_average.gte"] = filters.minRating;
  }

  return params;
}

export function validateYear(value) {
  if (!value) return true;

  const year = Number(value);
  const currentYear = new Date().getFullYear() + 1;

  return Number.isInteger(year) && year >= 1900 && year <= currentYear;
}

export function validateRating(value) {
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 0 && rating <= 10;
}

export function validateQualityMode(value) {
  return ["balanced", "popular", "hidden"].includes(value);
}

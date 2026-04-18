import { buildDiscoverParams } from "./filters.js";

const API_KEY = window.CONFIG?.API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

export async function fetchJson(endpoint, params = {}) {
  const query = new URLSearchParams({ api_key: API_KEY, ...params });
  const url = `${BASE_URL}${endpoint}?${query.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API-fel: ${response.status}`);
  }

  return response.json();
}

export async function fetchGenres() {
  const data = await fetchJson("/genre/movie/list", { language: "sv-SE" });
  return data.genres || [];
}

export async function discoverMovies(filters, page = 1, options = {}) {
  return fetchJson("/discover/movie", buildDiscoverParams(filters, page, options));
}

function pickTrailerVideo(videos) {
  const youtubeVideos = videos.filter(
    (video) => video?.site === "YouTube" && video?.key && (video?.type === "Trailer" || video?.type === "Teaser")
  );

  return (
    youtubeVideos.find((video) => video.official && video.type === "Trailer") ||
    youtubeVideos.find((video) => video.type === "Trailer") ||
    youtubeVideos[0] ||
    null
  );
}

export async function fetchTrailerUrl(movieId) {
  const preferredLanguage = await fetchJson(`/movie/${movieId}/videos`, { language: "sv-SE" });
  const preferredTrailer = pickTrailerVideo(preferredLanguage.results || []);

  if (preferredTrailer) {
    return `https://www.youtube.com/watch?v=${preferredTrailer.key}`;
  }

  const fallbackLanguage = await fetchJson(`/movie/${movieId}/videos`, { language: "en-US" });
  const fallbackTrailer = pickTrailerVideo(fallbackLanguage.results || []);

  return fallbackTrailer ? `https://www.youtube.com/watch?v=${fallbackTrailer.key}` : null;
}

export async function fetchWatchProviders(movieId) {
  const data = await fetchJson(`/movie/${movieId}/watch/providers`);
  return data.results || {};
}

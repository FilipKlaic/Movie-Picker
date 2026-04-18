import { discoverMovies, fetchGenres, fetchTrailerUrl, fetchWatchProviders } from "./api.js";
import { validateQualityMode, validateRating, validateYear, WATCH_REGION } from "./filters.js";
import { appState, getBlockedIds, markMovieAsSeen } from "./state.js";
import {
  renderGenreOptions,
  renderMovie,
  renderProviders,
  setProvidersLoading,
  setStatus,
  setTrailerLink,
  setTrailerLoading,
  ui,
  updateRatingLabel
} from "./ui.js";

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uniqueProviderNames(providers = []) {
  return [...new Set(providers.map((provider) => provider?.provider_name).filter(Boolean))];
}

function parseWatchProviders(results) {
  const regionData = results?.[WATCH_REGION];
  if (!regionData) {
    return {
      message: "Hittar inga leverantörer för Sverige just nu.",
      providers: [],
      link: ""
    };
  }

  const streaming = uniqueProviderNames(regionData.flatrate || []);
  if (streaming.length) {
    return {
      message: "Finns att streama på:",
      providers: streaming,
      link: regionData.link || ""
    };
  }

  const rentBuy = uniqueProviderNames([...(regionData.rent || []), ...(regionData.buy || [])]);
  if (rentBuy.length) {
    return {
      message: "Ingen streaming-prenumeration hittad, men finns att hyra/köpa på:",
      providers: rentBuy,
      link: regionData.link || ""
    };
  }

  return {
    message: "Inga streamingalternativ hittades för Sverige.",
    providers: [],
    link: regionData.link || ""
  };
}

function pickBestCandidate(results, previousId, blockedIds = new Set()) {
  const rich = results.filter((movie) => movie.poster_path && movie.overview);
  const withPoster = results.filter((movie) => movie.poster_path);

  let pool = rich.length ? rich : withPoster.length ? withPoster : results;

  pool = pool.filter((movie) => !blockedIds.has(movie.id));
  if (!pool.length) return null;

  if (pool.length > 1) {
    pool = pool.filter((movie) => movie.id !== previousId);
  }

  return pool.length ? randomItem(pool) : null;
}

async function fetchRandomMovie(filters, options = {}) {
  const firstPageData = await discoverMovies(filters, 1, options);

  const totalPages = Math.min(firstPageData.total_pages || 0, 500);
  if (!totalPages) return null;

  const randomPage = Math.floor(Math.random() * totalPages) + 1;
  const randomPageData = await discoverMovies(filters, randomPage, options);

  const results = randomPageData.results || [];
  if (!results.length) return null;

  return pickBestCandidate(results, appState.lastMovieId, getBlockedIds());
}

async function updateTrailer(movie) {
  setTrailerLoading();

  try {
    const trailerUrl = await fetchTrailerUrl(movie.id);

    if (!appState.currentMovie || appState.currentMovie.id !== movie.id) {
      return;
    }

    setTrailerLink(trailerUrl);
  } catch (error) {
    if (!appState.currentMovie || appState.currentMovie.id !== movie.id) {
      return;
    }

    setTrailerLink("");
  }
}

async function updateProviders(movie) {
  setProvidersLoading();

  try {
    const providersByRegion = await fetchWatchProviders(movie.id);

    if (!appState.currentMovie || appState.currentMovie.id !== movie.id) {
      return;
    }

    const parsed = parseWatchProviders(providersByRegion);
    renderProviders(parsed.message, parsed.providers, parsed.link);
  } catch (error) {
    if (!appState.currentMovie || appState.currentMovie.id !== movie.id) {
      return;
    }

    renderProviders("Kunde inte hämta streamingtjänster just nu.");
  }
}

function showMovie(movie) {
  appState.currentMovie = movie;
  appState.lastMovieId = movie.id;
  appState.sessionShownMovieIds.add(movie.id);

  renderMovie(movie);
  updateTrailer(movie);
  updateProviders(movie);
}

function getFiltersFromForm() {
  return {
    genre: ui.genreSelect.value,
    year: ui.yearInput.value.trim(),
    minRating: ui.ratingInput.value,
    qualityMode: ui.qualityMode.value
  };
}

function validateFilters(filters) {
  if (!validateYear(filters.year)) {
    setStatus("Ogiltigt år. Ange ett år mellan 1900 och nästa år.", true);
    return false;
  }

  if (!validateRating(filters.minRating)) {
    setStatus("Ogiltigt betygsfilter. Välj ett värde mellan 0 och 10.", true);
    return false;
  }

  if (!validateQualityMode(filters.qualityMode)) {
    setStatus("Ogiltigt kvalitetsläge. Välj ett av alternativen i listan.", true);
    return false;
  }

  return true;
}

async function handlePickMovie(event) {
  event.preventDefault();

  const filters = getFiltersFromForm();
  if (!validateFilters(filters)) {
    return;
  }

  appState.lastFilters = filters;
  setStatus("Letar efter en film...");

  try {
    const movie = await fetchRandomMovie(filters);

    if (!movie) {
      ui.movieCard.hidden = true;
      setStatus("Inga filmer hittades med dina filter. Prova att ändra genre eller år.", true);
      return;
    }

    showMovie(movie);
    setStatus("Här är din film för kvällen.");
  } catch (error) {
    ui.movieCard.hidden = true;
    setStatus("Något gick fel vid hämtning av film. Försök igen.", true);
  }
}

async function handleReroll() {
  setStatus("Slumpar en ny film med samma filter...");

  try {
    const movie = await fetchRandomMovie(appState.lastFilters, { isReroll: true });

    if (!movie) {
      setStatus("Kunde inte hitta en ny film med samma filter. Testa andra val.", true);
      return;
    }

    showMovie(movie);
    setStatus("Ny film framtagen.");
  } catch (error) {
    setStatus("Något gick fel vid ny slumpning.", true);
  }
}

async function handleExcludeMovie() {
  if (!appState.currentMovie) {
    setStatus("Ingen film att markera än. Hitta en film först.", true);
    return;
  }

  markMovieAsSeen(appState.currentMovie.id);
  setStatus("Filmen markeras som sedd. Hämtar en ny...");

  try {
    const movie = await fetchRandomMovie(appState.lastFilters, { isReroll: true });

    if (!movie) {
      setStatus("Filmen ar sparad som sedd, men ingen ny matchning hittades med samma filter.", true);
      return;
    }

    showMovie(movie);
    setStatus("Ny osedd film framtagen.");
  } catch (error) {
    setStatus("Filmen sparades som sedd, men ny hämtning misslyckades.", true);
  }
}

async function initializeApp() {
  setStatus("Laddar genrer...");

  try {
    const genres = await fetchGenres();
    renderGenreOptions(genres);
    setStatus("Välj filter och klicka på Hitta film.");
  } catch (error) {
    setStatus("Kunde inte ladda genrer. Kontrollera API-nyckeln.", true);
  }
}

ui.movieForm.addEventListener("submit", handlePickMovie);
ui.rerollBtn.addEventListener("click", handleReroll);
ui.seenBtn.addEventListener("click", handleExcludeMovie);
ui.ratingInput.addEventListener("input", updateRatingLabel);

updateRatingLabel();
initializeApp();
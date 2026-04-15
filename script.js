const API_KEY = "f0971842e84c1d5296c3f0d21f5e49cc";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const movieForm = document.getElementById("movieForm");
const genreSelect = document.getElementById("genreSelect");
const yearInput = document.getElementById("yearInput");
const statusMessage = document.getElementById("statusMessage");

const movieCard = document.getElementById("movieCard");
const moviePoster = document.getElementById("moviePoster");
const movieTitle = document.getElementById("movieTitle");
const movieMeta = document.getElementById("movieMeta");
const movieOverview = document.getElementById("movieOverview");
const rerollBtn = document.getElementById("rerollBtn");

let lastMovieId = null;
let lastFilters = {genre: "", year: ""};

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "red" : "green";
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchJson(endpoint, params = {}) {
  const query = new URLSearchParams({ api_key: API_KEY, ...params });
  const url = `${BASE_URL}${endpoint}?${query.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API-fel: ${response.status}`);
  }

  return response.json();
}

async function loadGenres() {
  setStatus("Laddar genrer...");
  genreSelect.innerHTML = `<option value="">Alla genrer</option>`;

  try {
    const data = await fetchJson("/genre/movie/list", { language: "sv-SE" });
    const genres = data.genres || [];

    genres.forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre.id;
      option.textContent = genre.name;
      genreSelect.appendChild(option);
    });

    setStatus("Välj filter och klicka på Hitta film.");
  } catch (error) {
    setStatus("Kunde inte ladda genrer. Kontrollera API-nyckeln.", true);
  }
}

function buildDiscoverParams(filters, page = 1) {
  const params = {
    language: "sv-SE",
    sort_by: "popularity.desc",
    include_adult: "false",
    include_video: "false",
    "vote_count.gte": "150",
    page: String(page)
  };

  if (filters.genre) {
    params.with_genres = filters.genre;
  }

  if (filters.year) {
    params.primary_release_year = filters.year;
  }

  return params;
}

function pickBestCandidate(results, previousId) {
  // Prioritera filmer med poster + overview
  const rich = results.filter((m) => m.poster_path && m.overview);
  const withPoster = results.filter((m) => m.poster_path);

  let pool = rich.length ? rich : withPoster.length ? withPoster : results;

  // Undvik samma film två gånger i rad om möjligt
  if (pool.length > 1) {
    pool = pool.filter((m) => m.id !== previousId);
  }

  return pool.length ? randomItem(pool) : null;
}

async function fetchRandomMovie(filters) {
  // 1) Hämta första sidan för att få total_pages
  const firstPageData = await fetchJson("/discover/movie", buildDiscoverParams(filters, 1));

  const totalPages = Math.min(firstPageData.total_pages || 0, 500);
  if (!totalPages) return null;

  // 2) Slumpa sida (minst 1)
  const randomPage = Math.floor(Math.random() * totalPages) + 1;

  // 3) Hämta den slumpade sidan
  const randomPageData = await fetchJson("/discover/movie", buildDiscoverParams(filters, randomPage));
  const results = randomPageData.results || [];
  if (!results.length) return null;

  return pickBestCandidate(results, lastMovieId);
}

function renderMovie(movie) {
  const year = movie.release_date ? movie.release_date.slice(0, 4) : "Okänt år";
  const rating = typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "N/A";
  const overviewText = movie.overview?.trim() || "Beskrivning saknas för den här filmen.";

  movieTitle.textContent = movie.title || "Okänd titel";
  movieMeta.textContent = `Betyg: ${rating} | År: ${year}`;
  movieOverview.textContent = overviewText;

  if (movie.poster_path) {
    moviePoster.src = `${IMAGE_BASE}${movie.poster_path}`;
    moviePoster.alt = `Poster för ${movie.title}`;
  } else {
    moviePoster.src = "https://via.placeholder.com/500x750?text=Ingen+poster";
    moviePoster.alt = "Ingen poster tillgänglig";
  }

  movieCard.hidden = false;
}

function validateYear(value) {
  if (!value) return true;

  const year = Number(value);
  const currentYear = new Date().getFullYear() + 1;

  return Number.isInteger(year) && year >= 1900 && year <= currentYear;
}

async function handlePickMovie(event) {
  event.preventDefault();

  const filters = {
    genre: genreSelect.value,
    year: yearInput.value.trim()
  };

  if (!validateYear(filters.year)) {
    setStatus("Ogiltigt år. Ange ett år mellan 1900 och nästa år.", true);
    return;
  }

  lastFilters = filters;
  setStatus("Letar efter en film...");

  try {
    const movie = await fetchRandomMovie(filters);

    if (!movie) {
      movieCard.hidden = true;
      setStatus("Inga filmer hittades med dina filter. Prova att ändra genre eller år.", true);
      return;
    }

    lastMovieId = movie.id;
    renderMovie(movie);
    setStatus("Här är din film för kvällen.");
  } catch (error) {
    movieCard.hidden = true;
    setStatus("Något gick fel vid hämtning av film. Försök igen.", true);
  }
}

async function handleReroll() {
  setStatus("Slumpar en ny film med samma filter...");

  try {
    const movie = await fetchRandomMovie(lastFilters);

    if (!movie) {
      setStatus("Kunde inte hitta en ny film med samma filter. Testa andra val.", true);
      return;
    }

    lastMovieId = movie.id;
    renderMovie(movie);
    setStatus("Ny film framtagen.");
  } catch (error) {
    setStatus("Något gick fel vid ny slumpning.", true);
  }
}

movieForm.addEventListener("submit", handlePickMovie);
rerollBtn.addEventListener("click", handleReroll);

loadGenres();
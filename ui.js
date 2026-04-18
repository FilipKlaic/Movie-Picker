const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export const ui = {
  movieForm: document.getElementById("movieForm"),
  genreSelect: document.getElementById("genreSelect"),
  yearInput: document.getElementById("yearInput"),
  ratingInput: document.getElementById("ratingInput"),
  ratingValue: document.getElementById("ratingValue"),
  qualityMode: document.getElementById("qualityMode"),
  statusMessage: document.getElementById("statusMessage"),
  movieCard: document.getElementById("movieCard"),
  moviePoster: document.getElementById("moviePoster"),
  movieTitle: document.getElementById("movieTitle"),
  movieMeta: document.getElementById("movieMeta"),
  movieOverview: document.getElementById("movieOverview"),
  providerMessage: document.getElementById("providerMessage"),
  providerList: document.getElementById("providerList"),
  providerLink: document.getElementById("providerLink"),
  rerollBtn: document.getElementById("rerollBtn"),
  seenBtn: document.getElementById("seenBtn"),
  trailerLink: document.getElementById("trailerLink")
};

export function setStatus(message, isError = false) {
  ui.statusMessage.textContent = message;
  ui.statusMessage.classList.toggle("is-error", isError);
  ui.statusMessage.classList.toggle("is-success", !isError && Boolean(message));
}

export function updateRatingLabel() {
  ui.ratingValue.textContent = `${Number(ui.ratingInput.value).toFixed(1)}+`;
}

export function renderGenreOptions(genres) {
  ui.genreSelect.innerHTML = '<option value="">Alla genrer</option>';

  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre.id;
    option.textContent = genre.name;
    ui.genreSelect.appendChild(option);
  });
}

export function renderMovie(movie) {
  const year = movie.release_date ? movie.release_date.slice(0, 4) : "Okänt år";
  const rating = typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "N/A";
  const overviewText = movie.overview?.trim() || "Beskrivning saknas för den här filmen.";

  ui.movieTitle.textContent = movie.title || "Okänd titel";
  ui.movieMeta.textContent = `Betyg: ${rating} | År: ${year}`;
  ui.movieOverview.textContent = overviewText;

  if (movie.poster_path) {
    ui.moviePoster.src = `${IMAGE_BASE}${movie.poster_path}`;
    ui.moviePoster.alt = `Poster för ${movie.title}`;
  } else {
    ui.moviePoster.src = "https://via.placeholder.com/500x750?text=Ingen+poster";
    ui.moviePoster.alt = "Ingen poster tillgänglig";
  }

  ui.movieCard.hidden = false;
}

export function setTrailerLoading() {
  ui.trailerLink.textContent = "Laddar trailer...";
  ui.trailerLink.href = "#";
  ui.trailerLink.classList.add("is-disabled");
  ui.trailerLink.setAttribute("aria-disabled", "true");
}

export function setTrailerLink(url) {
  if (!url) {
    ui.trailerLink.textContent = "Trailer saknas";
    return;
  }

  ui.trailerLink.href = url;
  ui.trailerLink.textContent = "Se trailer";
  ui.trailerLink.classList.remove("is-disabled");
  ui.trailerLink.removeAttribute("aria-disabled");
}

export function setProvidersLoading() {
  ui.providerMessage.textContent = "Laddar streamingtjänster...";
  ui.providerList.replaceChildren();
  ui.providerLink.hidden = true;
  ui.providerLink.href = "#";
}

export function renderProviders(message, providers = [], link = "") {
  ui.providerMessage.textContent = message;
  ui.providerList.replaceChildren();

  providers.forEach((name) => {
    const chip = document.createElement("span");
    chip.className = "provider-chip";
    chip.textContent = name;
    ui.providerList.appendChild(chip);
  });

  if (link) {
    ui.providerLink.hidden = false;
    ui.providerLink.href = link;
  } else {
    ui.providerLink.hidden = true;
    ui.providerLink.href = "#";
  }
}

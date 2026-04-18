const SEEN_MOVIES_STORAGE_KEY = "moviePickerSeenIds";

function loadSeenMovieIds() {
  try {
    const stored = localStorage.getItem(SEEN_MOVIES_STORAGE_KEY);
    const parsed = JSON.parse(stored || "[]");

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((id) => Number.isInteger(id)));
  } catch (error) {
    return new Set();
  }
}

export const appState = {
  currentMovie: null,
  lastMovieId: null,
  lastFilters: { genre: "", year: "", minRating: "0", qualityMode: "balanced" },
  sessionShownMovieIds: new Set(),
  seenMovieIds: loadSeenMovieIds()
};

export function saveSeenMovieIds() {
  localStorage.setItem(SEEN_MOVIES_STORAGE_KEY, JSON.stringify([...appState.seenMovieIds]));
}

export function markMovieAsSeen(movieId) {
  appState.seenMovieIds.add(movieId);
  saveSeenMovieIds();
}

export function getBlockedIds() {
  return new Set([...appState.seenMovieIds, ...appState.sessionShownMovieIds]);
}

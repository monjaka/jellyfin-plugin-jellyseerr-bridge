(() => {
  "use strict";

  const API = "/JellyseerrBridge";
  const CATEGORIES = [
    { id: "trending", label: "Trending" },
    { id: "movies", label: "Movies" },
    { id: "upcoming-movies", label: "Upcoming Movies" },
    { id: "shows", label: "Shows" },
    { id: "upcoming-shows", label: "Upcoming Shows" }
  ];

  const state = {
    category: "trending",
    query: "",
    page: 1,
    pageInfo: null,
    loading: false,
    detailLoading: false,
    detail: null,
    detailBase: null,
    results: [],
    local: new Map(),
    pending: new Set(),
    searchTimer: 0,
    status: null,
    sort: "",
    filters: {
      rating: "",
      releaseFrom: "",
      releaseTo: "",
      provider: ""
    }
  };

  const els = {
    status: document.getElementById("status"),
    search: document.getElementById("search"),
    filterToggle: document.getElementById("filterToggle"),
    sortToggle: document.getElementById("sortToggle"),
    filters: document.getElementById("filters"),
    sorts: document.getElementById("sorts"),
    sortSelect: document.getElementById("sortSelect"),
    ratingFilter: document.getElementById("ratingFilter"),
    releaseFromFilter: document.getElementById("releaseFromFilter"),
    releaseToFilter: document.getElementById("releaseToFilter"),
    providerFilter: document.getElementById("providerFilter"),
    applyFilters: document.getElementById("applyFilters"),
    clearFilters: document.getElementById("clearFilters"),
    applySort: document.getElementById("applySort"),
    clearSort: document.getElementById("clearSort"),
    detailBack: document.getElementById("detailBack"),
    tabs: document.getElementById("tabs"),
    results: document.getElementById("results"),
    footer: document.getElementById("footer")
  };

  function authHeader() {
    try {
      const raw = localStorage.getItem("jellyfin_credentials");
      const credentials = raw ? JSON.parse(raw) : null;
      const server = credentials?.Servers?.find((item) => item.AccessToken) || credentials?.Servers?.[0];
      const token = server?.AccessToken;
      if (!token) return {};
      return {
        Authorization: `MediaBrowser Client="Jellyseerr Bridge", Device="Browser", DeviceId="jellyseerr-bridge-web", Version="0.1.0", Token="${token}"`,
        "X-Emby-Token": token
      };
    } catch {
      return {};
    }
  }

  async function apiGet(path) {
    const response = await fetch(`${API}${path}`, {
      cache: "no-store",
      headers: authHeader()
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    return response.json();
  }

  async function apiPost(path, payload) {
    const response = await fetch(`${API}${path}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        ...authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok && response.status !== 202) throw new Error(await errorMessage(response));
    return response.text().then((text) => text ? JSON.parse(text) : null);
  }

  async function errorMessage(response) {
    const text = await response.text();
    try {
      return JSON.parse(text).message || `${response.status} ${response.statusText}`;
    } catch {
      return text || `${response.status} ${response.statusText}`;
    }
  }

  async function loadStatus() {
    try {
      state.status = await apiGet("/Status");
      if (!state.status?.isConfigured) {
        els.status.textContent = "Jellyseerr Bridge is not configured yet.";
      } else if (!state.status?.requestSubmissionEnabled) {
        els.status.textContent = "Search is available. Request submission is disabled by the Jellyfin administrator.";
      }
    } catch {
      state.status = { isConfigured: true, requestSubmissionEnabled: true };
      els.status.textContent = "Request status could not be checked. You can still try submitting a request.";
    }
  }

  async function loadResults({ append = false } = {}) {
    state.loading = true;
    state.detail = null;
    state.detailBase = null;
    renderBody();
    try {
      const page = append ? state.page + 1 : 1;
      const data = await fetchResultPage(page);
      const incoming = filterResults(normalize(data.results || []));
      state.results = sortResults(append ? mergeUniqueResults(state.results, incoming) : dedupeResults(incoming));
      state.page = page;
      state.pageInfo = data;
    } catch (error) {
      state.results = append ? state.results : [];
      els.results.innerHTML = `<div class="message">${escapeHtml(error.message)}</div>`;
    } finally {
      state.loading = false;
      renderBody();
    }
  }

  async function fetchResultPage(page) {
    if (state.query) {
      return apiGet(`/Search?query=${encodeURIComponent(state.query)}&page=${page}`);
    }

    if (state.category === "trending" && (hasActiveFilters() || hasActiveSort())) {
      const [movies, shows] = await Promise.all([
        apiGet(`/Discover/movies?page=${page}${discoverFilterQuery("movie")}`),
        apiGet(`/Discover/shows?page=${page}${discoverFilterQuery("tv")}`)
      ]);
      return {
        page,
        totalPages: Math.max(movies.totalPages || 1, shows.totalPages || 1),
        totalResults: (movies.totalResults || 0) + (shows.totalResults || 0),
        results: mergeInterleaved(movies.results || [], shows.results || [])
      };
    }

    return apiGet(`/Discover/${encodeURIComponent(state.category)}?page=${page}${discoverFilterQuery(mediaKindForCategory(state.category))}`);
  }

  async function loadDetail(item) {
    state.detailBase = item;
    state.detail = null;
    state.detailLoading = true;
    renderBody();
    try {
      const endpoint = item.mediaType === "tv" ? `/Tv/${item.id}` : `/Movie/${item.id}`;
      state.detail = normalizeDetail(await apiGet(endpoint), item);
    } catch (error) {
      state.detail = { ...item, error: error.message };
    } finally {
      state.detailLoading = false;
      renderBody();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function normalize(items) {
    return items
      .filter((item) => item && (item.mediaType === "movie" || item.mediaType === "tv"))
      .map(normalizeItem);
  }

  function normalizeItem(item) {
    return {
      id: item.id,
      mediaType: item.mediaType,
      title: item.title || item.name || item.originalTitle || item.originalName || "Untitled",
      releaseDate: item.releaseDate || item.firstAirDate || item.airDate || "",
      year: (item.releaseDate || item.firstAirDate || item.airDate || "").slice(0, 4),
      rating: item.voteAverage || item.vote_average || 0,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      overview: item.overview || "",
      tagline: item.tagline || "",
      runtime: item.runtime,
      genres: (item.genres || []).map((genre) => genre.name || genre).filter(Boolean),
      mediaInfo: item.mediaInfo || null
    };
  }

  function normalizeDetail(detail, base) {
    const item = normalizeItem({
      ...detail,
      id: detail.id || base.id,
      mediaType: base.mediaType,
      title: detail.title || detail.name || base.title,
      posterPath: detail.posterPath || base.posterPath,
      mediaInfo: detail.mediaInfo || base.mediaInfo
    });
    item.seasons = base.mediaType === "tv" ? normalizeSeasons(detail, item) : [];
    return item;
  }

  function normalizeSeasons(detail, show) {
    const mediaSeasons = [
      ...(detail.mediaInfo?.seasons || []),
      ...(detail.mediaInfo?.seasonRequests || [])
    ];
    return (detail.seasons || [])
      .filter((season) => Number(season.seasonNumber) > 0)
      .map((season) => {
        const seasonNumber = Number(season.seasonNumber);
        const mediaSeason = mediaSeasons.find((item) => Number(item.seasonNumber) === seasonNumber) || {};
        return {
          showId: show.id,
          mediaType: "tv",
          seasonNumber,
          title: season.name || `Season ${seasonNumber}`,
          overview: season.overview || "",
          posterPath: season.posterPath || show.posterPath,
          airDate: season.airDate || season.air_date || "",
          episodeCount: season.episodeCount || season.episode_count,
          status: mediaSeason.status ?? season.status ?? null
        };
      });
  }

  function mergeUniqueResults(existing, incoming) {
    return dedupeResults(existing.concat(incoming));
  }

  function dedupeResults(items) {
    const byKey = new Map();
    for (const item of items) {
      const itemKey = key(item);
      const current = byKey.get(itemKey);
      byKey.set(itemKey, chooseBetterResult(current, item));
    }
    return Array.from(byKey.values());
  }

  function chooseBetterResult(current, candidate) {
    if (!current) return candidate;
    const currentScore = resultCompleteness(current);
    const candidateScore = resultCompleteness(candidate);
    if (candidateScore > currentScore) {
      return { ...current, ...candidate };
    }
    return { ...candidate, ...current };
  }

  function resultCompleteness(item) {
    return [
      item.title,
      item.year,
      item.rating,
      item.posterPath,
      item.overview,
      item.mediaInfo,
      item.mediaInfo?.status
    ].filter((value) => value !== null && value !== undefined && value !== "").length;
  }

  function key(item) {
    return `${item.mediaType}:${item.id}`;
  }

  function seasonKey(show, seasonNumber) {
    return `tv:${show.id}:season:${seasonNumber}`;
  }

  function requestKey(item, seasonNumber) {
    return seasonNumber === undefined ? key(item) : seasonKey(item, seasonNumber);
  }

  function providerRegion() {
    const region = (navigator.language || "").split("-")[1];
    return /^[A-Z]{2}$/.test(region || "") ? region : "US";
  }

  function hasActiveFilters() {
    return Boolean(state.filters.rating || state.filters.releaseFrom || state.filters.releaseTo || state.filters.provider);
  }

  function hasActiveSort() {
    return Boolean(state.sort);
  }

  function mediaKindForCategory(category) {
    return category === "shows" || category === "upcoming-shows" ? "tv" : "movie";
  }

  function discoverFilterQuery(mediaKind) {
    if (state.category === "trending" && !hasActiveFilters() && !hasActiveSort()) return "";

    const params = new URLSearchParams();
    const sortBy = sortByForMediaKind(mediaKind);
    if (sortBy) params.set("sortBy", sortBy);
    if (state.filters.rating) params.set("voteAverageGte", state.filters.rating);
    if (state.filters.provider) {
      params.set("watchProviders", state.filters.provider);
      params.set("watchRegion", providerRegion());
    }

    if (state.filters.releaseFrom) {
      params.set(mediaKind === "tv" ? "firstAirDateGte" : "primaryReleaseDateGte", state.filters.releaseFrom);
    }

    if (state.filters.releaseTo) {
      params.set(mediaKind === "tv" ? "firstAirDateLte" : "primaryReleaseDateLte", state.filters.releaseTo);
    }

    const value = params.toString();
    return value ? `&${value}` : "";
  }

  function sortByForMediaKind(mediaKind) {
    switch (state.sort) {
      case "release-desc":
        return mediaKind === "tv" ? "first_air_date.desc" : "primary_release_date.desc";
      case "release-asc":
        return mediaKind === "tv" ? "first_air_date.asc" : "primary_release_date.asc";
      case "rating-desc":
        return "vote_average.desc";
      case "rating-asc":
        return "vote_average.asc";
      case "title-asc":
        return mediaKind === "tv" ? "name.asc" : "original_title.asc";
      case "title-desc":
        return mediaKind === "tv" ? "name.desc" : "original_title.desc";
      default:
        return "";
    }
  }

  function mergeInterleaved(left, right) {
    const merged = [];
    const count = Math.max(left.length, right.length);
    for (let index = 0; index < count; index += 1) {
      if (left[index]) merged.push(left[index]);
      if (right[index]) merged.push(right[index]);
    }
    return merged;
  }

  function filterResults(items) {
    if (!state.query) return items;
    return items.filter((item) => {
      if (state.filters.rating && Number(item.rating || 0) < Number(state.filters.rating)) return false;
      if (state.filters.releaseFrom && item.releaseDate && item.releaseDate < state.filters.releaseFrom) return false;
      if (state.filters.releaseTo && item.releaseDate && item.releaseDate > state.filters.releaseTo) return false;
      return true;
    });
  }

  function sortResults(items) {
    if (!state.sort) return items;

    const sorted = [...items];
    sorted.sort((left, right) => {
      switch (state.sort) {
        case "release-desc":
          return compareDate(right.releaseDate, left.releaseDate) || compareTitle(left, right);
        case "release-asc":
          return compareDate(left.releaseDate, right.releaseDate) || compareTitle(left, right);
        case "rating-desc":
          return compareNumber(right.rating, left.rating) || compareTitle(left, right);
        case "rating-asc":
          return compareNumber(left.rating, right.rating) || compareTitle(left, right);
        case "title-desc":
          return compareTitle(right, left);
        case "title-asc":
          return compareTitle(left, right);
        default:
          return 0;
      }
    });
    return sorted;
  }

  function compareDate(left, right) {
    const leftTime = left ? Date.parse(left) : Number.NaN;
    const rightTime = right ? Date.parse(right) : Number.NaN;
    const leftMissing = Number.isNaN(leftTime);
    const rightMissing = Number.isNaN(rightTime);
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;
    return leftTime - rightTime;
  }

  function compareNumber(left, right) {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    const leftMissing = Number.isNaN(leftNumber);
    const rightMissing = Number.isNaN(rightNumber);
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;
    return leftNumber - rightNumber;
  }

  function compareTitle(left, right) {
    return String(left.title || "").localeCompare(String(right.title || ""), undefined, { sensitivity: "base", numeric: true });
  }

  function statusName(status) {
    if (status === 5) return "available";
    if (status === 4) return "partially available";
    if (status === 2 || status === 3) return "requested";
    if (status === 7) return "deleted";
    return "not available";
  }

  function statusFor(item) {
    const local = state.local.get(key(item));
    if (local) return local;
    return statusName(item.mediaInfo?.status);
  }

  function statusForSeason(show, season) {
    const local = state.local.get(seasonKey(show, season.seasonNumber));
    if (local) return local;
    return statusName(season.status);
  }

  function actionForStatus(label, status, pending) {
    if (pending) return { label: "Requesting", disabled: true, muted: true };
    if (status === "available") return { label: "Available", disabled: true, muted: true };
    if (status === "requested" || status === "processing" || status === "pending") return { label: "Requested", disabled: true, muted: true };
    if (status.startsWith("error:")) return { label: "Retry", disabled: false, muted: false, error: true };
    const requestsDisabled = state.status?.requestSubmissionEnabled === false;
    return { label, disabled: requestsDisabled, muted: requestsDisabled };
  }

  function actionFor(item) {
    return actionForStatus(
      item.mediaType === "tv" ? "Request Show" : "Request",
      statusFor(item),
      state.pending.has(key(item))
    );
  }

  function actionForSeason(show, season) {
    return actionForStatus(
      "Request Season",
      statusForSeason(show, season),
      state.pending.has(seasonKey(show, season.seasonNumber))
    );
  }

  function requestBody(item, seasonNumber) {
    const body = {
      mediaType: item.mediaType === "tv" ? "tv" : "movie",
      mediaId: item.id,
      is4k: false
    };
    if (item.mediaType === "tv") body.seasons = seasonNumber === undefined ? "all" : [seasonNumber];
    return body;
  }

  async function submit(item, seasonNumber) {
    const itemKey = requestKey(item, seasonNumber);
    if (state.pending.has(itemKey)) return;
    state.pending.add(itemKey);
    renderBody();
    try {
      await apiPost("/Request", requestBody(item, seasonNumber));
      state.local.set(itemKey, "requested");
      if (seasonNumber === undefined) {
        item.mediaInfo = item.mediaInfo || {};
        item.mediaInfo.status = 2;
      } else {
        const season = item.seasons?.find((entry) => entry.seasonNumber === seasonNumber);
        if (season) season.status = 2;
      }
    } catch (error) {
      state.local.set(itemKey, error.message.toLowerCase().includes("already") ? "requested" : `error: ${error.message}`);
    } finally {
      state.pending.delete(itemKey);
      renderBody();
    }
  }

  function renderTabs() {
    els.tabs.innerHTML = CATEGORIES.map((category) => (
      `<button class="tab${category.id === state.category && !state.query ? " selected" : ""}" data-category="${escapeHtml(category.id)}">${escapeHtml(category.label)}</button>`
    )).join("");
  }

  function readFilters() {
    state.filters = {
      rating: els.ratingFilter.value,
      releaseFrom: els.releaseFromFilter.value,
      releaseTo: els.releaseToFilter.value,
      provider: els.providerFilter.value
    };
  }

  function readSort() {
    state.sort = els.sortSelect.value;
  }

  function resetAndLoad() {
    state.results = [];
    state.detail = null;
    state.detailBase = null;
    state.page = 1;
    renderTabs();
    loadResults();
  }

  function renderBody() {
    if (state.detailBase) {
      renderDetail();
      return;
    }

    if (els.detailBack) els.detailBack.hidden = true;
    if (state.loading && state.results.length === 0) {
      els.results.innerHTML = `<div class="message">Loading...</div>`;
    } else if (state.results.length === 0) {
      els.results.innerHTML = `<div class="message">No results found.</div>`;
    } else {
      els.results.innerHTML = `<div class="grid">${state.results.map(renderCard).join("")}</div>`;
    }
    els.footer.innerHTML = canLoadMore() ? `<button class="more" data-load-more="true">Load more</button>` : "";
  }

  function renderDetail() {
    if (els.detailBack) els.detailBack.hidden = false;
    els.footer.innerHTML = "";
    if (state.detailLoading) {
      els.results.innerHTML = `<div class="detail"><div class="message">Loading details...</div></div>`;
      return;
    }

    const item = state.detail || state.detailBase;
    if (item.error) {
      els.results.innerHTML = `<div class="detail"><div class="message">${escapeHtml(item.error)}</div></div>`;
      return;
    }

    const meta = [
      item.mediaType === "tv" ? "Series" : "Movie",
      item.year,
      item.runtime ? `${item.runtime} min` : "",
      ...(item.genres || []).slice(0, 3)
    ].filter(Boolean).join(" - ");

    els.results.innerHTML = [
      `<article class="detail">`,
      `<section class="detail-hero">`,
      poster(item, "detail-poster"),
      `<div class="detail-copy">`,
      `<div class="status">${escapeHtml(meta)}</div>`,
      `<h2>${escapeHtml(item.title)}${item.year ? ` (${escapeHtml(item.year)})` : ""}</h2>`,
      item.tagline ? `<div class="tagline">${escapeHtml(item.tagline)}</div>` : "",
      item.overview ? `<p class="overview">${escapeHtml(item.overview)}</p>` : `<p class="overview">No overview available.</p>`,
      item.mediaType === "movie" ? renderMovieAction(item) : renderSeriesSummary(item),
      `</div>`,
      `</section>`,
      item.mediaType === "tv" ? renderSeasonGrid(item) : "",
      `</article>`
    ].join("");
  }

  function renderMovieAction(item) {
    const action = actionFor(item);
    const payload = escapeHtml(JSON.stringify({ id: item.id, mediaType: item.mediaType }));
    return `<button class="action detail-action${action.muted ? " muted" : ""}${action.error ? " error" : ""}" data-request="${payload}" ${action.disabled ? "disabled" : ""}>${escapeHtml(action.label)}</button>`;
  }

  function renderSeriesSummary(item) {
    const seasonCount = item.seasons?.length || 0;
    const status = statusFor(item);
    return `<div class="series-summary">${escapeHtml(seasonCount)} seasons - ${escapeHtml(status)}</div>`;
  }

  function renderSeasonGrid(item) {
    if (!item.seasons?.length) {
      return `<div class="message">No season details found.</div>`;
    }

    return [
      `<section class="season-section">`,
      `<h3>Seasons</h3>`,
      `<div class="season-grid">`,
      item.seasons.map((season) => renderSeasonCard(item, season)).join(""),
      `</div>`,
      `</section>`
    ].join("");
  }

  function renderSeasonCard(show, season) {
    const action = actionForSeason(show, season);
    const status = statusForSeason(show, season);
    const payload = escapeHtml(JSON.stringify({ id: show.id, mediaType: "tv", seasonNumber: season.seasonNumber }));
    const year = (season.airDate || "").slice(0, 4);
    return [
      `<article class="season-card">`,
      poster({ ...season, title: season.title }, "season-poster"),
      `<div class="season-body">`,
      `<div class="name">${escapeHtml(season.title)}${year ? ` (${escapeHtml(year)})` : ""}</div>`,
      `<div class="status">${escapeHtml(season.episodeCount || "?")} episodes - ${escapeHtml(status)}</div>`,
      `<button class="action${action.muted ? " muted" : ""}${action.error ? " error" : ""}" data-season-request="${payload}" ${action.disabled ? "disabled" : ""}>${escapeHtml(action.label)}</button>`,
      `</div>`,
      `</article>`
    ].join("");
  }

  function poster(item, className = "poster") {
    return item.posterPath
      ? `<img class="${escapeHtml(className)}" alt="" loading="lazy" src="https://image.tmdb.org/t/p/w500${escapeHtml(item.posterPath)}">`
      : `<div class="${escapeHtml(className)} poster-fallback">${escapeHtml(item.title)}</div>`;
  }

  function renderCard(item) {
    const action = actionFor(item);
    const payload = escapeHtml(JSON.stringify({ id: item.id, mediaType: item.mediaType }));
    const status = statusFor(item);
    return [
      `<article class="card">`,
      `<button class="card-link" data-detail="${payload}" aria-label="Open ${escapeHtml(item.title)} details">`,
      poster(item),
      `<div class="card-body">`,
      `<div class="name">${escapeHtml(item.title)}${item.year ? ` (${escapeHtml(item.year)})` : ""}</div>`,
      `<div class="status">${escapeHtml(item.mediaType === "tv" ? "show" : "movie")} - ${escapeHtml(status)}</div>`,
      `</div>`,
      `</button>`,
      `<div class="card-actions">`,
      `<button class="action${action.muted ? " muted" : ""}${action.error ? " error" : ""}" data-request="${payload}" ${action.disabled ? "disabled" : ""}>${escapeHtml(action.label)}</button>`,
      `</div>`,
      `</article>`
    ].join("");
  }

  function itemFromPayload(value) {
    if (state.detail?.id === value.id && state.detail?.mediaType === value.mediaType) return state.detail;
    return state.results.find((item) => item.id === value.id && item.mediaType === value.mediaType);
  }

  function bindEvents() {
    els.search.addEventListener("input", () => {
      state.query = els.search.value.trim();
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => {
        resetAndLoad();
      }, 350);
    });

    els.filterToggle.addEventListener("click", () => {
      const open = !els.filters.classList.contains("open");
      els.filters.classList.toggle("open", open);
      els.filterToggle.setAttribute("aria-expanded", String(open));
    });

    els.sortToggle.addEventListener("click", () => {
      const open = !els.sorts.classList.contains("open");
      els.sorts.classList.toggle("open", open);
      els.sortToggle.setAttribute("aria-expanded", String(open));
    });

    els.applyFilters.addEventListener("click", () => {
      readFilters();
      resetAndLoad();
    });

    els.clearFilters.addEventListener("click", () => {
      els.ratingFilter.value = "";
      els.releaseFromFilter.value = "";
      els.releaseToFilter.value = "";
      els.providerFilter.value = "";
      readFilters();
      resetAndLoad();
    });

    els.applySort.addEventListener("click", () => {
      readSort();
      resetAndLoad();
    });

    els.clearSort.addEventListener("click", () => {
      els.sortSelect.value = "";
      readSort();
      resetAndLoad();
    });

    document.addEventListener("click", (event) => {
      const detail = event.target.closest("[data-detail]");
      if (detail) {
        const item = itemFromPayload(JSON.parse(detail.getAttribute("data-detail")));
        if (item) loadDetail(item);
        return;
      }

      const request = event.target.closest("[data-request]");
      if (request) {
        const item = itemFromPayload(JSON.parse(request.getAttribute("data-request")));
        if (item) submit(item);
        return;
      }

      const seasonRequest = event.target.closest("[data-season-request]");
      if (seasonRequest) {
        const payload = JSON.parse(seasonRequest.getAttribute("data-season-request"));
        const item = itemFromPayload(payload);
        if (item) submit(item, payload.seasonNumber);
        return;
      }

      if (event.target.closest("[data-back]")) {
        state.detail = null;
        state.detailBase = null;
        renderBody();
        return;
      }

      const category = event.target.closest("[data-category]");
      if (category) {
        state.category = category.getAttribute("data-category");
        state.query = "";
        els.search.value = "";
        resetAndLoad();
        return;
      }

      if (event.target.closest("[data-load-more]")) {
        loadResults({ append: true });
      }
    });

    window.addEventListener("scroll", () => {
      if (state.detailBase || !canLoadMore()) return;
      const remaining = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (remaining < 700) {
        loadResults({ append: true });
      }
    }, { passive: true });
  }

  function canLoadMore() {
    return Boolean(state.pageInfo && state.pageInfo.page < state.pageInfo.totalPages && !state.loading);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  bindEvents();
  renderTabs();
  loadStatus().finally(loadResults);
})();

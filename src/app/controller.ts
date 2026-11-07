import {
  ancestors,
  genreUrl,
  normalizeGenres,
  syncAlbumGenres,
} from "./genres";
import { renderGenresView, renderGenreDetail } from "../views/genresView";
import { readGenreCatalog } from "./storage";
import type { Genre, AlbumGenre } from "../types/albums";
import {
  artistUrl,
  artistAlbums,
  artistRoles,
  roleLabel,
  renderArtistsView,
  updateArtistsView,
  renderArtistDetail,
} from "../views/artistsView";
import type {
  Album,
  Artist,
  AlbumArtist,
  ArtistRole,
  AlbumLink,
  AlbumInstrument,
  ListeningEntry,
  Instrument,
  InstrumentCategory,
} from "../types/albums";
import { catalog, ratingLabels } from "../data/mockData";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import {
  webUrl,
  cover,
  artistText,
  albumUrl,
  displayRating,
} from "../components/presentation";
import { stars } from "../components/rating";
import { renderLibraryView, updateLibrary } from "../views/libraryView";
import { renderAlbumDetailView } from "../views/albumDetailView";
import {
  readAlbums,
  saveAlbums,
  readInstrumentCatalog,
  readArtistCatalog,
} from "./storage";
import { matches } from "./search";
import {
  albumsUsing,
  instrumentUrl,
  instrumentCategories,
  syncAlbumInstruments,
} from "./instruments";
import {
  categoryFields,
  renderInstrumentsView,
  updateInstrumentsView,
  renderInstrumentDetail,
} from "../views/instrumentsView";
import { focusForTyping, prefersTouchInteraction } from "./device";

export function initializeApp() {
  const main = document.querySelector<HTMLElement>("main")!;
  const editor = document.querySelector<HTMLDialogElement>("#editor")!;
  const toast = document.querySelector<HTMLElement>("#toast")!;
  const state = { query: "", genre: "", sort: "recent", layout: "grid" };
  let albums = readAlbums();
  let genres = readGenreCatalog(albums);
  syncAlbumGenres(albums, genres);
  let selectedGenres: AlbumGenre[] = [];
  let genreChoices: Genre[] = [];
  let genreQuery = "";
  let genreAlphabetical = false;
  let genreUnused = false;
  let artists = readArtistCatalog(albums);
  let artistQuery = "";
  let artistUnused = false;
  let selectedArtists: AlbumArtist[] = [];
  let artistChoices: Artist[] = [];
  let instruments = readInstrumentCatalog(albums);
  syncAlbumInstruments(albums, instruments);
  const instrumentFilters = { query: "", category: "", unused: false };
  let selectedInstruments: AlbumInstrument[] = [];
  let instrumentChoices: AlbumInstrument[] = [];
  let dialogOrigin: HTMLElement | undefined;
  let dialogBaseline = "";
  let viewHash: string;
  let toastTimer: ReturnType<typeof setTimeout>;
  let searchQuery = "";

  document.querySelector<HTMLElement>("#add-icon")!.innerHTML = icon(
    "plus",
    17,
  );

  function makeId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }

  function announce(message: string) {
    clearTimeout(toastTimer);
    toast.innerHTML =
      icon("check", 17) + "<span>" + escapeHtml(message) + "</span>";
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3800);
  }

  function activeAlbum() {
    return albums.find((album) => albumUrl(album.id) === location.hash);
  }

  function activeInstrument() {
    return instruments.find((item) => instrumentUrl(item.id) === location.hash);
  }

  function renderRoute(focus = false) {
    const genre = genres.find((g) => genreUrl(g.id) === location.hash);
    const genrePage =
      location.hash === "#genres" || location.hash.startsWith("#genre/");
    const album = activeAlbum();
    const artist = artists.find((item) => artistUrl(item.id) === location.hash);
    const artistPage =
      location.hash === "#artists" || location.hash.startsWith("#artist/");
    const instrument = activeInstrument();
    const instrumentPage =
      location.hash === "#instruments" ||
      location.hash.startsWith("#instrument/");
    for (const link of document.querySelectorAll<HTMLElement>("[data-nav]")) {
      if (
        link.dataset.nav ===
        (genrePage
          ? "genres"
          : artistPage
            ? "artists"
            : instrumentPage
              ? "instruments"
              : "library")
      )
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    const missing = location.hash.startsWith("#album/") && !album;
    if (genrePage) {
      main.innerHTML = genre
        ? renderGenreDetail(genre, genres, albums)
        : location.hash === "#genres"
          ? renderGenresView(
              genres,
              albums,
              genreQuery,
              genreAlphabetical,
              genreUnused,
            )
          : '<div class="empty"><h1 id="page-title">Genre unavailable</h1><a href="#genres">Back to genres</a></div>';
    } else if (location.hash === "#artists") {
      main.innerHTML = renderArtistsView(artistQuery, artistUnused);
      updateArtistList();
    } else if (artist) {
      main.innerHTML = renderArtistDetail(artist, albums);
    } else if (artistPage) {
      main.innerHTML = /* HTML */ `<div class="empty">
        <h1 id="page-title">Artist unavailable</h1>
        <a href="#artists">Back to artists</a>
      </div>`;
    } else if (location.hash === "#instruments") {
      main.innerHTML = renderInstrumentsView(instrumentFilters);
      updateInstrumentList();
    } else if (instrument) {
      main.innerHTML = renderInstrumentDetail(instrument, albums);
    } else if (instrumentPage) {
      main.innerHTML = /* HTML */ `<div class="empty route-empty">
        <h1 id="page-title">Instrument unavailable</h1>
        <p>This instrument may have been deleted.</p>
        <a class="button secondary" href="#instruments">Back to instruments</a>
      </div>`;
    } else if (album) {
      main.innerHTML = renderAlbumDetailView(album);
    } else if (missing) {
      main.innerHTML = /* HTML */ `<div class="empty route-empty">
        ${icon("disc", 35)}
        <h1 id="page-title">Album unavailable</h1>
        <p>This album may have been added in another browser.</p>
        <a class="button secondary" href="#">${icon("back")} Back to library</a>
      </div>`;
    } else {
      main.innerHTML = renderLibraryView(albums, state, genres);
      updateLibrary(albums, state, genres);
    }
    document.title = genrePage
      ? `${genre?.name ?? "Genres"} — JazzLog`
      : artistPage
        ? `${artist?.name ?? "Artists"} — JazzLog`
        : instrumentPage
          ? `${instrument?.name ?? "Instruments"} — JazzLog`
          : album
            ? album.title + " — JazzLog"
            : "JazzLog — The Listening Room";
    if (focus) {
      window.scrollTo(0, 0);
      const heading = document.querySelector<HTMLElement>("#page-title");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
  }

  function dialogFormState() {
    const form = editor.querySelector("form");
    if (!form) return "";
    return JSON.stringify({
      fields: [...new FormData(form).entries()],
      artists: editor.querySelector("#artist-selected")
        ? selectedArtists
        : null,
      genres: editor.querySelector("#genre-selected") ? selectedGenres : null,
      instruments: editor.querySelector("#instrument-selected")
        ? selectedInstruments
        : null,
    });
  }

  function canDismissDialog() {
    return (
      dialogFormState() === dialogBaseline ||
      window.confirm("Discard unsaved changes? Your changes will be lost.")
    );
  }

  function dismissDialog() {
    if (canDismissDialog()) editor.close();
  }

  function showDialog(
    title: string,
    eyebrow: string,
    content: string,
    focusSelector: string,
  ) {
    const opening = !editor.open;
    if (opening) dialogOrigin = document.activeElement as HTMLElement;
    editor.innerHTML = /* HTML */ `<div class="dialog-heading">
        <div>
          <p class="eyebrow"><span></span> ${eyebrow}</p>
          <h2 id="dialog-title" tabindex="-1">${title}</h2>
        </div>
        <button
          class="icon-button close"
          type="button"
          aria-label="Close dialog"
          data-action="close"
        >
          ${icon("close", 22)}
        </button>
      </div>
      ${content}`;
    // Picker controls finish rendering synchronously after showDialog returns.
    queueMicrotask(() => {
      dialogBaseline = dialogFormState();
    });
    if (opening) editor.showModal();
    editor.scrollTop = 0;
    // Keep dialog focus accessible without opening a touch keyboard.
    editor
      .querySelector<HTMLElement>(
        prefersTouchInteraction() ? "#dialog-title" : focusSelector,
      )
      ?.focus({ preventScroll: true });
  }

  function openSearch(reset = true) {
    if (reset) searchQuery = "";
    showDialog(
      "Add an album",
      "NEW RECORD",
      /* HTML */ `<div class="dialog-body">
          <p class="dialog-intro">
            Find a release in the demo MusicBrainz catalog, or enter the details
            yourself.
          </p>
          <label class="search-field dialog-search"
            >${icon("search")}<span class="sr-only"
              >Search MusicBrainz demo catalog</span
            ><input
              id="catalog-query"
              type="search"
              placeholder="Try Miles Davis or Blue Train…"
              value="${escapeHtml(searchQuery)}"
              autocomplete="off"
          /></label>
          <div class="search-results-heading">
            <span>MusicBrainz results <span class="demo-label">Demo</span></span
            ><span id="catalog-count" aria-live="polite"></span>
          </div>
          <div id="catalog-results"></div>
        </div>
        <div class="dialog-footer search-footer">
          <span>Can’t find your album?</span
          ><button type="button" class="button secondary" data-action="manual">
            ${icon("edit", 16)} Enter manually
          </button>
        </div>`,
      "#catalog-query",
    );
    updateCatalog();
  }

  function updateCatalog() {
    const results = catalog.filter((album) =>
      matches(
        searchQuery,
        album.title,
        ...album.artists.map((artist) => artist.name),
        album.releaseYear,
      ),
    );
    const inLibrary = (album: Album) =>
      albums.find((item) => item.sourceId === album.id);
    const sorted = [...results].sort(
      (a, b) => Number(Boolean(inLibrary(a))) - Number(Boolean(inLibrary(b))),
    );
    document.querySelector<HTMLElement>("#catalog-count")!.textContent =
      `${results.length} ${results.length === 1 ? "result" : "results"}`;
    document.querySelector<HTMLElement>("#catalog-results")!.innerHTML =
      results.length
        ? /* HTML */ `<ul class="catalog-list">
            ${sorted
              .map((album) => {
                const saved = inLibrary(album);
                return /* HTML */ `<li>
                  <button
                    type="button"
                    class="result-row"
                    data-action="pick"
                    data-id="${album.id}"
                  >
                    ${cover(album)}<span class="result-info"
                      ><strong>${escapeHtml(album.title)}</strong
                      ><span
                        >${escapeHtml(artistText(album))} ·
                        ${album.releaseYear}</span
                      ></span
                    >
                    ${saved ? '<span class="in-library">In library</span>' : ""}${icon("chevron", 17)}
                  </button>
                </li>`;
              })
              .join("")}
          </ul>`
        : /* HTML */ `<div class="empty catalog-empty">
            ${icon("search", 25)}
            <h3>No matching releases</h3>
            <p>Try another title or artist, or add this album manually.</p>
          </div>`;
  }

  function field(
    label: string,
    name: string,
    value: unknown = "",
    options: {
      type?: string;
      attributes?: string;
      placeholder?: string;
      help?: string;
    } = {},
  ) {
    const {
      type = "text",
      attributes = "",
      placeholder = "",
      help = "",
    } = options;
    return /* HTML */ `<label class="field"
      ><span>${label}</span
      ><input
        name="${name}"
        type="${type}"
        value="${escapeHtml(value)}"
        placeholder="${placeholder}"
        ${attributes}
      />${help ? /* HTML */ `<small>${help}</small>` : ""}</label
    >`;
  }

  function linkRow(link: Partial<AlbumLink> = {}) {
    return /* HTML */ `<div class="link-fields">
      ${field("URL", "linkUrl", link.url, { type: "url", placeholder: "https://…", attributes: 'maxlength="2000"' })}
      ${field("Label", "linkLabel", link.label, { placeholder: "Optional", attributes: 'maxlength="60"' })}
      <button
        class="icon-button remove-link"
        type="button"
        aria-label="Remove music link"
        data-action="remove-link"
      >
        ${icon("close", 17)}
      </button>
    </div>`;
  }

  function updateArtistList() {
    updateArtistsView(artists, albums, artistQuery, artistUnused);
  }

  function openCatalogArtist(item?: Artist) {
    showDialog(
      item ? "Edit artist" : "Add artist",
      "YOUR ARTIST CATALOG",
      /* HTML */ `<form
        id="catalog-artist-form"
        data-id="${escapeHtml(item?.id ?? "")}"
      >
        <div class="dialog-body">
          ${field("Artist name", "artistName", item?.name, { attributes: 'required maxlength="150"', placeholder: "e.g. Miles Davis" })}
          ${field("Sort name", "sortName", item?.sortName, { attributes: 'maxlength="150"', placeholder: "e.g. Davis, Miles" })}
          ${field("Country code", "country", item?.country, { attributes: 'maxlength="2" pattern="[A-Za-z]{2}"', placeholder: "e.g. US" })}
          ${field("MusicBrainz artist ID", "artistMbid", item?.musicbrainzId, { attributes: 'maxlength="36"', placeholder: "Optional artist ID" })}
          <p class="form-hint">
            Artist details apply everywhere this artist is credited. Choose
            their role separately on each album.
          </p>
          <p id="form-error" class="form-error" role="alert" hidden></p>
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button class="button primary" type="submit">Save artist</button>
        </div>
      </form>`,
      '[name="artistName"]',
    );
  }

  function artistPicker(credits: AlbumArtist[]) {
    artistChoices = structuredClone(artists);
    selectedArtists = credits.map((credit) => {
      const existing = artistChoices.find(
        (item) =>
          item.id === credit.id ||
          (credit.musicbrainzId
            ? item.musicbrainzId === credit.musicbrainzId
            : item.name.toLowerCase() === credit.name.toLowerCase()),
      );
      if (!existing) {
        const { role, position, ...artist } = credit;
        artistChoices.push(artist);
      }
      return { ...credit, ...(existing ?? {}) };
    });
    return /* HTML */ `<div class="instrument-picker">
      <label class="field" for="artist-query"
        ><span>Artists <span class="muted">(optional)</span></span></label
      >
      <p id="artist-help" class="form-hint">
        Choose artists from your catalog, then set each album credit’s role and
        order.
      </p>
      <div id="artist-selected"></div>
      <input
        id="artist-query"
        type="search"
        maxlength="150"
        autocomplete="off"
        placeholder="Search or create an artist…"
        aria-describedby="artist-help"
      />
      <div
        id="artist-results"
        class="instrument-results"
        aria-label="Available artists"
      ></div>
      <a class="manage-instruments" href="#artists"
        >Manage artist catalog ${icon("arrow", 14)}</a
      >
    </div>`;
  }

  function updateArtists() {
    const input = editor.querySelector<HTMLInputElement>("#artist-query");
    if (!input) return;
    const query = input.value.trim();
    editor.querySelector("#artist-selected")!.innerHTML = selectedArtists
      .map(
        (item, index) =>
          /* HTML */ `<div class="artist-credit-row">
            <strong>${escapeHtml(item.name)}</strong
            ><label class="field"
              ><span class="sr-only">Role for ${escapeHtml(item.name)}</span
              ><select data-artist-role="${escapeHtml(item.id)}">
                ${artistRoles.map((role) => /* HTML */ `<option value="${role}" ${item.role === role ? "selected" : ""}>${roleLabel(role)}</option>`).join("")}
              </select></label
            ><button
              type="button"
              class="icon-button"
              data-action="move-artist"
              data-id="${escapeHtml(item.id)}"
              aria-label="Move ${escapeHtml(item.name)} earlier"
              ${index === 0 ? "disabled" : ""}
            >
              ↑</button
            ><button
              type="button"
              class="icon-button"
              data-action="remove-artist"
              data-id="${escapeHtml(item.id)}"
              aria-label="Remove ${escapeHtml(item.name)}"
            >
              ${icon("close", 16)}
            </button>
          </div>`,
      )
      .join("");
    const choices = artistChoices.filter(
      (item) =>
        !selectedArtists.some((credit) => credit.id === item.id) &&
        matches(query, item.name, item.sortName ?? ""),
    );
    editor.querySelector("#artist-results")!.innerHTML =
      choices
        .map(
          (item) =>
            /* HTML */ `<button
              type="button"
              class="button secondary compact"
              data-action="select-artist"
              data-id="${escapeHtml(item.id)}"
            >
              ${icon("plus", 14)} ${escapeHtml(item.name)}
            </button>`,
        )
        .join("") +
      (query &&
      !artistChoices.some(
        (item) => item.name.toLowerCase() === query.toLowerCase(),
      )
        ? /* HTML */ `<button
            type="button"
            class="button secondary compact"
            data-action="create-artist"
          >
            ${icon("plus", 14)} Create “${escapeHtml(query)}”
          </button>`
        : "");
  }

  function instrumentPicker(items: AlbumInstrument[]) {
    selectedInstruments = structuredClone(items);
    instrumentChoices = instruments.map((item) => ({
      ...structuredClone(item),
      notes: null,
    }));
    return /* HTML */ `<div class="instrument-picker">
      <label class="field" for="instrument-query"
        ><span>Instruments <span class="muted">(optional)</span></span></label
      >
      <p class="form-hint" id="instrument-help">
        Add what you know now, or come back after listening.
      </p>
      <div id="instrument-selected" class="tags" aria-live="polite"></div>
      <input
        id="instrument-query"
        type="search"
        maxlength="80"
        autocomplete="off"
        placeholder="Search or create an instrument…"
        aria-describedby="instrument-help"
      />
      <div
        id="instrument-results"
        class="instrument-results"
        aria-label="Available instruments"
      ></div>
      <details class="inline-instrument-categories">
        <summary>Categories for a new instrument</summary>
        ${categoryFields([], "inline-category")}
      </details>
      <a class="manage-instruments" href="#instruments"
        >Manage instrument catalog ${icon("arrow", 14)}</a
      >
    </div>`;
  }

  function updateInstruments() {
    const input = editor.querySelector<HTMLInputElement>("#instrument-query");
    if (!input) return;
    const query = input.value.trim();
    editor.querySelector("#instrument-selected")!.innerHTML =
      selectedInstruments
        .map(
          (item) =>
            /* HTML */ `<button
              type="button"
              class="instrument-chip"
              data-action="remove-instrument"
              data-id="${escapeHtml(item.id)}"
              aria-label="Remove ${escapeHtml(item.name)}"
            >
              ${escapeHtml(item.name)} ${icon("close", 14)}
            </button>`,
        )
        .join("");
    const choices = instrumentChoices.filter(
      (item) =>
        !selectedInstruments.some((selected) => selected.id === item.id) &&
        item.name.toLowerCase().includes(query.toLowerCase()),
    );
    editor.querySelector("#instrument-results")!.innerHTML =
      choices
        .map(
          (item) =>
            /* HTML */ `<button
              type="button"
              class="button secondary compact"
              data-action="select-instrument"
              data-id="${escapeHtml(item.id)}"
            >
              ${icon("plus", 14)} ${escapeHtml(item.name)}
            </button>`,
        )
        .join("") +
      (query &&
      !instrumentChoices.some(
        (item) => item.name.toLowerCase() === query.toLowerCase(),
      )
        ? /* HTML */ `<button
            type="button"
            class="button secondary compact"
            data-action="create-instrument"
          >
            ${icon("plus", 14)} Create “${escapeHtml(query)}”
          </button>`
        : "") +
      (!choices.length && !query
        ? '<p class="form-hint">Search for an instrument name to add one.</p>'
        : "");
  }

  function openInstruments(album: Album) {
    showDialog(
      "Edit instruments",
      "ALBUM INSTRUMENTATION",
      /* HTML */ `<form id="instruments-form" data-id="${escapeHtml(album.id)}">
        <div class="dialog-body">
          <p class="dialog-intro">${escapeHtml(album.title)}</p>
          ${instrumentPicker(album.instruments)}
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button type="submit" class="button primary">
            Save instruments
          </button>
        </div>
      </form>`,
      "#instrument-query",
    );
    updateInstruments();
  }

  function updateInstrumentList() {
    updateInstrumentsView(instruments, albums, instrumentFilters);
  }

  function commitInstrumentChoices() {
    instruments = instrumentChoices.map(({ id, name, categories }) => ({
      id,
      name,
      categories,
    }));
  }

  function openCatalogInstrument(item?: Instrument) {
    showDialog(
      item ? "Edit instrument" : "Add instrument",
      "YOUR INSTRUMENT CATALOG",
      /* HTML */ `<form
        id="catalog-instrument-form"
        data-id="${escapeHtml(item?.id ?? "")}"
      >
        <div class="dialog-body">
          ${field("Instrument name", "instrumentName", item?.name ?? "", { attributes: 'required maxlength="80"', placeholder: "e.g. Vibraphone" })}
          ${categoryFields(item?.categories)}
          <p class="form-hint">
            Name and category changes apply everywhere this instrument is used.
          </p>
          <p id="form-error" class="form-error" role="alert" hidden></p>
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button type="submit" class="button primary">
            ${item ? "Save changes" : "Add instrument"}
          </button>
        </div>
      </form>`,
      '[name="instrumentName"]',
    );
  }

  function finishCatalogSave(message: string, destination: string) {
    syncAlbumGenres(albums, genres);
    syncAlbumInstruments(albums, instruments);
    for (const album of albums)
      for (const credit of album.artists) {
        const artist = artists.find((item) => item.id === credit.id);
        if (artist) Object.assign(credit, artist);
      }
    const stored = saveAlbums(albums, instruments, artists, genres);
    editor.close();
    if (location.hash === destination) renderRoute(true);
    else location.hash = destination;
    announce(
      stored
        ? message
        : "Updated for this visit. Browser storage is unavailable.",
    );
  }

  function saveCatalogInstrument(form: HTMLFormElement) {
    const input = form.querySelector<HTMLInputElement>(
      '[name="instrumentName"]',
    )!;
    const name = input.value.trim();
    if (!name) return formError("Enter an instrument name.", input);
    if (
      instruments.some(
        (item) =>
          item.id !== form.dataset.id &&
          item.name.toLowerCase() === name.toLowerCase(),
      )
    )
      return formError("An instrument with this name already exists.", input);
    const data = new FormData(form);
    const item: Instrument = {
      id: form.dataset.id || makeId(),
      name,
      categories: data
        .getAll("category")
        .filter((category): category is InstrumentCategory =>
          instrumentCategories.some((value) => value === category),
        ),
    };
    instruments = instruments
      .filter((existing) => existing.id !== item.id)
      .concat(item);
    finishCatalogSave("Instrument saved.", instrumentUrl(item.id));
  }

  function openAlbumForm(album: Partial<Album> = {}, mode = "manual") {
    const isEdit = mode === "edit";
    const fromSearch = mode === "review";
    const title = isEdit
      ? "Edit album"
      : fromSearch
        ? "Review album"
        : "Add album manually";
    showDialog(
      title,
      isEdit ? "ALBUM DETAILS" : "NEW RECORD",
      /* HTML */ `<form
        id="album-form"
        data-mode="${mode}"
        data-id="${escapeHtml(album.id)}"
      >
        <div class="dialog-body">
          ${
            fromSearch
              ? /* HTML */ `<div class="review-preview">
                  ${cover(album)}
                  <div>
                    <strong>${escapeHtml(album.title)}</strong>
                    <p class="muted">
                      From the demo catalog. Review the details before saving.
                    </p>
                  </div>
                </div>`
              : ""
          }
          ${isEdit ? "" : '<p class="form-hint">Album title is required. The other fields are optional.</p>'}
          <div class="field-grid">
            ${field("Album title", "title", album.title, { attributes: 'required maxlength="150"', placeholder: "Album title" })}
            ${field("Release year", "year", album.releaseYear, { type: "number", attributes: 'min="1000" max="9999" step="1"', placeholder: "e.g. 1976" })}
          </div>
          ${artistPicker(album.artists ?? [])}
          ${genrePicker(album.genres ?? [])}
          ${instrumentPicker(album.instruments ?? [])}
          <details class="extra-fields">
            <summary>More album details</summary>
            <div class="field-grid">
              ${field("Sort title", "sortTitle", album.sortTitle, { attributes: 'maxlength="150"', placeholder: "Optional" })}
              ${field("Record label", "label", album.recordLabel, { attributes: 'maxlength="100"', placeholder: "Optional" })}
              ${field("Artwork URL", "artwork", webUrl(album.artworkUrl)?.href, { type: "url", attributes: 'maxlength="2000"', placeholder: "https://…" })}
              ${field("MusicBrainz ID", "mbid", album.musicbrainzReleaseGroupId, { attributes: 'maxlength="36"', placeholder: "Release group ID" })}
            </div>
          </details>
          <div class="link-form">
            <h3>Music links</h3>
            <p class="form-hint">
              Add Apple Music, YouTube, or another music link.
            </p>
            <div id="link-rows">
              ${(album.links ?? []).map(linkRow).join("")}
            </div>
            <button
              type="button"
              class="button secondary compact"
              data-action="add-link"
            >
              ${icon("plus", 15)} Add link
            </button>
          </div>
          <p class="form-error" id="form-error" role="alert" hidden></p>
        </div>
        <div class="dialog-footer">
          <button
            type="button"
            class="button secondary"
            data-action="${isEdit ? "close" : "back-search"}"
          >
            ${isEdit ? "Cancel" : "Back to search"}</button
          ><button type="submit" class="button primary">
            ${isEdit ? "Save changes" : "Save album"}
          </button>
        </div>
      </form>`,
      '[name="title"]',
    );
    updateInstruments();
    updateArtists();
    updateGenres();
  }

  function updateCatalogFilters(focusId: string) {
    renderRoute();
    const dropdown = main.querySelector<HTMLDetailsElement>(
      ".genre-filter-dropdown",
    );
    if (dropdown) dropdown.open = true;
    main.querySelector<HTMLElement>(`#${focusId}`)?.focus();
  }
  document.addEventListener("click", (event) => {
    const dropdown = main.querySelector<HTMLDetailsElement>(
      ".genre-filter-dropdown[open]",
    );
    if (dropdown && !dropdown.contains(event.target as Node))
      dropdown.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const dropdown = main.querySelector<HTMLDetailsElement>(
      ".genre-filter-dropdown[open]",
    );
    if (dropdown) {
      dropdown.open = false;
      dropdown.querySelector<HTMLElement>("summary")?.focus();
    }
  });

  function genrePicker(selected: AlbumGenre[]) {
    genreChoices = structuredClone(genres);
    selectedGenres = normalizeGenres(
      selected.map((g) => ({
        ...g,
        id:
          genres.find((c) => c.name.toLowerCase() === g.name.toLowerCase())
            ?.id ?? g.id,
      })),
      [
        ...genreChoices,
        ...selected.filter((g) => !genreChoices.some((c) => c.id === g.id)),
      ],
    );
    for (const g of selectedGenres)
      if (!genreChoices.some((c) => c.id === g.id))
        genreChoices.push({
          id: g.id,
          name: g.name,
          parentGenreId: g.parentGenreId,
        });
    return /* HTML */ `<div class="instrument-picker">
      <label class="field" for="genre-query"
        ><span>Genres <span class="muted">(optional)</span></span></label
      >
      <p id="genre-help" class="form-hint">
        Choose specific genres. Parent filters include their descendants. At
        most one may be primary.
      </p>
      <div id="genre-selected" aria-live="polite"></div>
      <input
        id="genre-query"
        type="search"
        maxlength="80"
        autocomplete="off"
        placeholder="Search or create a genre…"
        aria-describedby="genre-help"
      />
      <div
        id="genre-results"
        class="instrument-results"
        aria-label="Available genres"
      ></div>
      <a class="manage-instruments" href="#genres"
        >Manage genre catalog ${icon("arrow", 14)}</a
      >
    </div>`;
  }
  function updateGenres() {
    const input = editor.querySelector<HTMLInputElement>("#genre-query");
    if (!input) return;
    const query = input.value.trim();
    editor.querySelector("#genre-selected")!.innerHTML = selectedGenres
      .map(
        (g) =>
          /* HTML */ `<div class="genre-credit-row">
            <strong>${escapeHtml(g.name)}</strong
            ><label
              ><input
                type="checkbox"
                data-genre-primary="${escapeHtml(g.id)}"
                ${g.isPrimary ? "checked" : ""}
              />
              Primary</label
            ><button
              type="button"
              class="button secondary compact"
              data-action="remove-genre"
              data-id="${escapeHtml(g.id)}"
            >
              Remove
            </button>
          </div>`,
      )
      .join("");
    editor.querySelector("#genre-results")!.innerHTML =
      genreChoices
        .filter(
          (g) =>
            !selectedGenres.some((c) => c.id === g.id) &&
            matches(
              query,
              g.name,
              ...ancestors(g.id, genreChoices).map((p) => p.name),
            ),
        )
        .map((g) => {
          const descendant = selectedGenres.find((c) =>
            ancestors(c.id, genreChoices).some((p) => p.id === g.id),
          );
          return /* HTML */ `<button
            type="button"
            class="button secondary compact"
            data-action="select-genre"
            data-id="${escapeHtml(g.id)}"
            ${descendant ? "disabled" : ""}
          >
            ${icon("plus", 14)}
            ${escapeHtml(g.name)}${
              descendant
                ? ` — Included through ${escapeHtml(descendant.name)}`
                : ancestors(g.id, genreChoices).length
                  ? ` (${ancestors(g.id, genreChoices)
                      .map((p) => escapeHtml(p.name))
                      .join(" › ")})`
                  : ""
            }
          </button>`;
        })
        .join("") +
      (query &&
      !genreChoices.some((g) => g.name.toLowerCase() === query.toLowerCase())
        ? /* HTML */ `<button
            type="button"
            class="button secondary compact"
            data-action="create-genre"
          >
            ${icon("plus", 14)} Create “${escapeHtml(query)}”
          </button>`
        : "");
  }
  function openCatalogGenre(item?: Genre) {
    showDialog(
      item ? "Edit genre" : "Add genre",
      "GENRE CATALOG",
      /* HTML */ `<form
        id="catalog-genre-form"
        data-id="${escapeHtml(item?.id ?? "")}"
      >
        <div class="dialog-body">
          ${field("Genre name", "genreName", item?.name ?? "", { attributes: 'required maxlength="80"' })}<label
            class="field"
            ><span>Parent genre (optional)</span
            ><select name="parentGenreId">
              <option value="">No parent</option>
              ${genres
                .filter(
                  (g) =>
                    g.id !== item?.id &&
                    !ancestors(g.id, genres).some((p) => p.id === item?.id),
                )
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(
                  (g) =>
                    /* HTML */ `<option
                      value="${escapeHtml(g.id)}"
                      ${g.id === item?.parentGenreId ? "selected" : ""}
                    >
                      ${escapeHtml([...ancestors(g.id, genres), g].map((p) => p.name).join(" › "))}
                    </option>`,
                )
                .join("")}
            </select></label
          >
          <p id="form-error" class="form-error" role="alert" hidden></p>
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button class="button primary" type="submit">Save genre</button>
        </div>
      </form>`,
      '[name="genreName"]',
    );
  }

  function openListen(album: Album, entry?: ListeningEntry) {
    showDialog(
      entry ? "Edit listen" : "Log a listen",
      "LISTENING ENTRY",
      /* HTML */ `<form
        id="listen-form"
        data-id="${escapeHtml(album.id)}"
        data-entry-id="${escapeHtml(entry?.id ?? "")}"
      >
        <div class="dialog-body">
          <p class="dialog-intro">
            ${escapeHtml(album.title)}
            <span class="separator">·</span> ${escapeHtml(artistText(album))}
          </p>
          ${field("Date listened", "date", entry?.listenedAt.slice(0, 10) ?? today(), { type: "date", attributes: 'required min="1900-01-01" max="' + today() + '"' })}
          <fieldset class="rate-field">
            <legend>Rating</legend>
            <div class="rating-picker">
              <span id="rating-stars">${stars(entry?.rating ?? 0)}</span>
              <div class="rating-options">
                ${ratingLabels.map((label, i) => /* HTML */ `<label><input name="rating" type="radio" value="${i + 1}" ${entry?.rating === i + 1 ? "checked" : ""} required aria-label="${(i + 1) / 2} out of 5 stars: ${escapeHtml(label)}" /></label>`).join("")}
              </div>
            </div>
            <p id="rating-description" class="form-hint" aria-live="polite">
              Select a rating. Half stars are available.
            </p>
          </fieldset>
          <label class="field"
            ><span>Listening notes</span
            ><textarea
              name="notes"
              rows="4"
              maxlength="3000"
              placeholder="What stood out on this listen?"
            >
${escapeHtml(entry?.notes ?? "")}</textarea>
          </label>
        </div>
        <div class="dialog-footer">
          <button type="button" class="button secondary" data-action="close">
            Cancel</button
          ><button type="submit" class="button primary">
            ${entry ? "Save changes" : "Save listen"}
          </button>
        </div>
        ${
          entry
            ? /* HTML */ `<div class="listen-delete">
                <details>
                  <summary>Delete listening entry</summary>
                  <p>
                    This will permanently remove this listen, including its
                    rating and notes.
                  </p>
                  <button
                    type="button"
                    class="button secondary danger"
                    data-action="delete-listen"
                  >
                    Delete entry permanently
                  </button>
                </details>
              </div>`
            : ""
        }
      </form>`,
      entry ? '[name="notes"]' : '[name="date"]',
    );
    if (entry) updateRating(entry.rating);
  }

  function updateRating(rating: number) {
    document.querySelector<HTMLElement>("#rating-stars")!.innerHTML =
      stars(rating);
    document.querySelector<HTMLElement>("#rating-description")!.textContent =
      `${displayRating(rating)} / 5 · ${ratingLabels[rating - 1]}`;
  }

  function formError(message: string, input: HTMLInputElement) {
    const error = document.querySelector<HTMLElement>("#form-error")!;
    error.hidden = false;
    error.textContent = message;
    if (input?.closest("details")) input.closest("details")!.open = true;
    input?.focus();
  }

  function saveAlbumForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const mode = form.dataset.mode;
    const original =
      mode === "edit"
        ? albums.find((album) => album.id === form.dataset.id)
        : catalog.find((album) => album.id === form.dataset.id);
    if ((mode === "edit" || mode === "review") && !original) return;
    const title = value("title");
    const artwork = value("artwork");
    const mbid = value("mbid");
    if (!title)
      return formError(
        "Enter an album title.",
        form.querySelector<HTMLInputElement>("[name=title]")!,
      );
    if (artwork && !webUrl(artwork))
      return formError(
        "Enter an HTTP or HTTPS artwork URL.",
        form.querySelector<HTMLInputElement>("[name=artwork]")!,
      );
    if (mbid && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(mbid))
      return formError(
        "Enter a valid MusicBrainz release group ID.",
        form.querySelector<HTMLInputElement>("[name=mbid]")!,
      );
    const links = [];
    for (const row of form.querySelectorAll(".link-fields")) {
      const input = row.querySelector<HTMLInputElement>('[name="linkUrl"]')!;
      const url = input.value.trim();
      const label = row
        .querySelector<HTMLInputElement>('[name="linkLabel"]')!
        .value.trim();
      if (!url && !label) continue;
      if (!webUrl(url))
        return formError(
          "Enter an HTTP or HTTPS URL for each music link.",
          input,
        );
      links.push({ id: makeId(), url, label });
    }
    commitInstrumentChoices();
    artists = structuredClone(artistChoices);
    genres = structuredClone(genreChoices);
    const saved: Album = {
      id: mode === "edit" ? original!.id : makeId(),
      sourceId: mode === "review" ? original!.id : original?.sourceId,
      title,
      sortTitle: value("sortTitle"),
      artists: selectedArtists.map((credit, position) => ({
        ...credit,
        position,
      })),
      releaseYear: Number(value("year")) || null,
      genres: structuredClone(selectedGenres),
      recordLabel: value("label"),
      artworkUrl:
        artwork ||
        (!webUrl(original?.artworkUrl) ? original?.artworkUrl : "") ||
        "",
      musicbrainzReleaseGroupId: mbid || null,
      links,
      createdAt: mode === "edit" ? original!.createdAt : today(),
      instruments: structuredClone(selectedInstruments),
      updatedAt: new Date().toISOString(),
      listeningEntries: mode === "edit" ? original!.listeningEntries : [],
    };
    albums =
      mode === "edit"
        ? albums.map((album) => (album.id === saved.id ? saved : album))
        : [saved, ...albums];
    finishSave(
      saved.id,
      mode === "edit" ? "Album updated." : "Album added to your library.",
    );
  }

  function saveListenForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const album = albums.find((item) => item.id === form.dataset.id);
    if (!album) return;
    const entry = album.listeningEntries.find(
      (item) => item.id === form.dataset.entryId,
    );
    if (form.dataset.entryId && !entry) return;
    const now = new Date().toISOString();
    album.updatedAt = now;
    const updates = {
      updatedAt: now,
      listenedAt: String(data.get("date")),
      rating: Number(data.get("rating")),
      notes: String(data.get("notes")).trim(),
    };
    if (entry) Object.assign(entry, updates);
    else
      album.listeningEntries.unshift({
        id: makeId(),
        createdAt: now,
        ...updates,
      });
    finishSave(album.id, entry ? "Listen updated." : "Listen saved.");
  }

  function finishSave(id: string, message: string) {
    const stored = saveAlbums(albums, instruments, artists, genres);
    editor.close();
    if (location.hash === albumUrl(id)) {
      renderRoute();
      document
        .querySelector<HTMLElement>("#page-title")
        ?.setAttribute("tabindex", "-1");
      document
        .querySelector<HTMLElement>("#page-title")
        ?.focus({ preventScroll: true });
    } else {
      location.hash = albumUrl(id);
    }
    announce(
      stored
        ? message
        : "Updated for this visit. Browser storage is unavailable.",
    );
  }

  document.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button[data-action]",
    );
    if (!button) return;
    const album = activeAlbum();
    switch (button.dataset.action) {
      case "new-catalog-genre":
        openCatalogGenre();
        break;
      case "edit-catalog-genre":
        openCatalogGenre(genres.find((g) => genreUrl(g.id) === location.hash));
        break;
      case "delete-catalog-genre": {
        const item = genres.find((g) => genreUrl(g.id) === location.hash);
        if (
          !item ||
          genres.some((g) => g.parentGenreId === item.id) ||
          albums.some((a) => a.genres.some((g) => g.id === item.id))
        )
          break;
        showDialog(
          "Delete genre?",
          "GENRE CATALOG",
          /* HTML */ `<div class="dialog-body">
              Delete ${escapeHtml(item.name)}?
            </div>
            <div class="dialog-footer">
              <button class="button secondary" data-action="close">
                Cancel</button
              ><button
                class="button primary danger"
                data-action="confirm-delete-genre"
                data-id="${escapeHtml(item.id)}"
              >
                Delete genre
              </button>
            </div>`,
          '[data-action="close"]',
        );
        break;
      }
      case "confirm-delete-genre":
        if (
          !genres.some((g) => g.parentGenreId === button.dataset.id) &&
          !albums.some((a) => a.genres.some((g) => g.id === button.dataset.id))
        ) {
          genres = genres.filter((g) => g.id !== button.dataset.id);
          finishCatalogSave("Genre deleted.", "#genres");
        }
        break;
      case "select-genre":
      case "create-genre": {
        const input = editor.querySelector<HTMLInputElement>("#genre-query")!;
        let item = genreChoices.find((g) => g.id === button.dataset.id);
        if (button.dataset.action === "create-genre") {
          const name = input.value.trim();
          if (!name) break;
          item = genreChoices.find(
            (g) => g.name.toLowerCase() === name.toLowerCase(),
          );
          if (!item) {
            item = { id: makeId(), name, parentGenreId: null };
            genreChoices.push(item);
          }
        }
        if (
          !item ||
          selectedGenres.some(
            (g) =>
              g.id === item.id ||
              ancestors(g.id, genreChoices).some((p) => p.id === item!.id),
          )
        )
          break;
        const replaced = selectedGenres.filter((g) =>
          ancestors(item!.id, genreChoices).some((p) => p.id === g.id),
        );
        selectedGenres = normalizeGenres(
          [...selectedGenres, { ...item, isPrimary: false }],
          genreChoices,
        );
        if (replaced.length)
          announce(
            `${replaced.map((g) => g.name).join(", ")} replaced by ${item.name}.`,
          );
        input.value = "";
        updateGenres();
        focusForTyping(input);
        break;
      }
      case "remove-genre":
        selectedGenres = selectedGenres.filter(
          (g) => g.id !== button.dataset.id,
        );
        updateGenres();
        break;
      case "new-catalog-artist":
        openCatalogArtist();
        break;
      case "edit-catalog-artist":
        openCatalogArtist(
          artists.find((item) => artistUrl(item.id) === location.hash),
        );
        break;
      case "delete-catalog-artist": {
        const item = artists.find(
          (item) => artistUrl(item.id) === location.hash,
        );
        if (!item || artistAlbums(albums, item.id).length) break;
        showDialog(
          "Delete artist?",
          "YOUR ARTIST CATALOG",
          /* HTML */ `<div class="dialog-body">
              <p>Delete ${escapeHtml(item.name)} from your catalog?</p>
            </div>
            <div class="dialog-footer">
              <button
                type="button"
                class="button secondary"
                data-action="close"
              >
                Cancel</button
              ><button
                type="button"
                class="button primary danger"
                data-action="confirm-delete-artist"
                data-id="${escapeHtml(item.id)}"
              >
                Delete artist
              </button>
            </div>`,
          '[data-action="close"]',
        );
        break;
      }
      case "confirm-delete-artist":
        if (!artistAlbums(albums, button.dataset.id!).length) {
          artists = artists.filter((item) => item.id !== button.dataset.id);
          finishCatalogSave("Artist deleted.", "#artists");
        }
        break;
      case "clear-artist-filters":
        artistQuery = "";
        artistUnused = false;
        renderRoute();
        break;
      case "create-artist":
      case "select-artist": {
        const input = editor.querySelector<HTMLInputElement>("#artist-query")!;
        let item = artistChoices.find((item) => item.id === button.dataset.id);
        if (button.dataset.action === "create-artist") {
          const name = input.value.trim();
          if (
            !name ||
            artistChoices.some(
              (item) => item.name.toLowerCase() === name.toLowerCase(),
            )
          )
            break;
          item = {
            id: makeId(),
            name,
            sortName: null,
            country: null,
            musicbrainzId: null,
          };
          artistChoices.push(item);
        }
        if (item && !selectedArtists.some((credit) => credit.id === item.id))
          selectedArtists.push({
            ...item,
            role: "primary",
            position: selectedArtists.length,
          });
        input.value = "";
        updateArtists();
        focusForTyping(input);
        break;
      }
      case "remove-artist":
        selectedArtists = selectedArtists.filter(
          (item) => item.id !== button.dataset.id,
        );
        updateArtists();
        focusForTyping(editor.querySelector("#artist-query"));
        break;
      case "move-artist": {
        const index = selectedArtists.findIndex(
          (item) => item.id === button.dataset.id,
        );
        if (index > 0)
          [selectedArtists[index - 1], selectedArtists[index]] = [
            selectedArtists[index],
            selectedArtists[index - 1],
          ];
        updateArtists();
        editor
          .querySelector<HTMLElement>(
            `[data-action="move-artist"][data-id="${button.dataset.id}"]`,
          )
          ?.focus();
        break;
      }

      case "new-catalog-instrument":
        openCatalogInstrument();
        break;
      case "edit-catalog-instrument": {
        const item = activeInstrument();
        if (item) openCatalogInstrument(item);
        break;
      }
      case "delete-catalog-instrument": {
        const item = activeInstrument();
        if (!item || albumsUsing(albums, item.id).length) break;
        showDialog(
          "Delete instrument?",
          "YOUR INSTRUMENT CATALOG",
          /* HTML */ `<div class="dialog-body">
              <p>
                Delete <strong>${escapeHtml(item.name)}</strong> from your
                catalog? It is not used on any albums.
              </p>
            </div>
            <div class="dialog-footer">
              <button
                type="button"
                class="button secondary"
                data-action="close"
              >
                Cancel</button
              ><button
                type="button"
                class="button primary danger"
                data-action="confirm-delete-instrument"
                data-id="${escapeHtml(item.id)}"
              >
                Delete instrument
              </button>
            </div>`,
          '[data-action="close"]',
        );
        break;
      }
      case "confirm-delete-instrument": {
        const item = instruments.find((item) => item.id === button.dataset.id);
        if (!item || albumsUsing(albums, item.id).length) break;
        instruments = instruments.filter((existing) => existing.id !== item.id);
        finishCatalogSave("Instrument deleted.", "#instruments");
        break;
      }
      case "clear-instrument-filters":
        instrumentFilters.query = "";
        instrumentFilters.category = "";
        instrumentFilters.unused = false;
        renderRoute();
        break;
      case "edit-instruments":
        if (album) openInstruments(album);
        break;
      case "select-instrument": {
        const item = instrumentChoices.find(
          (item) => item.id === button.dataset.id,
        );
        if (
          item &&
          !selectedInstruments.some((selected) => selected.id === item.id)
        )
          selectedInstruments.push({ ...item, notes: null });
        editor.querySelector<HTMLInputElement>("#instrument-query")!.value = "";
        updateInstruments();
        focusForTyping(editor.querySelector<HTMLElement>("#instrument-query"));
        break;
      }
      case "create-instrument": {
        const input =
          editor.querySelector<HTMLInputElement>("#instrument-query")!;
        const name = input.value.trim();
        if (!name) break;
        const categories = [
          ...editor.querySelectorAll<HTMLInputElement>(
            '[name="inline-category"]:checked',
          ),
        ].map((input) => input.value as InstrumentCategory);
        const item = { id: makeId(), name, notes: null, categories };
        for (const input of editor.querySelectorAll<HTMLInputElement>(
          '[name="inline-category"]',
        ))
          input.checked = false;
        instrumentChoices.push(item);
        selectedInstruments.push(item);
        input.value = "";
        updateInstruments();
        focusForTyping(input);
        break;
      }
      case "remove-instrument":
        selectedInstruments = selectedInstruments.filter(
          (item) => item.id !== button.dataset.id,
        );
        updateInstruments();
        focusForTyping(editor.querySelector<HTMLElement>("#instrument-query"));
        break;
      case "add":
        openSearch();
        break;
      case "edit":
        if (album) openAlbumForm(album, "edit");
        break;
      case "edit-listen": {
        const entry = album?.listeningEntries.find(
          (item) => item.id === button.dataset.id,
        );
        if (album && entry) openListen(album, entry);
        break;
      }
      case "delete-listen": {
        const form = button.closest<HTMLFormElement>("#listen-form");
        const owner = albums.find((item) => item.id === form?.dataset.id);
        if (
          !owner ||
          !owner.listeningEntries.some(
            (item) => item.id === form?.dataset.entryId,
          )
        )
          break;
        owner.listeningEntries = owner.listeningEntries.filter(
          (item) => item.id !== form?.dataset.entryId,
        );
        owner.updatedAt = new Date().toISOString();
        finishSave(owner.id, "Listen deleted.");
        break;
      }
      case "listen":
        if (album) openListen(album);
        break;
      case "close":
        dismissDialog();
        break;
      case "manual":
        openAlbumForm();
        break;
      case "back-search":
        if (canDismissDialog()) openSearch(false);
        break;
      case "pick": {
        const result = catalog.find((entry) => entry.id === button.dataset.id);
        if (!result) break;
        const saved = albums.find((entry) => entry.sourceId === result.id);
        if (saved) {
          editor.close();
          location.hash = albumUrl(saved.id);
        } else {
          openAlbumForm(result, "review");
        }
        break;
      }
      case "layout":
        state.layout = button.dataset.layout === "list" ? "list" : "grid";
        for (const toggle of document.querySelectorAll("[data-layout]")) {
          toggle.setAttribute(
            "aria-pressed",
            toggle === button ? "true" : "false",
          );
        }
        updateLibrary(albums, state, genres);
        break;
      case "clear":
        state.query = "";
        state.genre = "";
        document.querySelector<HTMLInputElement>("#library-query")!.value = "";
        document.querySelector<HTMLSelectElement>("#genre-filter")!.value = "";
        updateLibrary(albums, state, genres);
        focusForTyping(
          document.querySelector<HTMLInputElement>("#library-query"),
        );
        break;
      case "add-link": {
        const rows = document.querySelector<HTMLElement>("#link-rows")!;
        rows.insertAdjacentHTML("beforeend", linkRow());
        focusForTyping(
          rows.lastElementChild!.querySelector<HTMLInputElement>("input"),
        );
        break;
      }
      case "remove-link":
        button.closest(".link-fields")?.remove();
        editor.querySelector<HTMLElement>('[data-action="add-link"]')?.focus();
        break;
    }
  });

  document.addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.id === "instruments-search") {
      instrumentFilters.query = input.value;
      updateInstrumentList();
    }
    if (input.id === "genre-query") updateGenres();
    if (input.id === "genres-search") {
      genreQuery = input.value;
      const start = input.selectionStart;
      renderRoute();
      const next = main.querySelector<HTMLInputElement>("#genres-search")!;
      next.focus();
      next.setSelectionRange(start, start);
    }
    if (input.id === "artists-search") {
      artistQuery = input.value;
      updateArtistList();
    }
    if (input.id === "artist-query") updateArtists();
    if (input.id === "instrument-query") updateInstruments();
    if (input.id === "library-query") {
      state.query = input.value;
      updateLibrary(albums, state, genres);
    }
    if (input.id === "catalog-query") {
      searchQuery = input.value;
      updateCatalog();
    }
  });

  document.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.genrePrimary) {
      selectedGenres = selectedGenres.map((g) => ({
        ...g,
        isPrimary: g.id === input.dataset.genrePrimary && input.checked,
      }));
      updateGenres();
    }
    if (input.id === "genres-alphabetical") {
      genreAlphabetical = input.checked;
      updateCatalogFilters(input.id);
    }
    if (input.id === "genres-unused") {
      genreUnused = input.checked;
      updateCatalogFilters(input.id);
    }
    if (input.id === "artists-unused") {
      artistUnused = input.checked;
      updateCatalogFilters(input.id);
    }
    if (
      input.dataset.artistRole &&
      artistRoles.some((role) => role === input.value)
    ) {
      const credit = selectedArtists.find(
        (item) => item.id === input.dataset.artistRole,
      );
      if (credit) credit.role = input.value as ArtistRole;
    }
    if (input.id === "instrument-category-filter") {
      instrumentFilters.category = input.value;
      updateCatalogFilters(input.id);
    }
    if (input.id === "instruments-unused") {
      instrumentFilters.unused = input.checked;
      updateCatalogFilters(input.id);
    }
    if (input.id === "genre-filter") {
      state.genre = input.value;
      updateLibrary(albums, state, genres);
    }
    if (input.id === "sort-order") {
      state.sort = input.value;
      updateLibrary(albums, state, genres);
    }
    if (input.name === "rating") updateRating(Number(input.value));
  });

  document.addEventListener("submit", (event) => {
    if ((event.target as HTMLElement).id === "catalog-genre-form") {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const data = new FormData(form);
      const input = form.querySelector<HTMLInputElement>('[name="genreName"]')!;
      const name = input.value.trim();
      const id = form.dataset.id || makeId();
      const parentGenreId = String(data.get("parentGenreId") || "") || null;
      if (
        !name ||
        genres.some(
          (g) => g.id !== id && g.name.toLowerCase() === name.toLowerCase(),
        )
      )
        return formError("Enter a unique genre name.", input);
      if (
        parentGenreId &&
        (parentGenreId === id ||
          ancestors(parentGenreId, genres).some((g) => g.id === id))
      )
        return formError(
          "Choose a parent that does not create a cycle.",
          input,
        );
      const next = genres
        .filter((g) => g.id !== id)
        .concat({ id, name, parentGenreId });
      const affected = albums.filter(
        (a) => normalizeGenres(a.genres, next).length < a.genres.length,
      );
      const apply = () => {
        genres = next;
        finishCatalogSave("Genre saved.", genreUrl(id));
      };
      if (affected.length) {
        showDialog(
          "Review genre changes",
          "GENRE CATALOG",
          /* HTML */ `<div class="dialog-body">
              <p>
                This change removes redundant parent assignments from these
                albums, keeping their more specific genres:
              </p>
              <ul>
                ${affected.map((a) => /* HTML */ `<li>${escapeHtml(a.title)}</li>`).join("")}
              </ul>
            </div>
            <div class="dialog-footer">
              <button class="button secondary" data-action="close">
                Cancel</button
              ><button class="button primary" id="apply-genre-change">
                Apply changes
              </button>
            </div>`,
          "#apply-genre-change",
        );
        editor
          .querySelector("#apply-genre-change")!
          .addEventListener("click", apply, { once: true });
      } else apply();
    }
    if ((event.target as HTMLElement).id === "catalog-artist-form") {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const data = new FormData(form);
      const value = (key: string) => String(data.get(key) ?? "").trim();
      const input = form.querySelector<HTMLInputElement>(
        '[name="artistName"]',
      )!;
      const name = value("artistName");
      if (!name) return formError("Enter an artist name.", input);
      if (
        artists.some(
          (item) =>
            item.id !== form.dataset.id &&
            item.name.toLowerCase() === name.toLowerCase(),
        )
      )
        return formError("An artist with this name already exists.", input);
      const musicbrainzId = value("artistMbid") || null;
      if (
        musicbrainzId &&
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(musicbrainzId)
      )
        return formError(
          "Enter a valid MusicBrainz artist ID.",
          form.querySelector('[name="artistMbid"]')!,
        );
      if (
        musicbrainzId &&
        artists.some(
          (item) =>
            item.id !== form.dataset.id &&
            item.musicbrainzId?.toLowerCase() === musicbrainzId.toLowerCase(),
        )
      )
        return formError(
          "This MusicBrainz artist is already in your catalog.",
          input,
        );
      const item: Artist = {
        id: form.dataset.id || makeId(),
        name,
        sortName: value("sortName") || null,
        country: value("country").toUpperCase() || null,
        musicbrainzId,
      };
      artists = artists
        .filter((existing) => existing.id !== item.id)
        .concat(item);
      finishCatalogSave("Artist saved.", artistUrl(item.id));
    }
    if ((event.target as HTMLElement).id === "catalog-instrument-form") {
      event.preventDefault();
      saveCatalogInstrument(event.target as HTMLFormElement);
    }
    if ((event.target as HTMLElement).id === "instruments-form") {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const album = albums.find((item) => item.id === form.dataset.id);
      if (album) {
        commitInstrumentChoices();
        album.instruments = structuredClone(selectedInstruments);
        album.updatedAt = new Date().toISOString();
        finishSave(album.id, "Album instruments updated.");
      }
    }
    if ((event.target as HTMLElement).id === "album-form") {
      event.preventDefault();
      saveAlbumForm(event.target as HTMLFormElement);
    }
    if ((event.target as HTMLElement).id === "listen-form") {
      event.preventDefault();
      saveListenForm(event.target as HTMLFormElement);
    }
  });

  document.addEventListener(
    "invalid",
    (event) => {
      if ((event.target as HTMLElement).closest("details"))
        (event.target as HTMLElement).closest("details")!.open = true;
    },
    true,
  );

  document.addEventListener(
    "error",
    (event) => {
      if ((event.target as Element).matches?.(".cover img"))
        (event.target as Element).remove();
    },
    true,
  );

  function isOutsideDialog(event: PointerEvent | MouseEvent) {
    const bounds = editor.getBoundingClientRect();
    return (
      editor.open &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    );
  }

  let pointerStartedOutside = false;
  let suppressBackdropClick = false;
  document.addEventListener(
    "pointerdown",
    (event) => {
      suppressBackdropClick = false;
      pointerStartedOutside = isOutsideDialog(event);
    },
    true,
  );
  document.addEventListener("pointercancel", () => {
    pointerStartedOutside = false;
  });
  document.addEventListener(
    "pointerup",
    (event) => {
      // Handle the release directly, before a synthesized click or focus change.
      // Dragging from a field to the backdrop must not dismiss the form.
      const dismiss = pointerStartedOutside && isOutsideDialog(event);
      pointerStartedOutside = false;
      if (dismiss) {
        suppressBackdropClick = true;
        event.preventDefault();
        event.stopPropagation();
        dismissDialog();
      }
    },
    true,
  );
  document.addEventListener(
    "click",
    (event) => {
      if (!suppressBackdropClick) return;
      suppressBackdropClick = false;
      // iOS can send a click to the control exposed by closing the dialog.
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  editor.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismissDialog();
  });

  // Keep Tab at the dialog boundaries rather than moving into browser chrome.
  editor.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" &&
      ["instrument-query", "artist-query", "genre-query"].includes(
        (event.target as HTMLElement).id,
      )
    ) {
      event.preventDefault();
      editor
        .querySelector<HTMLButtonElement>(
          (event.target as HTMLElement).id === "artist-query"
            ? "#artist-results button"
            : (event.target as HTMLElement).id === "genre-query"
              ? "#genre-results button:not([disabled])"
              : "#instrument-results button",
        )
        ?.click();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...editor.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary",
      ),
    ].filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });

  editor.addEventListener("close", () => {
    if (
      dialogOrigin?.isConnected &&
      location.hash === viewHash &&
      !main.contains(document.activeElement)
    )
      dialogOrigin.focus();
    dialogOrigin = undefined;
  });

  window.addEventListener("hashchange", () => {
    if (location.hash === "#main-content") return;
    if (editor.open) editor.close();
    viewHash = location.hash;
    renderRoute(true);
  });

  viewHash = location.hash;
  renderRoute();

  return (hash: string): HTMLElement => {
    const page = document.createElement("div");
    page.className = "frame swipe-preview";
    if (hash === "#artists") {
      page.innerHTML = renderArtistsView(artistQuery, artistUnused);
      updateArtistsView(artists, albums, artistQuery, artistUnused, page);
    } else if (hash === "#genres") {
      page.innerHTML = renderGenresView(
        genres,
        albums,
        genreQuery,
        genreAlphabetical,
        genreUnused,
      );
    } else if (hash === "#instruments") {
      page.innerHTML = renderInstrumentsView(instrumentFilters);
      updateInstrumentsView(instruments, albums, instrumentFilters, page);
    } else {
      page.innerHTML = renderLibraryView(albums, state, genres);
      updateLibrary(albums, state, genres, page);
    }
    // Preview content is visual only; avoid duplicate IDs and interactive controls.
    page.inert = true;
    page.setAttribute("aria-hidden", "true");
    page
      .querySelectorAll("[id]")
      .forEach((element) => element.removeAttribute("id"));
    return page;
  };

  function today() {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
}

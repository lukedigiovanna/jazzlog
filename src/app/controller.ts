import type {
  Album,
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
import { readAlbums, saveAlbums, readInstrumentCatalog } from "./storage";
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

export function initializeApp(): void {
  const main = document.querySelector<HTMLElement>("main")!;
  const editor = document.querySelector<HTMLDialogElement>("#editor")!;
  const toast = document.querySelector<HTMLElement>("#toast")!;
  const state = { query: "", genre: "", sort: "recent", layout: "grid" };
  let albums = readAlbums();
  let instruments = readInstrumentCatalog(albums);
  syncAlbumInstruments(albums, instruments);
  const instrumentFilters = { query: "", category: "", unused: false };
  let selectedInstruments: AlbumInstrument[] = [];
  let instrumentChoices: AlbumInstrument[] = [];
  let dialogOrigin: HTMLElement | undefined;
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
    const album = activeAlbum();
    const instrument = activeInstrument();
    const instrumentPage =
      location.hash === "#instruments" ||
      location.hash.startsWith("#instrument/");
    for (const link of document.querySelectorAll<HTMLElement>("[data-nav]")) {
      if (link.dataset.nav === (instrumentPage ? "instruments" : "library"))
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    const missing = location.hash.startsWith("#album/") && !album;
    if (location.hash === "#instruments") {
      main.innerHTML = renderInstrumentsView(instrumentFilters);
      updateInstrumentList();
    } else if (instrument) {
      main.innerHTML = renderInstrumentDetail(instrument, albums);
    } else if (instrumentPage) {
      main.innerHTML = `<div class="empty route-empty"><h1 id="page-title">Instrument unavailable</h1><p>This instrument may have been deleted.</p><a class="button secondary" href="#instruments">Back to instruments</a></div>`;
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
      main.innerHTML = renderLibraryView(albums, state);
      updateLibrary(albums, state);
    }
    document.title = instrumentPage
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

  function instrumentPicker(items: AlbumInstrument[]) {
    selectedInstruments = structuredClone(items);
    instrumentChoices = instruments.map((item) => ({
      ...structuredClone(item),
      notes: null,
    }));
    return `<div class="instrument-picker">
      <label class="field" for="instrument-query"><span>Instruments <span class="muted">(optional)</span></span></label>
      <p class="form-hint" id="instrument-help">Add what you know now, or come back after listening.</p>
      <div id="instrument-selected" class="tags" aria-live="polite"></div>
      <input id="instrument-query" type="search" maxlength="80" autocomplete="off" placeholder="Search or create an instrument…" aria-describedby="instrument-help" />
      <div id="instrument-results" class="instrument-results" aria-label="Available instruments"></div>
      <details class="inline-instrument-categories"><summary>Categories for a new instrument</summary>${categoryFields([], "inline-category")}</details>
      <a class="manage-instruments" href="#instruments">Manage instrument catalog ${icon("arrow", 14)}</a>
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
            `<button type="button" class="instrument-chip" data-action="remove-instrument" data-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">${escapeHtml(item.name)} ${icon("close", 14)}</button>`,
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
            `<button type="button" class="button secondary compact" data-action="select-instrument" data-id="${escapeHtml(item.id)}">${icon("plus", 14)} ${escapeHtml(item.name)}</button>`,
        )
        .join("") +
      (query &&
      !instrumentChoices.some(
        (item) => item.name.toLowerCase() === query.toLowerCase(),
      )
        ? `<button type="button" class="button secondary compact" data-action="create-instrument">${icon("plus", 14)} Create “${escapeHtml(query)}”</button>`
        : "") +
      (!choices.length && !query
        ? '<p class="form-hint">Search for an instrument name to add one.</p>'
        : "");
  }

  function openInstruments(album: Album) {
    showDialog(
      "Edit instruments",
      "ALBUM INSTRUMENTATION",
      `<form id="instruments-form" data-id="${escapeHtml(album.id)}"><div class="dialog-body"><p class="dialog-intro">${escapeHtml(album.title)}</p>${instrumentPicker(album.instruments)}</div><div class="dialog-footer"><button type="button" class="button secondary" data-action="close">Cancel</button><button type="submit" class="button primary">Save instruments</button></div></form>`,
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
      `<form id="catalog-instrument-form" data-id="${escapeHtml(item?.id ?? "")}"><div class="dialog-body">
      ${field("Instrument name", "instrumentName", item?.name ?? "", { attributes: 'required maxlength="80"', placeholder: "e.g. Vibraphone" })}
      ${categoryFields(item?.categories)}
      <p class="form-hint">Name and category changes apply everywhere this instrument is used.</p>
      <p id="form-error" class="form-error" role="alert" hidden></p>
      </div><div class="dialog-footer"><button type="button" class="button secondary" data-action="close">Cancel</button><button type="submit" class="button primary">${item ? "Save changes" : "Add instrument"}</button></div></form>`,
      '[name="instrumentName"]',
    );
  }

  function finishCatalogSave(message: string, destination: string) {
    syncAlbumInstruments(albums, instruments);
    const stored = saveAlbums(albums, instruments);
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
            ${field("Artists", "artists", album.artists?.map((artist) => artist.name).join(", "), { attributes: 'maxlength="220"', placeholder: "Separate names with commas" })}
            ${field("Release year", "year", album.releaseYear, { type: "number", attributes: 'min="1000" max="9999" step="1"', placeholder: "e.g. 1976" })}
            ${field("Genres", "genres", album.genres?.map((genre) => genre.name).join(", "), { attributes: 'maxlength="220"', placeholder: "Separate genres with commas" })}
          </div>
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
        ${entry ? `<div class="listen-delete"><details><summary>Delete listening entry</summary><p>This will permanently remove this listen, including its rating and notes.</p><button type="button" class="button secondary danger" data-action="delete-listen">Delete entry permanently</button></details></div>` : ""}
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

  function separated(value: string) {
    return [
      ...new Set(
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      ),
    ];
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
    const saved: Album = {
      id: mode === "edit" ? original!.id : makeId(),
      sourceId: mode === "review" ? original!.id : original?.sourceId,
      title,
      sortTitle: value("sortTitle"),
      artists: separated(value("artists")).map((name, position) => ({
        id: makeId(),
        name,
        sortName: null,
        musicbrainzId: null,
        country: null,
        role: "primary" as const,
        position,
      })),
      releaseYear: Number(value("year")) || null,
      genres: separated(value("genres")).map((name, i) => ({
        id: makeId(),
        name,
        parentGenreId: null,
        isPrimary: i === 0,
      })),
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
    const stored = saveAlbums(albums, instruments);
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
          `<div class="dialog-body"><p>Delete <strong>${escapeHtml(item.name)}</strong> from your catalog? It is not used on any albums.</p></div><div class="dialog-footer"><button type="button" class="button secondary" data-action="close">Cancel</button><button type="button" class="button primary danger" data-action="confirm-delete-instrument" data-id="${escapeHtml(item.id)}">Delete instrument</button></div>`,
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
        editor.close();
        break;
      case "manual":
        openAlbumForm();
        break;
      case "back-search":
        openSearch(false);
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
        updateLibrary(albums, state);
        break;
      case "clear":
        state.query = "";
        state.genre = "";
        document.querySelector<HTMLInputElement>("#library-query")!.value = "";
        document.querySelector<HTMLSelectElement>("#genre-filter")!.value = "";
        updateLibrary(albums, state);
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
    if (input.id === "instrument-query") updateInstruments();
    if (input.id === "library-query") {
      state.query = input.value;
      updateLibrary(albums, state);
    }
    if (input.id === "catalog-query") {
      searchQuery = input.value;
      updateCatalog();
    }
  });

  document.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.id === "instrument-category-filter") {
      instrumentFilters.category = input.value;
      updateInstrumentList();
    }
    if (input.id === "instruments-unused") {
      instrumentFilters.unused = input.checked;
      updateInstrumentList();
    }
    if (input.id === "genre-filter") {
      state.genre = input.value;
      updateLibrary(albums, state);
    }
    if (input.id === "sort-order") {
      state.sort = input.value;
      updateLibrary(albums, state);
    }
    if (input.name === "rating") updateRating(Number(input.value));
  });

  document.addEventListener("submit", (event) => {
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

  // Keep Tab at the dialog boundaries rather than moving into browser chrome.
  editor.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" &&
      (event.target as HTMLElement).id === "instrument-query"
    ) {
      event.preventDefault();
      editor
        .querySelector<HTMLButtonElement>("#instrument-results button")
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

  function today() {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
}

import type { Album, AlbumLink } from "../types/albums";
import { catalog, ratingLabels } from "../data/mockData";
import { icon } from "../components/icons";
import { escapeHtml } from "../components/html";
import { webUrl, cover, artistText, albumUrl, displayRating } from "../components/presentation";
import { stars } from "../components/rating";
import { renderLibraryView, updateLibrary } from "../views/libraryView";
import { renderAlbumDetailView } from "../views/albumDetailView";
import { readAlbums, saveAlbums } from "./storage";
import { matches } from "./search";

export function initializeApp(): void {
  const main = document.querySelector<HTMLElement>('main')!;
  const editor = document.querySelector<HTMLDialogElement>('#editor')!;
  const toast = document.querySelector<HTMLElement>('#toast')!;
  const state = { query: '', genre: '', sort: 'recent', layout: 'grid' };
  let albums = readAlbums();
  let dialogOrigin: HTMLElement | undefined;
  let viewHash: string;
  let toastTimer: ReturnType<typeof setTimeout>;
  let searchQuery = '';

  document.querySelector<HTMLElement>('#add-icon')!.innerHTML = icon('plus', 17);

  function makeId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function announce(message: string) {
    clearTimeout(toastTimer);
    toast.innerHTML = icon('check', 17) + '<span>' + escapeHtml(message) + '</span>';
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3800);
  }

  function activeAlbum() {
    return albums.find((album) => albumUrl(album.id) === location.hash);
  }

  function renderRoute(focus = false) {
    const album = activeAlbum();
    const missing = location.hash.startsWith('#album/') && !album;
    if (album) {
      main.innerHTML = renderAlbumDetailView(album);
    } else if (missing) {
      main.innerHTML = `<div class="empty route-empty">${icon('disc', 35)}<h1 id="page-title">Album unavailable</h1><p>This album may have been added in another browser.</p><a class="button secondary" href="#">${icon('back')} Back to library</a></div>`;
    } else {
      main.innerHTML = renderLibraryView(albums, state);
      updateLibrary(albums, state);
    }
    document.title = album ? album.title + ' — JazzLog' : 'JazzLog — The Listening Room';
    if (focus) {
      window.scrollTo(0, 0);
      const heading = document.querySelector<HTMLElement>('#page-title');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
  }

  function showDialog(title: string, eyebrow: string, content: string, focusSelector: string) {
    const opening = !editor.open;
    if (opening) dialogOrigin = document.activeElement as HTMLElement;
    editor.innerHTML = `<div class="dialog-heading"><div><p class="eyebrow"><span></span> ${eyebrow}</p><h2 id="dialog-title">${title}</h2></div><button class="icon-button close" type="button" aria-label="Close dialog" data-action="close">${icon('close', 22)}</button></div>${content}`;
    if (opening) editor.showModal();
    editor.scrollTop = 0;
    editor.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true });
  }

  function openSearch(reset = true) {
    if (reset) searchQuery = '';
    showDialog('Add an album', 'NEW RECORD', `<div class="dialog-body">
      <p class="dialog-intro">Find a release in the demo MusicBrainz catalog, or enter the details yourself.</p>
      <label class="search-field dialog-search">${icon('search')}<span class="sr-only">Search MusicBrainz demo catalog</span><input id="catalog-query" type="search" placeholder="Try Miles Davis or Blue Train…" value="${escapeHtml(searchQuery)}" autocomplete="off"></label>
      <div class="search-results-heading"><span>MusicBrainz results <span class="demo-label">Demo</span></span><span id="catalog-count" aria-live="polite"></span></div>
      <div id="catalog-results"></div>
    </div><div class="dialog-footer search-footer"><span>Can’t find your album?</span><button type="button" class="button secondary" data-action="manual">${icon('edit', 16)} Enter manually</button></div>`, '#catalog-query');
    updateCatalog();
  }

  function updateCatalog() {
    const results = catalog.filter((album) => matches(searchQuery, album.title, ...album.artists.map(artist => artist.name), album.releaseYear));
    const inLibrary = (album: Album) => albums.find((item) => item.sourceId === album.id);
    const sorted = [...results].sort((a, b) => Number(Boolean(inLibrary(a))) - Number(Boolean(inLibrary(b))));
    document.querySelector<HTMLElement>('#catalog-count')!.textContent = `${results.length} ${results.length === 1 ? 'result' : 'results'}`;
    document.querySelector<HTMLElement>('#catalog-results')!.innerHTML = results.length
      ? `<ul class="catalog-list">${sorted.map((album) => {
        const saved = inLibrary(album);
        return `<li><button type="button" class="result-row" data-action="pick" data-id="${album.id}">
          ${cover(album)}<span class="result-info"><strong>${escapeHtml(album.title)}</strong><span>${escapeHtml(artistText(album))} · ${album.releaseYear}</span></span>
          ${saved ? '<span class="in-library">In library</span>' : ''}${icon('chevron', 17)}
        </button></li>`;
      }).join('')}</ul>`
      : `<div class="empty catalog-empty">${icon('search', 25)}<h3>No matching releases</h3><p>Try another title or artist, or add this album manually.</p></div>`;
  }

  function field(label: string, name: string, value: unknown = '', options: {type?: string; attributes?: string; placeholder?: string; help?: string} = {}) {
    const { type = 'text', attributes = '', placeholder = '', help = '' } = options;
    return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${placeholder}" ${attributes}>${help ? `<small>${help}</small>` : ''}</label>`;
  }

  function linkRow(link: Partial<AlbumLink> = {}) {
    return `<div class="link-fields">${field('URL', 'linkUrl', link.url, { type: 'url', placeholder: 'https://…', attributes: 'maxlength="2000"' })}
      ${field('Label', 'linkLabel', link.label, { placeholder: 'Optional', attributes: 'maxlength="60"' })}
      <button class="icon-button remove-link" type="button" aria-label="Remove music link" data-action="remove-link">${icon('close', 17)}</button></div>`;
  }

  function openAlbumForm(album: Partial<Album> = {}, mode = 'manual') {
    const isEdit = mode === 'edit';
    const fromSearch = mode === 'review';
    const title = isEdit ? 'Edit album' : fromSearch ? 'Review album' : 'Add album manually';
    showDialog(title, isEdit ? 'ALBUM DETAILS' : 'NEW RECORD', `<form id="album-form" data-mode="${mode}" data-id="${escapeHtml(album.id)}">
      <div class="dialog-body">
        ${fromSearch ? `<div class="review-preview">${cover(album)}<div><strong>${escapeHtml(album.title)}</strong><p class="muted">From the demo catalog. Review the details before saving.</p></div></div>` : ''}
        ${isEdit ? '' : '<p class="form-hint">Album title is required. The other fields are optional.</p>'}
        <div class="field-grid">
          ${field('Album title', 'title', album.title, { attributes: 'required maxlength="150"', placeholder: 'Album title' })}
          ${field('Artists', 'artists', album.artists?.map(artist => artist.name).join(', '), { attributes: 'maxlength="220"', placeholder: 'Separate names with commas' })}
          ${field('Release year', 'year', album.releaseYear, { type: 'number', attributes: 'min="1000" max="9999" step="1"', placeholder: 'e.g. 1976' })}
          ${field('Genres', 'genres', album.genres?.map(genre => genre.name).join(', '), { attributes: 'maxlength="220"', placeholder: 'Separate genres with commas' })}
        </div>
        <details class="extra-fields"><summary>More album details</summary><div class="field-grid">
          ${field('Sort title', 'sortTitle', album.sortTitle, { attributes: 'maxlength="150"', placeholder: 'Optional' })}
          ${field('Record label', 'label', album.recordLabel, { attributes: 'maxlength="100"', placeholder: 'Optional' })}
          ${field('Artwork URL', 'artwork', webUrl(album.artworkUrl)?.href, { type: 'url', attributes: 'maxlength="2000"', placeholder: 'https://…' })}
          ${field('MusicBrainz ID', 'mbid', album.musicbrainzReleaseGroupId, { attributes: 'maxlength="36"', placeholder: 'Release group ID' })}
        </div></details>
        <div class="link-form"><h3>Music links</h3><p class="form-hint">Add Apple Music, YouTube, or another music link.</p><div id="link-rows">${(album.links ?? []).map(linkRow).join('')}</div><button type="button" class="button secondary compact" data-action="add-link">${icon('plus', 15)} Add link</button></div>
        <p class="form-error" id="form-error" role="alert" hidden></p>
      </div>
      <div class="dialog-footer"><button type="button" class="button secondary" data-action="${isEdit ? 'close' : 'back-search'}">${isEdit ? 'Cancel' : 'Back to search'}</button><button type="submit" class="button primary">${isEdit ? 'Save changes' : 'Save album'}</button></div>
    </form>`, '[name="title"]');
  }

  function openListen(album: Album) {
    showDialog('Log a listen', 'LISTENING ENTRY', `<form id="listen-form" data-id="${escapeHtml(album.id)}">
      <div class="dialog-body">
        <p class="dialog-intro">${escapeHtml(album.title)} <span class="separator">·</span> ${escapeHtml(artistText(album))}</p>
        ${field('Date listened', 'date', today(), { type: 'date', attributes: 'required min="1900-01-01" max="' + today() + '"' })}
        <fieldset class="rate-field"><legend>Rating</legend><div class="rating-picker">
          <span id="rating-stars">${stars(0)}</span>
          <div class="rating-options">${ratingLabels.map((label, i) => `<label><input name="rating" type="radio" value="${i + 1}" required aria-label="${(i + 1) / 2} out of 5 stars: ${escapeHtml(label)}"></label>`).join('')}</div>
        </div><p id="rating-description" class="form-hint" aria-live="polite">Select a rating. Half stars are available.</p></fieldset>
        <label class="field"><span>Listening notes</span><textarea name="notes" rows="4" maxlength="3000" placeholder="What stood out on this listen?"></textarea></label>
        ${field('Instruments', 'instruments', '', { attributes: 'maxlength="220"', placeholder: 'e.g. Electric piano, bass, drums', help: 'Separate instruments with commas.' })}
      </div>
      <div class="dialog-footer"><button type="button" class="button secondary" data-action="close">Cancel</button><button type="submit" class="button primary">Save listen</button></div>
    </form>`, '[name="date"]');
  }

  function updateRating(rating: number) {
    document.querySelector<HTMLElement>('#rating-stars')!.innerHTML = stars(rating);
    document.querySelector<HTMLElement>('#rating-description')!.textContent = `${displayRating(rating)} / 5 · ${ratingLabels[rating - 1]}`;
  }

  function separated(value: string) {
    return [...new Set(value.split(',').map((part) => part.trim()).filter(Boolean))];
  }

  function formError(message: string, input: HTMLInputElement) {
    const error = document.querySelector<HTMLElement>('#form-error')!;
    error.hidden = false;
    error.textContent = message;
    if (input?.closest('details')) input.closest('details')!.open = true;
    input?.focus();
  }

  function saveAlbumForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? '').trim();
    const mode = form.dataset.mode;
    const original = mode === 'edit' ? albums.find((album) => album.id === form.dataset.id) : catalog.find((album) => album.id === form.dataset.id);
    if ((mode === 'edit' || mode === 'review') && !original) return;
    const title = value('title');
    const artwork = value('artwork');
    const mbid = value('mbid');
    if (!title) return formError('Enter an album title.', form.querySelector<HTMLInputElement>('[name=title]')!);
    if (artwork && !webUrl(artwork)) return formError('Enter an HTTP or HTTPS artwork URL.', form.querySelector<HTMLInputElement>('[name=artwork]')!);
    if (mbid && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(mbid)) return formError('Enter a valid MusicBrainz release group ID.', form.querySelector<HTMLInputElement>('[name=mbid]')!);
    const links = [];
    for (const row of form.querySelectorAll('.link-fields')) {
      const input = row.querySelector<HTMLInputElement>('[name="linkUrl"]')!;
      const url = input.value.trim();
      const label = row.querySelector<HTMLInputElement>('[name="linkLabel"]')!.value.trim();
      if (!url && !label) continue;
      if (!webUrl(url)) return formError('Enter an HTTP or HTTPS URL for each music link.', input);
      links.push({ id: makeId(), url, label });
    }
    const saved: Album = {
      id: mode === 'edit' ? original!.id : makeId(),
      sourceId: mode === 'review' ? original!.id : original?.sourceId,
      title, sortTitle: value('sortTitle'), artists: separated(value('artists')).map((name, position) => ({ id: makeId(), name, sortName: null, musicbrainzId: null, country: null, role: 'primary' as const, position })),
      releaseYear: Number(value('year')) || null, genres: separated(value('genres')).map((name, i) => ({ id: makeId(), name, parentGenreId: null, isPrimary: i === 0 })), recordLabel: value('label'),
      artworkUrl: artwork || (!webUrl(original?.artworkUrl) ? original?.artworkUrl : '') || '',
      musicbrainzReleaseGroupId: mbid || null, links, createdAt: mode === 'edit' ? original!.createdAt : today(),
      instruments: original?.instruments ?? [], updatedAt: new Date().toISOString(),
      listeningEntries: mode === 'edit' ? original!.listeningEntries : [],
    };
    albums = mode === 'edit' ? albums.map((album) => album.id === saved.id ? saved : album) : [saved, ...albums];
    finishSave(saved.id, mode === 'edit' ? 'Album updated.' : 'Album added to your library.');
  }

  function saveListenForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const album = albums.find((item) => item.id === form.dataset.id);
    if (!album) return;
    album.updatedAt = new Date().toISOString();
    album.listeningEntries.unshift({
      id: makeId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), listenedAt: String(data.get('date')), rating: Number(data.get('rating')),
      notes: String(data.get('notes')).trim(), instruments: separated(String(data.get('instruments'))),
    });
    finishSave(album.id, 'Listen saved.');
  }

  function finishSave(id: string, message: string) {
    const stored = saveAlbums(albums);
    editor.close();
    if (location.hash === albumUrl(id)) {
      renderRoute();
      document.querySelector<HTMLElement>('#page-title')?.setAttribute('tabindex', '-1');
      document.querySelector<HTMLElement>('#page-title')?.focus({ preventScroll: true });
    } else {
      location.hash = albumUrl(id);
    }
    announce(stored ? message : 'Updated for this visit. Browser storage is unavailable.');
  }

  document.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (!button) return;
    const album = activeAlbum();
    switch (button.dataset.action) {
      case 'add': openSearch(); break;
      case 'edit': if (album) openAlbumForm(album, 'edit'); break;
      case 'listen': if (album) openListen(album); break;
      case 'close': editor.close(); break;
      case 'manual': openAlbumForm(); break;
      case 'back-search': openSearch(false); break;
      case 'pick': {
        const result = catalog.find((entry) => entry.id === button.dataset.id);
        if (!result) break;
        const saved = albums.find((entry) => entry.sourceId === result.id);
        if (saved) {
          editor.close();
          location.hash = albumUrl(saved.id);
        } else {
          openAlbumForm(result, 'review');
        }
        break;
      }
      case 'layout':
        state.layout = button.dataset.layout === 'list' ? 'list' : 'grid';
        for (const toggle of document.querySelectorAll('[data-layout]')) {
          toggle.setAttribute('aria-pressed', toggle === button ? 'true' : 'false');
        }
        updateLibrary(albums, state);
        break;
      case 'clear':
        state.query = '';
        state.genre = '';
        document.querySelector<HTMLInputElement>('#library-query')!.value = '';
        document.querySelector<HTMLSelectElement>('#genre-filter')!.value = '';
        updateLibrary(albums, state);
        document.querySelector<HTMLInputElement>('#library-query')!.focus();
        break;
      case 'add-link': {
        const rows = document.querySelector<HTMLElement>('#link-rows')!;
        rows.insertAdjacentHTML('beforeend', linkRow());
        rows.lastElementChild!.querySelector<HTMLInputElement>('input')!.focus();
        break;
      }
      case 'remove-link':
        button.closest('.link-fields')?.remove();
        editor.querySelector<HTMLElement>('[data-action="add-link"]')?.focus();
        break;
    }
  });

  document.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.id === 'library-query') {
      state.query = input.value;
      updateLibrary(albums, state);
    }
    if (input.id === 'catalog-query') {
      searchQuery = input.value;
      updateCatalog();
    }
  });

  document.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.id === 'genre-filter') {
      state.genre = input.value;
      updateLibrary(albums, state);
    }
    if (input.id === 'sort-order') {
      state.sort = input.value;
      updateLibrary(albums, state);
    }
    if (input.name === 'rating') updateRating(Number(input.value));
  });

  document.addEventListener('submit', (event) => {
    if ((event.target as HTMLElement).id === 'album-form') {
      event.preventDefault();
      saveAlbumForm(event.target as HTMLFormElement);
    }
    if ((event.target as HTMLElement).id === 'listen-form') {
      event.preventDefault();
      saveListenForm(event.target as HTMLFormElement);
    }
  });

  document.addEventListener('invalid', (event) => {
    if ((event.target as HTMLElement).closest('details')) (event.target as HTMLElement).closest('details')!.open = true;
  }, true);

  document.addEventListener('error', (event) => {
    if ((event.target as Element).matches?.('.cover img')) (event.target as Element).remove();
  }, true);

  // Keep Tab at the dialog boundaries rather than moving into browser chrome.
  editor.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...editor.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary'
    )].filter(element => element.getClientRects().length > 0);
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

  editor.addEventListener('close', () => {
    if (dialogOrigin?.isConnected && location.hash === viewHash && !main.contains(document.activeElement)) dialogOrigin.focus();
    dialogOrigin = undefined;
  });

  window.addEventListener('hashchange', () => {
    if (location.hash === '#main-content') return;
    if (editor.open) editor.close();
    viewHash = location.hash;
    renderRoute(true);
  });

  viewHash = location.hash;
  renderRoute();

  function today() {
    return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }


}

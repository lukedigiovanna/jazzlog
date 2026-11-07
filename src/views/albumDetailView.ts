import type { Album, AlbumLink, ListeningEntry } from "../types/albums";
import { cover, artistText, orderedListens, chips, webUrl } from "../components/presentation";
import { escapeHtml } from "../components/html";
import { icon } from "../components/icons";
import { renderRating } from "../components/rating";
function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date.slice(0, 10) + 'T00:00:00Z'));
}

function linkDetails(link: Partial<AlbumLink>, parsed = webUrl(link.url)) {
  const domain = parsed?.hostname.replace(/^www\./, '') ?? '';
  const apple = domain === 'music.apple.com';
  const youtube = ['youtube.com', 'music.youtube.com', 'm.youtube.com', 'youtu.be'].includes(domain);
  const label = apple ? 'Apple Music' : youtube ? 'YouTube' : domain;
  return { name: link.label || label, icon: apple ? 'music' : youtube ? 'play' : 'link' };
}

function externalLinks(links: AlbumLink[]) {
  const rows = links.flatMap((link) => {
    const parsed = webUrl(link.url);
    if (!parsed) return [];
    const info = linkDetails(link, parsed);
    return [`<a class="external-link" href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer"><span>${icon(info.icon, 19)} ${escapeHtml(info.name)}</span>${icon('external', 18)}<span class="sr-only"> (opens in a new tab)</span></a>`];
  });
  return rows.length ? `<div class="external-links">${rows.join('')}</div>` : '<p class="muted">No music links added.</p>';
}

function historyCard(listen: ListeningEntry) {
  return `<article class="listen-card"><div class="listen-top"><time datetime="${listen.listenedAt}">${formatDate(listen.listenedAt)}</time>${renderRating(listen.rating)}</div>
    ${listen.notes ? `<p class="listen-notes">${escapeHtml(listen.notes)}</p>` : ''}
    ${listen.instruments?.length ? `<div class="tags">${chips(listen.instruments)}</div>` : ''}
  </article>`;
}

export function renderAlbumDetailView(album: Album) {
  const listens = orderedListens(album);
  return `<div class="detail">
    <a class="back-link" href="#">${icon('back', 17)} Back to library</a>
    <section class="album-hero" aria-labelledby="page-title">
      ${cover(album, true)}
      <div class="album-hero-info"><p class="eyebrow"><span></span> ALBUM DETAILS</p>
        <h1 id="page-title">${escapeHtml(album.title)}</h1>
        <p class="detail-artist">${escapeHtml(artistText(album))}</p>
        ${album.releaseYear || album.recordLabel ? `<p class="detail-meta">${[album.releaseYear, album.recordLabel].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}
        ${album.genres.length ? `<div class="tags">${chips(album.genres.map(genre => genre.name))}</div>` : ''}
        <div class="detail-rating">${renderRating(listens[0]?.rating)}${listens[0] ? `<span class="muted">Latest rating</span>` : ''}</div>
        <div class="detail-actions"><button type="button" class="button primary" data-action="listen">${icon('plus', 17)} Log a listen</button><button type="button" class="button secondary" data-action="edit">${icon('edit', 17)} Edit album</button></div>
      </div>
    </section>
    <div class="detail-body">
      <section aria-labelledby="history-title"><div class="detail-heading">${icon('history', 21)}<h2 id="history-title">Listening history</h2><span class="count-pill">${listens.length}</span></div>
        ${listens.length ? listens.map(historyCard).join('') : '<div class="empty detail-empty"><h3>No listens logged yet</h3><p>Add a rating and notes after your next listen.</p></div>'}
      </section>
      <section aria-labelledby="links-title"><div class="detail-heading">${icon('link', 21)}<h2 id="links-title">Music links</h2></div>${externalLinks(album.links)}</section>
    </div>
  </div>`;
}

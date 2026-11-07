import { genreUrl } from "../app/genres";
import { artistUrl, roleLabel } from "./artistsView";
import type { Album, AlbumLink, ListeningEntry } from "../types/albums";
import { cover, orderedListens, webUrl } from "../components/presentation";
import { escapeHtml } from "../components/html";
import { instrumentUrl } from "../app/instruments";
import { icon } from "../components/icons";
import { renderRating } from "../components/rating";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date.slice(0, 10) + "T00:00:00Z"));
}

function linkDetails(link: Partial<AlbumLink>, parsed = webUrl(link.url)) {
  const domain = parsed?.hostname.replace(/^www\./, "") ?? "";
  const apple = domain === "music.apple.com";
  const youtube = [
    "youtube.com",
    "music.youtube.com",
    "m.youtube.com",
    "youtu.be",
  ].includes(domain);
  const label = apple ? "Apple Music" : youtube ? "YouTube" : domain;
  return {
    name: link.label || label,
    icon: apple ? "music" : youtube ? "play" : "link",
  };
}

function externalLinks(links: AlbumLink[]) {
  const rows = links.flatMap((link) => {
    const parsed = webUrl(link.url);
    if (!parsed) return [];
    const info = linkDetails(link, parsed);
    return [
      /* HTML */ `<a
        class="external-link"
        href="${escapeHtml(parsed.href)}"
        target="_blank"
        rel="noopener noreferrer"
        ><span>${icon(info.icon, 19)} ${escapeHtml(info.name)}</span
        >${icon("external", 18)}<span class="sr-only">
          (opens in a new tab)</span
        ></a
      >`,
    ];
  });
  return rows.length
    ? /* HTML */ `<div class="external-links">${rows.join("")}</div>`
    : '<p class="muted">No music links added.</p>';
}

function historyCard(listen: ListeningEntry) {
  return /* HTML */ `<button
    type="button"
    class="listen-card"
    data-action="edit-listen"
    data-id="${escapeHtml(listen.id)}"
    aria-label="Edit listen from ${formatDate(listen.listenedAt)}"
  >
    <span class="listen-top">
      <time datetime="${listen.listenedAt}"
        >${formatDate(listen.listenedAt)}</time
      >${renderRating(listen.rating)}
    </span>
    ${listen.notes ? /* HTML */ `<span class="listen-notes">${escapeHtml(listen.notes)}</span>` : ""}
    <span class="listen-edit">${icon("edit", 14)} Edit listen</span>
  </button>`;
}

export function renderAlbumDetailView(album: Album) {
  const listens = orderedListens(album);
  return /* HTML */ `<div class="detail">
    <a class="back-link" href="#">${icon("back", 17)} Back to library</a>
    <section class="album-hero" aria-labelledby="page-title">
      ${cover(album, true)}
      <div class="album-hero-info">
        <p class="eyebrow"><span></span> ALBUM DETAILS</p>
        <h1 id="page-title">${escapeHtml(album.title)}</h1>
        <p class="detail-artist">
          ${
            album.artists.length
              ? [...album.artists]
                  .sort((a, b) => a.position - b.position)
                  .map(
                    (artist) =>
                      `<a href="${artistUrl(artist.id)}">${escapeHtml(artist.name)}</a><span class="artist-role-label">${roleLabel(artist.role)}</span>`,
                  )
                  .join(" · ")
              : "Unknown artist"
          }
        </p>
        ${album.releaseYear || album.recordLabel ? /* HTML */ `<p class="detail-meta">${[album.releaseYear, album.recordLabel].filter(Boolean).map(escapeHtml).join(" · ")}</p>` : ""}
        ${album.genres.length ? /* HTML */ `<div class="tags">${album.genres.map((g) => `<a class="chip" href="${genreUrl(g.id)}">${escapeHtml(g.name)}${g.isPrimary ? " · Primary" : ""}</a>`).join("")}</div>` : ""}
        <div class="detail-rating">
          ${renderRating(listens[0]?.rating)}${listens[0] ? /* HTML */ `<span class="muted">Latest rating</span>` : ""}
        </div>
        <div class="detail-actions">
          <button type="button" class="button primary" data-action="listen">
            ${icon("plus", 17)} Log a listen</button
          ><button type="button" class="button secondary" data-action="edit">
            ${icon("edit", 17)} Edit album
          </button>
        </div>
      </div>
    </section>
    <div class="detail-body">
      <section aria-labelledby="history-title">
        <div class="detail-heading">
          ${icon("history", 21)}
          <h2 id="history-title">Listening history</h2>
          <span class="count-pill">${listens.length}</span>
        </div>
        ${listens.length ? listens.map(historyCard).join("") : '<div class="empty detail-empty"><h3>No listens logged yet</h3><p>Add a rating and notes after your next listen.</p></div>'}
      </section>
      <div class="album-sidebar">
        <section aria-labelledby="instruments-title">
          <div class="detail-heading">
            <h2 id="instruments-title">Instrumentation</h2>
          </div>
          ${album.instruments.length ? `<div class="tags">${album.instruments.map((item) => `<a class="chip" href="${instrumentUrl(item.id)}">${escapeHtml(item.name)}</a>`).join("")}</div>` : '<p class="muted">No instruments added yet. Add them whenever you know what you heard.</p>'}
          <button
            type="button"
            class="button secondary compact"
            data-action="edit-instruments"
          >
            ${icon("edit", 16)} Edit instruments
          </button>
        </section>
        <section aria-labelledby="links-title">
          <div class="detail-heading">
            ${icon("link", 21)}
            <h2 id="links-title">Music links</h2>
          </div>
          ${externalLinks(album.links)}
        </section>
      </div>
    </div>
  </div>`;
}

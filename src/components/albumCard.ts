import type { Album } from "../types/albums";
import { escapeHtml } from "./html";
import { renderRating } from "./rating";

function getInitials(title: string): string {
    const words = title
        .split(/\s+/)
        .filter((word) => !/^(a|an|the|of)$/i.test(word));

    if (words.length === 0) {
        return "?";
    }

    if (words.length === 1) {
        return words[0].slice(0, 1).toUpperCase();
    }

    return (
        words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)
    ).toUpperCase();
}

function getArtistLine(album: Album): string {
    const creditedArtists = album.artists.filter(
        (artist) => artist.role !== "other"
    );
    const artists = (creditedArtists.length
        ? creditedArtists
        : album.artists
    )
        .slice()
        .sort((a, b) => a.position - b.position);

    if (artists.length === 0) {
        return "Unknown artist";
    }

    return artists.map((artist) => artist.name).join(" · ");
}

function getLatestRating(album: Album): number | null {
    const latest = album.listeningEntries
        .slice()
        .sort(
            (a, b) =>
                Date.parse(b.listenedAt) - Date.parse(a.listenedAt)
        )[0];

    return latest?.rating ?? null;
}

function renderArtwork(album: Album): string {
    if (!album.artworkUrl) {
        return `
            <div class="album-card__artwork-placeholder" aria-hidden="true">
                <span>${escapeHtml(getInitials(album.title))}</span>
            </div>
        `;
    }

    return `
        <img
            class="album-card__artwork-image"
            src="${escapeHtml(album.artworkUrl)}"
            alt="Cover artwork for ${escapeHtml(album.title)}"
            loading="lazy"
            decoding="async"
        />
    `;
}

export function renderAlbumCard(album: Album): string {
    const year = album.releaseYear ?? "Year unknown";

    return `
        <article class="album-card" data-album-id="${escapeHtml(album.id)}">
            <a
                class="album-card__link"
                href="#${escapeHtml(album.id)}"
                data-action="open-album"
                data-album-id="${escapeHtml(album.id)}"
            >
                <div class="album-card__artwork">
                    ${renderArtwork(album)}
                </div>
                <div class="album-card__body">
                    <h2 class="album-card__title">
                        ${escapeHtml(album.title)}
                    </h2>
                    <p class="album-card__artist">
                        ${escapeHtml(getArtistLine(album))}
                    </p>
                    <div class="album-card__meta">
                        <span class="album-card__year">${year}</span>
                        ${renderRating(getLatestRating(album))}
                    </div>
                </div>
            </a>
        </article>
    `;
}

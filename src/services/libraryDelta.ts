import type { LibraryData } from "../types/library";

type Row = Record<string, string | number | boolean | null>;
const keys: Record<string, string[]> = {
  artists: ["id"],
  genres: ["id"],
  instruments: ["id"],
  albums: ["id"],
  instrument_categories: ["instrument_id", "category"],
  album_artists: ["album_id", "artist_id"],
  album_genres: ["album_id", "genre_id"],
  album_instruments: ["album_id", "instrument_id"],
  album_links: ["id"],
  listening_entries: ["id"],
};

function rows(library: LibraryData): Record<string, Row[]> {
  const result: Record<string, Row[]> = Object.fromEntries(
    Object.keys(keys).map((table) => [table, []]),
  );
  result.artists = library.artists.map((a) => ({
    id: a.id,
    name: a.name,
    sort_name: a.sortName || null,
    photo_url: a.photoUrl || null,
    country: a.country || null,
    musicbrainz_id: a.musicbrainzId || null,
  }));
  result.genres = library.genres.map((g) => ({
    id: g.id,
    name: g.name,
    parent_genre_id: g.parentGenreId,
  }));
  result.instruments = library.instruments.map((i) => ({
    id: i.id,
    name: i.name,
    image_url: i.imageUrl || null,
  }));
  result.instrument_categories = library.instruments.flatMap((i) =>
    i.categories.map((category) => ({ instrument_id: i.id, category })),
  );
  for (const a of library.albums) {
    result.albums.push({
      id: a.id,
      title: a.title,
      record_label: a.recordLabel || null,
      sort_title: a.sortTitle || null,
      release_year: a.releaseYear,
      artwork_url: a.artworkUrl || null,
      musicbrainz_release_group_id: a.musicbrainzReleaseGroupId || null,
    });
    result.album_artists.push(
      ...a.artists.map((c) => ({
        album_id: a.id,
        artist_id: c.id,
        role: c.role,
        position: c.position,
      })),
    );
    result.album_genres.push(
      ...a.genres.map((g) => ({
        album_id: a.id,
        genre_id: g.id,
        is_primary: g.isPrimary,
      })),
    );
    result.album_instruments.push(
      ...a.instruments.map((i) => ({
        album_id: a.id,
        instrument_id: i.id,
        notes: i.notes || null,
      })),
    );
    result.album_links.push(
      ...a.links.map((l) => ({
        id: l.id,
        album_id: a.id,
        url: l.url,
        label: l.label || null,
      })),
    );
    result.listening_entries.push(
      ...a.listeningEntries.map((e) => ({
        id: e.id,
        album_id: a.id,
        rating: e.rating,
        listened_at: new Date(e.listenedAt).toISOString(),
        notes: e.notes || null,
      })),
    );
  }
  return result;
}

export function libraryDelta(before: LibraryData, next: LibraryData) {
  const previous = rows(before);
  const current = rows(next);
  const changes: Record<string, { saved: Row[]; deleted: Row[] }> = {};
  for (const [table, columns] of Object.entries(keys)) {
    const key = (row: Row) =>
      JSON.stringify(columns.map((column) => row[column]));
    const old = new Map(previous[table].map((row) => [key(row), row]));
    const updated = new Map(current[table].map((row) => [key(row), row]));
    const saved = current[table].filter(
      (row) => JSON.stringify(old.get(key(row))) !== JSON.stringify(row),
    );
    // Replace changed association rows to allow credit reordering and primary
    // genre changes without transient uniqueness violations.
    const replace =
      table.startsWith("album_") || table === "instrument_categories";
    changes[table] = {
      saved,
      deleted: previous[table].filter(
        (row) =>
          !updated.has(key(row)) ||
          (replace && saved.some((item) => key(item) === key(row))),
      ),
    };
  }
  return changes;
}

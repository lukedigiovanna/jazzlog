import type {
  Album,
  AlbumInstrument,
  Instrument,
  Artist,
  Genre,
} from "../types/albums";
import { mockAlbums } from "../data/mockData";
import { instrumentCategories } from "./instruments";

// Version the demo separately from both the standalone prototype and future account data.
const storageKey = "jazzlog-demo-v1";
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const optionalString = (value: unknown) =>
  value == null || typeof value === "string";

// Browser storage may be stale or manually changed. Reject unusable snapshots.
function isAlbum(value: unknown): value is Album {
  if (!object(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    optionalString(value.sortTitle) &&
    optionalString(value.artworkUrl) &&
    optionalString(value.sourceId) &&
    optionalString(value.recordLabel) &&
    optionalString(value.musicbrainzReleaseGroupId) &&
    (value.releaseYear === null ||
      (typeof value.releaseYear === "number" &&
        Number.isInteger(value.releaseYear))) &&
    Array.isArray(value.artists) &&
    value.artists.every(
      (artist) => object(artist) && typeof artist.name === "string",
    ) &&
    Array.isArray(value.genres) &&
    value.genres.every(
      (genre) => object(genre) && typeof genre.name === "string",
    ) &&
    Array.isArray(value.instruments) &&
    value.instruments.every(
      (item) =>
        object(item) &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        optionalString(item.notes) &&
        strings(item.categories),
    ) &&
    Array.isArray(value.links) &&
    value.links.every(
      (link) =>
        object(link) &&
        typeof link.url === "string" &&
        optionalString(link.label),
    ) &&
    Array.isArray(value.listeningEntries) &&
    value.listeningEntries.every(
      (entry) =>
        object(entry) &&
        typeof entry.listenedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(entry.listenedAt) &&
        Number.isFinite(Date.parse(entry.listenedAt)) &&
        typeof entry.rating === "number" &&
        Number.isInteger(entry.rating) &&
        entry.rating >= 1 &&
        entry.rating <= 10 &&
        optionalString(entry.notes),
    )
  );
}

export function readAlbums(): Album[] {
  try {
    const snapshot: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    );
    const saved =
      object(snapshot) && !Array.isArray(snapshot) ? snapshot.albums : snapshot;
    if (Array.isArray(saved) && saved.every(isAlbum)) {
      // Preserve instrumentation entered in older demo versions, at album scope.
      const known = new Map(
        saved
          .flatMap((album) => album.instruments)
          .map((item) => [item.name.toLowerCase(), item]),
      );
      return saved.map((album) => {
        const instruments = new Map(
          album.instruments.map((item) => [item.id, item]),
        );
        const listeningEntries = album.listeningEntries.map((entry) => {
          const { instruments: legacy, ...listen } = entry as typeof entry & {
            instruments?: string[];
          };
          if (strings(legacy))
            for (const name of legacy) {
              const trimmed = name.trim();
              if (!trimmed) continue;
              const key = trimmed.toLowerCase();
              const item: AlbumInstrument = known.get(key) ?? {
                id: crypto.randomUUID(),
                name: trimmed,
                notes: null,
                categories: [],
              };
              known.set(key, item);
              instruments.set(item.id, item);
            }
          return listen;
        });
        return {
          ...album,
          instruments: [...instruments.values()],
          listeningEntries,
        };
      });
    }
  } catch {
    // Keep the fixture library usable if storage is blocked or malformed.
  }
  return structuredClone(mockAlbums);
}

export function readInstrumentCatalog(albums: Album[]): Instrument[] {
  const linked = albums
    .flatMap((album) => album.instruments)
    .map(({ id, name, categories }) => ({ id, name, categories }));
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    );
    if (
      object(saved) &&
      Array.isArray(saved.instruments) &&
      saved.instruments.every(
        (item) =>
          object(item) &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          strings(item.categories) &&
          item.categories.every((category) =>
            instrumentCategories.some((valid) => valid === category),
          ),
      )
    ) {
      return [
        ...new Map(
          linked
            .concat(saved.instruments as Instrument[])
            .map((item) => [item.id, item]),
        ).values(),
      ];
    }
  } catch {
    // Existing albums still supply a catalog when browser storage is unavailable.
  }
  return [...new Map(linked.map((item) => [item.id, item])).values()];
}

export function saveAlbums(
  albums: Album[],
  instruments: Instrument[],
  artists: Artist[],
  genres: Genre[],
): boolean {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ albums, instruments, artists, genres }),
    );
    return true;
  } catch {
    return false;
  }
}

// Upgrade older demos by sharing artist identities across album credits.
export function readArtistCatalog(albums: Album[]): Artist[] {
  let saved: Artist[] = [];
  try {
    const snapshot = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (
      Array.isArray(snapshot?.artists) &&
      snapshot.artists.every(
        (item: unknown) =>
          object(item) &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          optionalString(item.sortName) &&
          optionalString(item.country) &&
          optionalString(item.musicbrainzId),
      )
    )
      saved = snapshot.artists;
  } catch {
    /* Albums still supply the catalog. */
  }
  const catalog = new Map(saved.map((item) => [item.id, item]));
  for (const album of albums)
    for (const credit of album.artists) {
      const existing =
        catalog.get(credit.id) ??
        [...catalog.values()].find((item) =>
          credit.musicbrainzId
            ? item.musicbrainzId === credit.musicbrainzId
            : item.name.toLowerCase() === credit.name.toLowerCase(),
        );
      const artist = existing ?? {
        id: credit.id,
        name: credit.name,
        sortName: credit.sortName,
        country: credit.country,
        musicbrainzId: credit.musicbrainzId,
      };
      catalog.set(artist.id, artist);
      Object.assign(credit, artist);
    }
  return [...catalog.values()];
}

export function readGenreCatalog(albums: Album[]): Genre[] {
  let saved: Genre[] = [];
  try {
    const snapshot = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (
      Array.isArray(snapshot?.genres) &&
      snapshot.genres.every(
        (g: unknown) =>
          object(g) &&
          typeof g.id === "string" &&
          typeof g.name === "string" &&
          optionalString(g.parentGenreId),
      )
    )
      saved = snapshot.genres;
  } catch {
    /* Albums supply the catalog. */
  }
  const catalog = new Map(saved.map((g) => [g.id, g]));
  for (const album of albums)
    for (const credit of album.genres) {
      const existing = [...catalog.values()].find(
        (g) => g.name.toLowerCase() === credit.name.toLowerCase(),
      );
      const genre = existing ?? {
        id: credit.id,
        name: credit.name,
        parentGenreId: credit.parentGenreId ?? null,
      };
      catalog.set(genre.id, genre);
      Object.assign(credit, genre);
    }
  return [...catalog.values()];
}

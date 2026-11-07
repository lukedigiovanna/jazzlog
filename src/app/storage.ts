import type { Album } from "../types/albums";
import { mockAlbums } from "../data/mockData";

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
        optionalString(entry.notes) &&
        (entry.instruments === undefined || strings(entry.instruments)),
    )
  );
}

export function readAlbums(): Album[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    );
    if (Array.isArray(saved) && saved.every(isAlbum)) return saved;
  } catch {
    // Keep the fixture library usable if storage is blocked or malformed.
  }
  return structuredClone(mockAlbums);
}

export function saveAlbums(albums: Album[]): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(albums));
    return true;
  } catch {
    return false;
  }
}

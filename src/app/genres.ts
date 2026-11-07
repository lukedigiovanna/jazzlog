import type { Album, AlbumGenre, Genre } from "../types/albums";
export const genreUrl = (id: string) => `#genre/${encodeURIComponent(id)}`;
export function ancestors(id: string, genres: Genre[]): Genre[] {
  const result: Genre[] = [];
  const seen = new Set([id]);
  let parent = genres.find((g) => g.id === id)?.parentGenreId;
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const item = genres.find((g) => g.id === parent);
    if (!item) break;
    result.unshift(item);
    parent = item.parentGenreId;
  }
  return result;
}
export const includesGenre = (album: Album, id: string, genres: Genre[]) =>
  album.genres.some(
    (g) => g.id === id || ancestors(g.id, genres).some((p) => p.id === id),
  );
export function normalizeGenres(
  selected: AlbumGenre[],
  genres: Genre[],
): AlbumGenre[] {
  const unique = [...new Map(selected.map((g) => [g.id, g])).values()];
  const kept = unique.filter(
    (g) =>
      !unique.some((other) =>
        ancestors(other.id, genres).some((p) => p.id === g.id),
      ),
  );
  const primary = unique.find((g) => g.isPrimary);
  const primaryId =
    primary &&
    (
      kept.find((g) => g.id === primary.id) ??
      kept.find((g) => ancestors(g.id, genres).some((p) => p.id === primary.id))
    )?.id;
  return kept.map((g) => ({
    ...genres.find((item) => item.id === g.id)!,
    isPrimary: g.id === primaryId,
  }));
}
export function syncAlbumGenres(albums: Album[], genres: Genre[]) {
  for (const album of albums)
    album.genres = normalizeGenres(album.genres, genres);
}

import type { Artist, AlbumArtist } from "../types/albums";

export const artistNameKey = (name: string) =>
  name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

export function findArtist(
  catalog: Artist[],
  credit: Artist,
): Artist | undefined {
  return (
    catalog.find((item) => item.id === credit.id) ??
    (credit.musicbrainzId
      ? catalog.find((item) => item.musicbrainzId === credit.musicbrainzId)
      : undefined) ??
    catalog.find(
      (item) =>
        artistNameKey(item.name) === artistNameKey(credit.name) &&
        !(
          item.musicbrainzId &&
          credit.musicbrainzId &&
          item.musicbrainzId !== credit.musicbrainzId
        ),
    )
  );
}

// Picker options are drafts. Only selected credits may extend the catalog.
export function commitAlbumArtists(catalog: Artist[], selected: AlbumArtist[]) {
  const artists = structuredClone(catalog);
  const credits: AlbumArtist[] = [];
  for (const credit of selected) {
    let artist = findArtist(artists, credit);
    if (!artist) {
      const { role: _role, position: _position, ...identity } = credit;
      artist = { ...identity };
      artists.push(artist);
    }
    if (!credits.some((item) => item.id === artist.id))
      credits.push({ ...credit, ...artist, position: credits.length });
  }
  return { artists, credits };
}

import type { Enums } from "./database.types";

export type ArtistRole = Enums<"artist_role">;
export type InstrumentCategory = Enums<"instrument_category">;

// A user's complete album, including the records joined to it in the database.
// This is the shape album-facing application code should consume; it is
// intentionally not a raw database row.
export interface Album {
  id: string;
  title: string;
  sortTitle: string | null;
  releaseYear: number | null;
  artworkUrl: string | null;
  musicbrainzReleaseGroupId: string | null;
  createdAt: string;
  updatedAt: string;

  artists: AlbumArtist[];
  genres: AlbumGenre[];
  instruments: AlbumInstrument[];
  links: AlbumLink[];
  listeningEntries: ListeningEntry[];
}

// An artist credit on an album, combining the artist record with the role and
// position stored on the album/artist link.
export interface AlbumArtist {
  id: string;
  musicbrainzId: string | null;
  name: string;
  sortName: string | null;
  country: string | null;
  role: ArtistRole;
  position: number;
}

// A genre attached to an album. At most one genre per album is primary.
export interface AlbumGenre {
  id: string;
  name: string;
  parentGenreId: string | null;
  isPrimary: boolean;
}

// An instrument associated with an album, including its categories and any
// album-specific notes.
export interface AlbumInstrument {
  id: string;
  name: string;
  notes: string | null;
  categories: InstrumentCategory[];
}

// A user-supplied link attached to an album.
export interface AlbumLink {
  id: string;
  url: string;
  label: string | null;
}

// A single listening event for an album.
export interface ListeningEntry {
  id: string;
  rating: number;
  listenedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// A release-group search result before the user has selected and saved it.
// It carries MusicBrainz identifiers and artist credits that are resolved into
// local artists when the album is created.
export interface AlbumCandidate {
  musicbrainzId: string;
  title: string;
  releaseYear: number | null;
  primaryType: string | null;

  artists: AlbumArtistCandidate[];
}

export interface AlbumArtistCandidate {
  musicbrainzId: string;
  name: string;
  creditedName: string;
  joinPhrase: string;
  position: number;
}

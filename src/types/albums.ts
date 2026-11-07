import type { Enums } from "./database.types";

export type ArtistRole = Enums<"artist_role">;
export type InstrumentCategory = Enums<"instrument_category">;

// A user's complete album, including the records joined to it in the database.
// This is the shape album-facing application code should consume; it is
// intentionally not a raw database row.
export interface Album {
  id: string;
  title: string;
  /** Browser demo provenance; not a MusicBrainz identifier. */
  sourceId?: string;
  recordLabel?: string;
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
  /** Optional demo instrumentation for this particular listen. */
  instruments?: string[];
  rating: number;
  listenedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Core album fields accepted when creating an album. Related records such as
// artists, genres, and instruments are managed separately.
export interface NewAlbum {
  title: string;
  sortTitle?: string | null;
  releaseYear?: number | null;
  artworkUrl?: string | null;
  musicbrainzReleaseGroupId?: string | null;
}

// Core album fields accepted when editing an album.
export type AlbumUpdates = Partial<NewAlbum>;

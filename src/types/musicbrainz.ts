// MusicBrainz-specific API response types. These mirror only the fields we
// consume from the external API and should not leak into the rest of the app.

export interface MusicBrainzArtistCredit {
  name: string;
  joinphrase?: string;
  artist: {
    id: string;
    name: string;
  };
}

export interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  "first-release-date"?: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "artist-credit"?: MusicBrainzArtistCredit[];
}

export interface MusicBrainzSearchResponse {
  count: number;
  offset: number;
  "release-groups": MusicBrainzReleaseGroup[];
}

// A normalized MusicBrainz search result before the user has selected and
// saved it. It carries MusicBrainz identifiers and artist credits that are
// resolved into local artists when the album is created.
export interface MusicBrainzAlbumCandidate {
  musicbrainzId: string;
  title: string;
  releaseYear: number | null;
  primaryType: string | null;

  artists: MusicBrainzAlbumArtistCandidate[];
}

export interface MusicBrainzAlbumArtistCandidate {
  musicbrainzId: string;
  name: string;
  creditedName: string;
  joinPhrase: string;
  position: number;
}

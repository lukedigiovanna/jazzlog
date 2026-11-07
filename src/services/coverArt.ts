const COVER_ART_BASE_URL = "https://coverartarchive.org/release-group";

export function getReleaseGroupArtworkUrl(
  musicbrainzReleaseGroupId: string,
): string {
  return `${COVER_ART_BASE_URL}/${musicbrainzReleaseGroupId}/front-250`;
}

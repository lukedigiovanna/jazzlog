export interface AppleMusicAlbum {
  id: number;
  title: string;
  artist: string;
  year: number | null;
  url: string;
}
const key = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function exactAppleMusicMatch(
  results: AppleMusicAlbum[],
  title: string,
  artists: string[],
) {
  const exact = results.filter(
    (item) =>
      key(item.title) === key(title) &&
      artists.some((artist) => key(item.artist) === key(artist)),
  );
  return exact.length === 1 ? exact[0] : undefined;
}
export function relevantAppleMusicAlbums(
  results: AppleMusicAlbum[],
  title: string,
  artists: string[],
) {
  const words = (value: string) =>
    new Set(key(value).split(" ").filter(Boolean));
  const overlap = (a: string, b: string) => {
    const left = words(a),
      right = words(b);
    return (
      [...left].filter((word) => right.has(word)).length /
      Math.max(left.size, 1)
    );
  };
  return results
    .map((item) => ({
      item,
      titleScore: overlap(title, item.title),
      artistScore: Math.max(
        ...artists.map((artist) => overlap(artist, item.artist)),
      ),
    }))
    .filter(
      ({ titleScore, artistScore }) => titleScore >= 0.5 && artistScore >= 0.5,
    )
    .sort(
      (a, b) => b.titleScore + b.artistScore - (a.titleScore + a.artistScore),
    )
    .map(({ item }) => item);
}
const cache = new Map<string, Promise<AppleMusicAlbum[]>>();
export async function findAppleMusicAlbums(
  title: string,
  artist: string,
): Promise<AppleMusicAlbum[]> {
  const params = new URLSearchParams({ title, artist });
  const query = params.toString();
  if (!cache.has(query)) {
    const search = new URL("https://itunes.apple.com/search");
    search.search = new URLSearchParams({
      term: `${artist} ${title}`,
      country: "US",
      media: "music",
      entity: "album",
      limit: "12",
    }).toString();
    const pending = fetch(search, {
      signal: AbortSignal.timeout(10000),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            `Apple Music search failed (${response.status}). Please try again.`,
          );
        const data = await response.json();
        if (!Array.isArray(data.results))
          throw new Error(
            "Apple Music returned an invalid response. Please try again.",
          );
        const candidates = (
          data.results as {
            collectionId: number;
            collectionName: string;
            artistName: string;
            releaseDate?: string;
          }[]
        )
          .filter(
            (item) =>
              Number.isSafeInteger(item.collectionId) &&
              item.collectionName &&
              item.artistName,
          )
          .slice(0, 8);
        // A store listing alone does not establish an Apple Music destination.
        const results = await Promise.all(
          candidates.map(async (item): Promise<AppleMusicAlbum | null> => {
            const url = `https://music.apple.com/us/album/${item.collectionId}`;
            const embed = new URL("https://music.apple.com/api/oembed");
            embed.searchParams.set("url", url);
            try {
              const checked = await fetch(embed, {
                signal: AbortSignal.timeout(6000),
              });
              if (!checked.ok) return null;
              const metadata = await checked.json();
              if (
                !metadata.title ||
                !metadata.html?.includes("embed.music.apple.com")
              )
                return null;
              return {
                id: item.collectionId,
                title: item.collectionName,
                artist: item.artistName,
                year: Number(item.releaseDate?.slice(0, 4)) || null,
                url,
              };
            } catch {
              return null;
            }
          }),
        );
        return results.filter((item): item is AppleMusicAlbum => item !== null);
      })
      .catch((error) => {
        cache.delete(query);
        throw error;
      });
    if (cache.size >= 30) cache.delete(cache.keys().next().value!);
    cache.set(query, pending);
  }
  return cache.get(query)!;
}

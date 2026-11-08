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
    const pending = fetch(`/api/apple-music?${query}`, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.headers.get("content-type")?.includes("application/json"))
          throw new Error(
            "The Apple Music API returned a webpage instead of album results. Restart the local server, or deploy the updated Worker if using the hosted app.",
          );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Apple Music lookup failed.");
        if (!Array.isArray(data.results))
          throw new Error(
            "Apple Music returned an invalid response. Please try again.",
          );
        return data.results as AppleMusicAlbum[];
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

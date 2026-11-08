// Keep external catalog access on the server: no browser CORS dependencies.
export async function appleMusicLookup(request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title")?.trim();
  const artist = url.searchParams.get("artist")?.trim();
  if (!title || !artist || title.length > 150 || artist.length > 300)
    return Response.json(
      { error: "Enter an album title and artist." },
      { status: 400 },
    );
  try {
    const search = new URL("https://itunes.apple.com/search");
    search.search = new URLSearchParams({
      term: `${artist} ${title}`,
      country: "US",
      media: "music",
      entity: "album",
      limit: "12",
    });
    const response = await fetch(search, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Catalog unavailable");
    const data = await response.json();
    const candidates = (data.results ?? [])
      .filter(
        (item) =>
          Number.isSafeInteger(item.collectionId) &&
          item.collectionName &&
          item.artistName,
      )
      .slice(0, 8);
    // A store listing alone does not establish an Apple Music destination.
    const results = await Promise.all(
      candidates.map(async (item) => {
        const link = `https://music.apple.com/us/album/${item.collectionId}`;
        const embed = new URL("https://music.apple.com/api/oembed");
        embed.searchParams.set("url", link);
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
            url: link,
          };
        } catch {
          return null;
        }
      }),
    );
    return Response.json(
      { results: results.filter(Boolean) },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "Apple Music lookup is unavailable. You can still save the album or add a link manually.",
      },
      { status: 502 },
    );
  }
}

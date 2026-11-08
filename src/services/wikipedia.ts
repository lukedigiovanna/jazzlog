// Both a pasted URL and a future search result resolve through this reference.
export interface WikipediaArticle {
  language: string;
  title: string;
}
export interface WikipediaImport {
  title: string;
  artworkUrl: string | null;
  url: string;
  releaseYear: number | null;
  artists: { name: string; musicbrainzId: string | null }[];
}

export function parseWikipediaUrl(value: string): WikipediaArticle {
  const url = new URL(value);
  const match = /^([a-z-]+)\.(?:m\.)?wikipedia\.org$/.exec(url.hostname);
  const title = url.pathname.startsWith("/wiki/")
    ? decodeURIComponent(url.pathname.slice(6)).replaceAll("_", " ")
    : url.pathname === "/w/index.php"
      ? url.searchParams.get("title")
      : null;
  if (
    !match ||
    !["https:", "http:"].includes(url.protocol) ||
    !title ||
    title.includes(":")
  )
    throw new Error(
      "Paste a Wikipedia article URL, such as https://en.wikipedia.org/wiki/Kind_of_Blue.",
    );
  return { language: match[1], title };
}

async function query<T>(
  host: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params,
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok)
    throw new Error(
      `Wikipedia request failed (${response.status}). Please try again.`,
    );
  const result = await response.json();
  if (result.error)
    throw new Error(result.error.info || "Wikipedia request failed.");
  return result;
}

type Claim = { rank?: string; mainsnak: { datavalue?: { value: unknown } } };
type Entity = {
  labels?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
};
const values = (entity: Entity, property: string) =>
  (entity.claims?.[property] ?? [])
    .filter((claim) => claim.rank !== "deprecated")
    .map((claim) => claim.mainsnak.datavalue?.value);
const stringValue = (entity: Entity, property: string) =>
  values(entity, property).find(
    (value): value is string => typeof value === "string",
  );

export async function resolveWikipediaArticle(
  article: WikipediaArticle,
): Promise<WikipediaImport> {
  if (!/^[a-z-]+$/.test(article.language) || !article.title)
    throw new Error("Invalid Wikipedia article.");
  const response = await query<{
    query?: {
      pages: {
        title: string;
        missing?: boolean;
        pageprops?: { wikibase_item?: string; disambiguation?: string };
        thumbnail?: { source: string };
        original?: { source: string };
      }[];
    };
  }>(`${article.language}.wikipedia.org`, {
    action: "query",
    titles: article.title,
    redirects: "1",
    prop: "pageimages|pageprops",
    piprop: "thumbnail|original",
    pithumbsize: "600",
    pilicense: "any",
  });
  const page = response.query?.pages[0];
  if (!page || page.missing)
    throw new Error("This Wikipedia article could not be found.");
  if (page.pageprops?.disambiguation !== undefined)
    throw new Error(
      "Choose the album’s article rather than a disambiguation page.",
    );
  const result: WikipediaImport = {
    title: page.title.replace(/\s+\([^)]*(?:album|soundtrack)[^)]*\)$/i, ""),
    url: `https://${article.language}.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
    artworkUrl: page.thumbnail?.source ?? page.original?.source ?? null,
    releaseYear: null,
    artists: [],
  };
  const entityId = page.pageprops?.wikibase_item;
  if (!entityId) return result;
  // Metadata is optional: an unavailable Wikidata service must not block artwork import.
  try {
    const data = await query<{ entities: Record<string, Entity> }>(
      "www.wikidata.org",
      { action: "wbgetentities", ids: entityId, props: "claims" },
    );
    const entity = data.entities[entityId];
    const years = values(entity, "P577")
      .map((value) =>
        Number((value as { time?: string })?.time?.match(/^\+(\d{4})-/)?.[1]),
      )
      .filter((year) => year >= 1000 && year <= 9999);
    result.releaseYear = years.length ? Math.min(...years) : null;
    const ids = [
      ...new Set(
        values(entity, "P175")
          .map((value) => (value as { id?: string })?.id)
          .filter((id): id is string => !!id),
      ),
    ];
    if (ids.length) {
      const performers = await query<{ entities: Record<string, Entity> }>(
        "www.wikidata.org",
        {
          action: "wbgetentities",
          ids: ids.join("|"),
          props: "labels|claims",
          languages: `en|${article.language}`,
          languagefallback: "1",
        },
      );
      result.artists = ids.flatMap((id) => {
        const artist = performers.entities[id];
        const name =
          artist.labels?.en?.value ?? artist.labels?.[article.language]?.value;
        const mbid = stringValue(artist, "P434");
        return name
          ? [
              {
                name,
                musicbrainzId:
                  mbid && /^[0-9a-f-]{36}$/i.test(mbid) ? mbid : null,
              },
            ]
          : [];
      });
    }
  } catch {
    /* Review allows missing metadata to be entered manually. */
  }
  return result;
}

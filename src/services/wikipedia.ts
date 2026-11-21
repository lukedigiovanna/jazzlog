import { mergeSuggestions, parseWikipediaPage } from "./wikipediaPage.ts";

// Pasted URLs and search results resolve through the same article reference.
export interface WikipediaArticle {
  language: string;
  title: string;
}
export interface WikipediaAlbumSearchResult {
  id: string;
  article: WikipediaArticle;
  title: string;
  artworkUrl: string | null;
  description: string;
}

export interface WikipediaImport {
  title: string;
  artworkUrl: string | null;
  url: string;
  releaseYear: number | null;
  recordLabel: string | null;
  links: { url: string; label: string }[];
  genreSuggestions: { id: string; name: string }[];
  instrumentSuggestions: { id: string; name: string }[];
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

type Snak = { datavalue?: { value: unknown } };
type Claim = {
  rank?: string;
  mainsnak: Snak;
  qualifiers?: Record<string, Snak[]>;
};
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

interface ArticleResponse {
  query?: {
    pages: {
      title: string;
      missing?: boolean;
      pageprops?: { wikibase_item?: string; disambiguation?: string };
      thumbnail?: { source: string };
      original?: { source: string };
    }[];
  };
}
type AlbumSearchPage = ArticlePage & { index: number; extract?: string };

function articleUrl(article: WikipediaArticle): string {
  return `https://${article.language}.wikipedia.org/wiki/${encodeURIComponent(article.title.replaceAll(" ", "_"))}`;
}

export async function searchWikipediaAlbums(
  search: string,
): Promise<WikipediaAlbumSearchResult[]> {
  const language = "en";
  const response = await query<{ query?: { pages: AlbumSearchPage[] } }>(
    `${language}.wikipedia.org`,
    {
      action: "query",
      generator: "search",
      gsrsearch: `${search} hastemplate:"Infobox album"`,
      gsrnamespace: "0",
      gsrlimit: "10",
      prop: "pageimages|pageprops|extracts",
      piprop: "thumbnail",
      pithumbsize: "120",
      pilicense: "any",
      ppprop: "disambiguation",
      exintro: "1",
      explaintext: "1",
      exchars: "140",
      exlimit: "max",
    },
  );

  return (response.query?.pages ?? [])
    .filter(
      (page) => !page.missing && page.pageprops?.disambiguation === undefined,
    )
    .sort((a, b) => a.index - b.index)
    .map((page) => {
      const article = { language, title: page.title };
      return {
        id: articleUrl(article),
        article,
        title: page.title,
        artworkUrl: page.thumbnail?.source ?? null,
        description: page.extract?.trim() ?? "",
      };
    });
}

interface EntitiesResponse {
  entities: Record<string, Entity>;
}
interface PageResponse {
  parse?: { text?: string };
}
type ArticlePage = NonNullable<ArticleResponse["query"]>["pages"][number];

async function resolveArticlePage(
  article: WikipediaArticle,
): Promise<ArticlePage> {
  const response = await query<ArticleResponse>(
    `${article.language}.wikipedia.org`,
    {
      action: "query",
      titles: article.title,
      redirects: "1",
      prop: "pageimages|pageprops",
      piprop: "thumbnail|original",
      pithumbsize: "600",
      pilicense: "any",
    },
  );
  const page = response.query?.pages[0];
  if (!page || page.missing)
    throw new Error("This Wikipedia article could not be found.");
  if (page.pageprops?.disambiguation !== undefined)
    throw new Error(
      "Choose the album’s article rather than a disambiguation page.",
    );
  return page;
}

export async function resolveWikipediaArticle(
  article: WikipediaArticle,
): Promise<WikipediaImport> {
  if (!/^[a-z-]+$/.test(article.language) || !article.title)
    throw new Error("Invalid Wikipedia article.");
  const page = await resolveArticlePage(article);
  const result: WikipediaImport = {
    title: page.title.replace(/\s+\((?:[^()]*\s)?(?:album|soundtrack)\)$/i, ""),
    url: articleUrl({ ...article, title: page.title }),
    artworkUrl: page.thumbnail?.source ?? page.original?.source ?? null,
    releaseYear: null,
    artists: [],
    recordLabel: null,
    links: [],
    genreSuggestions: [],
    instrumentSuggestions: [],
  };
  await enrichFromWikidata(
    result,
    page.pageprops?.wikibase_item,
    article.language,
  );
  await addPageSuggestions(result, page.title, article.language);
  return result;
}

async function enrichFromWikidata(
  result: WikipediaImport,
  entityId: string | undefined,
  language: string,
): Promise<void> {
  if (entityId) {
    // Metadata is optional: an unavailable Wikidata service must not block artwork import.
    try {
      const data = await query<EntitiesResponse>("www.wikidata.org", {
        action: "wbgetentities",
        ids: entityId,
        props: "claims",
      });
      const entity = data.entities[entityId];
      const years = values(entity, "P577")
        .map((value) =>
          Number((value as { time?: string })?.time?.match(/^\+(\d{4})-/)?.[1]),
        )
        .filter((year) => year >= 1000 && year <= 9999);
      result.releaseYear = years.length ? Math.min(...years) : null;
      for (const [property, label, base] of [
        ["P1954", "Discogs", "https://www.discogs.com/master/"],
        ["P2281", "Apple Music", "https://music.apple.com/album/"],
      ]) {
        const ids = values(entity, property).filter(
          (value): value is string =>
            typeof value === "string" && /^[1-9][0-9]*$/.test(value),
        );
        for (const id of new Set(ids))
          result.links.push({ label, url: `${base}${id}` });
      }
      const entityIds = (property: string) => [
        ...new Set(
          values(entity, property)
            .map((value) => (value as { id?: string })?.id)
            .filter((id): id is string => !!id && /^Q[1-9][0-9]*$/.test(id)),
        ),
      ];
      const artistIds = entityIds("P175");
      const labelIds = entityIds("P264");
      const genreIds = entityIds("P136");
      // Only album-specific instrumentation and performer credit qualifiers count.
      // An artist's general instruments do not establish what they played here.
      const instrumentIds = [
        ...new Set([
          ...entityIds("P870"),
          ...(entity.claims?.P175 ?? [])
            .filter((claim) => claim.rank !== "deprecated")
            .flatMap((claim) => claim.qualifiers?.P1303 ?? [])
            .map((snak) => (snak.datavalue?.value as { id?: string })?.id)
            .filter((id): id is string => !!id && /^Q[1-9][0-9]*$/.test(id)),
        ]),
      ];
      const ids = [
        ...new Set([...artistIds, ...labelIds, ...genreIds, ...instrumentIds]),
      ];
      if (ids.length) {
        const performers = await query<EntitiesResponse>("www.wikidata.org", {
          action: "wbgetentities",
          ids: ids.join("|"),
          props: "labels|claims",
          languages: `en|${language}`,
          languagefallback: "1",
        });
        const nameOf = (item?: Entity) =>
          item?.labels?.en?.value ?? item?.labels?.[language]?.value;
        const suggestions = (ids: string[]) =>
          ids.flatMap((id) => {
            const name = nameOf(performers.entities[id]);
            return name ? [{ id, name }] : [];
          });
        result.genreSuggestions = suggestions(genreIds);
        result.instrumentSuggestions = suggestions(instrumentIds);
        const labels = labelIds
          .map((id) => nameOf(performers.entities[id]))
          .filter((name): name is string => !!name);
        result.recordLabel = [...new Set(labels)].join(", ") || null;
        result.artists = artistIds.flatMap((id) => {
          const artist = performers.entities[id];
          if (!artist) return [];
          const name =
            artist.labels?.en?.value ?? artist.labels?.[language]?.value;
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
  }
}

async function addPageSuggestions(
  result: WikipediaImport,
  title: string,
  language: string,
): Promise<void> {
  // Article details often contain genres and personnel absent from Wikidata.
  // Keep this independent so either metadata source can fail without losing the other.
  try {
    const parsed = await query<PageResponse>(`${language}.wikipedia.org`, {
      action: "parse",
      page: title,
      prop: "text",
      disableeditsection: "1",
      disabletoc: "1",
    });
    if (typeof parsed.parse?.text === "string") {
      const details = parseWikipediaPage(parsed.parse.text, language);
      if (details.title) result.title = details.title;
      result.genreSuggestions = mergeSuggestions(
        result.genreSuggestions,
        details.genres,
      );
      result.instrumentSuggestions = mergeSuggestions(
        result.instrumentSuggestions,
        details.instruments,
      );
    }
  } catch {
    /* Article details are optional, just like Wikidata metadata. */
  }
}

# JazzLog — MusicBrainz Integration

## Objective

Implement a small TypeScript integration layer that allows JazzLog to search MusicBrainz and retrieve album metadata.

We will call MusicBrainz directly from the browser using `fetch()`.

No API key, Worker, proxy, or additional dependency is needed for this initial implementation.

## 1. MusicBrainz API overview

The API base URL is:

```text
https://musicbrainz.org/ws/2/
```

We will primarily use two endpoints.

### Release-group search

```http
GET /release-group?query={query}&fmt=json&limit=10
```

A release group represents the canonical album-level entity we're interested in, rather than an individual pressing or edition.

For example, searching for `Kind of Blue` should return the release group representing the album, rather than separate results for every CD, vinyl, and remaster.

### Release-group lookup

```http
GET /release-group/{MBID}?inc=artist-credits&fmt=json
```

This retrieves additional information about a specific release group using its MusicBrainz ID.

We will implement both endpoints, although search results should provide most of the information we need.

References:
- https://musicbrainz.org/doc/MusicBrainz_API
- https://musicbrainz.org/doc/MusicBrainz_API/Search/ReleaseGroupSearch

## 2. Project structure

Add:

```text
src/
├── services/
│   └── musicbrainz.ts
└── types/
    └── musicbrainz.ts
```

We will keep MusicBrainz-specific types separate from our application's own types.

The service will be responsible for converting raw API responses into normalized JazzLog data.

## 3. Define the API response types

Create `src/types/musicbrainz.ts`.

We only need to model the fields we actually consume.

```typescript
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
```

A few details worth understanding:

- `id` is the MusicBrainz ID (MBID) of the release group.
- `name` on an artist credit is the credited name, which may differ from the artist's canonical name.
- `artist.name` is the canonical artist name.
- `joinphrase` contains text such as `" feat. "` or `" & "` that connects artist credits.
- `first-release-date` is a string, commonly something like `"1959-08-17"`.

We preserve both the credited name and canonical name because they serve different purposes in JazzLog.

## 4. Define JazzLog's normalized album type

In `src/types/album.ts`, define an application-owned representation of a MusicBrainz search result.

```typescript
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
```

This is deliberately not a database record.

It represents an album that the user might want to add to their library.

We keep the MusicBrainz ID so we can associate the album and its artists with their corresponding MusicBrainz entities later.

We also preserve artist ordering and join phrases.

We do not assign `primary`, `featured`, or `other` roles here. MusicBrainz artist credits don't reliably tell us which role we should use in our database. That decision can be handled when the user reviews or edits the album.

## 5. Implement the MusicBrainz request utility

Create `src/services/musicbrainz.ts`.

Start with the imports and constants:

```typescript
import type {
  MusicBrainzReleaseGroup,
  MusicBrainzSearchResponse,
} from "../types/musicbrainz";

import type { AlbumCandidate } from "../types/album";

const API_BASE_URL = "https://musicbrainz.org/ws/2";

const REQUEST_INTERVAL_MS = 1100;
const DEFAULT_SEARCH_LIMIT = 10;
```

### 5.1 Implement a request queue

MusicBrainz permits an average of one request per second per source IP. We will space requests slightly further apart to give ourselves a margin.

Create a simple serialized request queue:

```typescript
let requestQueue: Promise<void> = Promise.resolve();
let nextRequestTime = 0;

function enqueueRequest<T>(
  request: () => Promise<T>
): Promise<T> {
  const result = requestQueue.then(async () => {
    const waitTime = Math.max(
      0,
      nextRequestTime - Date.now()
    );

    if (waitTime > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, waitTime)
      );
    }

    nextRequestTime = Date.now() + REQUEST_INTERVAL_MS;

    return request();
  });

  // Keep the queue usable even if a request fails.
  requestQueue = result.then(
    () => undefined,
    () => undefined
  );

  return result;
}
```

Why do this?

Imagine the application makes three requests almost simultaneously.

Without a queue:

```text
Request A ──────>
Request B ──────>
Request C ──────>
```

With a queue:

```text
Request A ──────>
                1.1 seconds
                Request B ──────>
                                1.1 seconds
                                Request C ──────>
```

This queue coordinates requests made through this module in the current browser tab. It does not coordinate other tabs or devices sharing the same public IP, so we should still avoid unnecessary requests.

### 5.2 Implement the generic request function

Add:

```typescript
export class MusicBrainzApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter: string | null = null
  ) {
    super(message);
    this.name = "MusicBrainzApiError";
  }
}

async function request<T>(url: string): Promise<T> {
  return enqueueRequest(async () => {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });
    } catch (error) {
      throw new Error(
        "Unable to reach MusicBrainz. Check your connection and browser access permissions.",
        { cause: error }
      );
    }

    if (!response.ok) {
      throw new MusicBrainzApiError(
        `MusicBrainz request failed: ${response.status} ${response.statusText}`,
        response.status,
        response.headers.get("Retry-After")
      );
    }

    return response.json() as Promise<T>;
  });
}
```

A few important decisions:

- We explicitly request JSON.
- We use the queue for every API request.
- We distinguish HTTP errors from network errors.
- We retain the `Retry-After` header when available.
- We do not automatically retry failed requests.

**User-Agent limitation:** The browser automatically supplies its own User-Agent. We intentionally do not attempt to set one ourselves because browsers prohibit JavaScript from overriding that header.

MusicBrainz requests a meaningful application-specific User-Agent. This direct-browser approach therefore has a policy limitation, even if the endpoint accepts the request. If we encounter rejection or need to comply fully, we should move the request behind our Cloudflare Worker.

## 6. Normalize release-group responses

Add a helper function:

```typescript
function normalizeReleaseGroup(
  group: MusicBrainzReleaseGroup
): AlbumCandidate {
  const yearMatch = group["first-release-date"]?.match(
    /^(\d{4})/
  );

  const releaseYear = yearMatch
    ? Number(yearMatch[1])
    : null;

  const artists = (group["artist-credit"] ?? []).map(
    (credit, index) => ({
      musicbrainzId: credit.artist.id,
      name: credit.artist.name,
      creditedName: credit.name,
      joinPhrase: credit.joinphrase ?? "",
      position: index,
    })
  );

  return {
    musicbrainzId: group.id,
    title: group.title,
    releaseYear,
    primaryType: group["primary-type"] ?? null,
    artists,
  };
}
```

This is one of the most important functions in the integration.

It separates the external API's data model from our own.

For example, MusicBrainz might return:

```json
{
  "id": "example-release-group-id",
  "title": "Example Album",
  "first-release-date": "1965-04-01",
  "artist-credit": [
    {
      "name": "The Example Band",
      "artist": {
        "id": "example-artist-id",
        "name": "Example Band"
      }
    }
  ]
}
```

Our application receives:

```typescript
{
  musicbrainzId: "example-release-group-id",
  title: "Example Album",
  releaseYear: 1965,
  primaryType: null,
  artists: [
    {
      musicbrainzId: "example-artist-id",
      name: "Example Band",
      creditedName: "The Example Band",
      joinPhrase: "",
      position: 0
    }
  ]
}
```

The application doesn't need to know anything about the original API response structure.

## 7. Implement album search

Add the main public search function:

```typescript
export async function searchReleaseGroups(
  query: string,
  limit = DEFAULT_SEARCH_LIMIT
): Promise<AlbumCandidate[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const params = new URLSearchParams({
    query: trimmedQuery,
    fmt: "json",
    limit: String(Math.min(Math.max(limit, 1), 25)),
  });

  const url = `${API_BASE_URL}/release-group?${params}`;

  const response = await request<MusicBrainzSearchResponse>(
    url
  );

  return response["release-groups"].map(
    normalizeReleaseGroup
  );
}
```

This is the function the eventual album-search interface will call.

Example:

```typescript
const results = await searchReleaseGroups("Kind of Blue");

console.log(results);
```

The MusicBrainz search endpoint uses Lucene search syntax. An unqualified query searches the release-group title field by default. We can add structured title-plus-artist searches later if our initial search experience needs them.

The search endpoint supports a maximum limit of 100, but we intentionally cap our initial implementation at 25.

## 8. Implement release-group lookup

Sometimes we may already have an MBID and want to retrieve the full metadata for that entity.

Add the lookup function:

```typescript
export async function getReleaseGroup(
  musicbrainzId: string
): Promise<AlbumCandidate> {
  const url = new URL(
    `${API_BASE_URL}/release-group/${encodeURIComponent(musicbrainzId)}`
  );

  url.searchParams.set("inc", "artist-credits");
  url.searchParams.set("fmt", "json");

  const response = await request<MusicBrainzReleaseGroup>(
    url.toString()
  );

  return normalizeReleaseGroup(response);
}
```

This is useful for refreshing or retrieving metadata for an album that already has a MusicBrainz ID.

We should not automatically call this for every search result. Search results already include the information we need for the initial album-selection workflow, and unnecessary lookups would consume our request allowance.

## 9. Test the integration

Before building the UI, temporarily test the functions from `src/main.ts`.

For example:

```typescript
import {
  searchReleaseGroups,
  getReleaseGroup,
} from "./services/musicbrainz";

async function testMusicBrainz() {
  try {
    const results = await searchReleaseGroups(
      "Kind of Blue"
    );

    console.log("Search results:", results);

    if (results.length > 0) {
      const album = await getReleaseGroup(
        results[0].musicbrainzId
      );

      console.log("Release group details:", album);
    }
  } catch (error) {
    console.error("MusicBrainz test failed:", error);
  }
}

testMusicBrainz();
```

Run the Vite development server:

```powershell
npm run dev
```

Open the browser developer console.

Verify:

1. The search returns results.
2. Results contain release-group IDs.
3. Titles are populated.
4. Release years are numbers or `null`.
5. Artist credits are normalized correctly.
6. Artist ordering is preserved.
7. Lookup by MBID returns the expected album.
8. An invalid MBID produces a useful error.

If the browser reports a CORS error, direct browser access is not working in this environment. Do not try to work around browser security by disabling it; that would be a reason to reconsider the Worker.

## 10. Search behavior and future considerations

A few things are intentionally not part of this implementation.

### Debouncing

Debouncing belongs in the eventual search UI, not in the API service.

For example, when someone types:

```text
K
Ki
Kin
Kind
Kind of
Kind of Blue
```

We should wait until typing pauses before issuing a search.

The request queue handles request spacing; debouncing prevents us from making unnecessary requests in the first place.

### Caching

We can eventually cache successful search results and release-group lookups in memory.

This is useful when a user repeatedly searches for the same album.

We don't need to introduce a caching library for the initial implementation.

### Artist roles

MusicBrainz artist credits provide names and ordering, but don't reliably tell us which of our database roles (`primary`, `featured`, `other`) to assign.

We preserve the credits and let the application handle role assignment.

### Genres and instruments

We are not enriching genres or instruments through MusicBrainz in this implementation.

Those will be handled separately, with manual editing remaining important.

---

## Completion checklist

- [ ] `src/types/musicbrainz.ts` created.
- [ ] `AlbumCandidate` types defined.
- [ ] Request queue implemented.
- [ ] Generic MusicBrainz request function implemented.
- [ ] Release-group normalization implemented.
- [ ] `searchReleaseGroups()` works.
- [ ] `getReleaseGroup()` works.
- [ ] Artist credits and join phrases preserved.
- [ ] Error handling verified.
- [ ] Browser CORS access verified.
- [ ] No unnecessary requests or automatic retry loops.

Once these tests pass, the MusicBrainz integration is ready for use by the rest of JazzLog.
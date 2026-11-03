import type {
    MusicBrainzAlbumCandidate,
    MusicBrainzReleaseGroup,
    MusicBrainzSearchResponse,
} from "../types/musicbrainz";

const API_BASE_URL = "https://musicbrainz.org/ws/2";

const REQUEST_INTERVAL_MS = 1100;
const DEFAULT_SEARCH_LIMIT = 10;

let requestQueue: Promise<void> = Promise.resolve();
let nextRequestTime = 0;

async function sleep(waitTime: number) {
    await new Promise((resolve) =>
        setTimeout(resolve, waitTime)
    );
}

function enqueueRequest<T>(
    request: () => Promise<T>
): Promise<T> {
    const result = requestQueue.then(async () => {
        const waitTime = nextRequestTime - Date.now();

        if (waitTime > 0) {
            await sleep(waitTime);
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

export class MusicBrainzApiError extends Error {
    public readonly status: number;
    public readonly retryAfter: string | null;

    constructor(
        message: string,
        status: number,
        retryAfter: string | null = null
    ) {
        super(message);
        this.name = "MusicBrainzApiError";
        this.status = status;
        this.retryAfter = retryAfter;
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

function normalizeReleaseGroup(
    group: MusicBrainzReleaseGroup
): MusicBrainzAlbumCandidate {
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

export async function searchReleaseGroups(
    query: string,
    limit = DEFAULT_SEARCH_LIMIT
): Promise<MusicBrainzAlbumCandidate[]> {
    if (limit < 1 || limit > 20) throw new Error("Limit must be between 1 and 20");

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return [];
    }

    const params = new URLSearchParams({
        query: trimmedQuery,
        fmt: "json",
        limit: String(limit),
    });

    const url = `${API_BASE_URL}/release-group?${params}`;

    const response = await request<MusicBrainzSearchResponse>(
        url
    );

    return response["release-groups"].map(
        normalizeReleaseGroup
    );
}

export async function getReleaseGroup(
    musicbrainzId: string
): Promise<MusicBrainzAlbumCandidate> {
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

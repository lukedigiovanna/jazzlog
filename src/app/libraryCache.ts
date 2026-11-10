import type { LibraryData } from "../types/library";

const prefix = "jazzlog-library-v1:";
export type LibrarySnapshot = {
  version: 1;
  accountId: string;
  syncedAt: number;
  data: LibraryData;
};

export function readLibraryCache(
  accountId: string,
): LibrarySnapshot | undefined {
  try {
    const value = JSON.parse(
      localStorage.getItem(prefix + accountId) ?? "null",
    );
    if (
      value?.version !== 1 ||
      value.accountId !== accountId ||
      !Number.isFinite(value.syncedAt)
    )
      return;
    if (
      !["albums", "artists", "genres", "instruments"].every((key) =>
        Array.isArray(value.data?.[key]),
      )
    )
      return;
    const named = (rows: unknown): boolean =>
      Array.isArray(rows) &&
      rows.every(
        (row) =>
          row && typeof row.id === "string" && typeof row.name === "string",
      );
    if (
      !named(value.data.artists) ||
      !named(value.data.genres) ||
      !named(value.data.instruments)
    )
      return;
    if (
      !value.data.instruments.every((row: { categories?: unknown }) =>
        Array.isArray(row.categories),
      )
    )
      return;
    if (
      !value.data.albums.every(
        (album: LibraryData["albums"][number]) =>
          album &&
          typeof album.id === "string" &&
          typeof album.title === "string" &&
          typeof album.createdAt === "string" &&
          typeof album.updatedAt === "string" &&
          named(album.artists) &&
          named(album.genres) &&
          named(album.instruments) &&
          Array.isArray(album.links) &&
          Array.isArray(album.listeningEntries),
      )
    )
      return;
    return value;
  } catch {
    return;
  }
}

export function writeLibraryCache(
  accountId: string,
  data: LibraryData,
  syncedAt = Date.now(),
): boolean {
  try {
    localStorage.setItem(
      prefix + accountId,
      JSON.stringify({ version: 1, accountId, syncedAt, data }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearLibraryCache(accountId: string) {
  try {
    localStorage.removeItem(prefix + accountId);
  } catch {
    /* Storage may be blocked. */
  }
}

// This identifies a locally saved account for offline browsing only. Server
// authorization still goes through Supabase; no token is copied into our cache.
export function cachedAccountId(): string | undefined {
  try {
    const project = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(
      ".",
    )[0];
    const session = JSON.parse(
      localStorage.getItem(`sb-${project}-auth-token`) ?? "null",
    );
    return typeof session?.user?.id === "string" && session.access_token
      ? session.user.id
      : undefined;
  } catch {
    return;
  }
}

import type { LibraryData } from "../types/library";
import {
  readAlbums,
  readArtistCatalog,
  readGenreCatalog,
  readInstrumentCatalog,
  saveAlbums,
} from "./storage";
import { syncAlbumGenres } from "./genres";
import { syncAlbumInstruments } from "./instruments";

export type SaveResult =
  | { status: "saved" }
  | { status: "volatile" }
  | { status: "rejected"; message: string };

type AccountSave = (
  before: LibraryData,
  next: LibraryData,
) => Promise<LibraryData>;

// Each mounted account owns its committed baseline. Features may prepare a
// candidate in data; routes see committed data throughout an account request.
export function createLibraryState(
  initial?: LibraryData,
  saveAccount: AccountSave = async (before, next) => {
    const { saveLibraryChanges } = await import("../services/saveLibrary");
    return saveLibraryChanges(before, next);
  },
) {
  const albums = initial?.albums ?? readAlbums();
  let data = initial ?? {
    albums,
    artists: readArtistCatalog(albums),
    genres: readGenreCatalog(albums),
    instruments: readInstrumentCatalog(albums),
  };
  if (!initial) {
    syncAlbumGenres(data.albums, data.genres);
    syncAlbumInstruments(data.albums, data.instruments);
  }
  let committed = structuredClone(data);
  let saving = false;
  let revision = 0;
  return {
    get revision() {
      return revision;
    },
    replace(next: LibraryData, expectedRevision: number) {
      if (saving || revision !== expectedRevision) return false;
      data = next;
      committed = structuredClone(next);
      revision++;
      return true;
    },
    get data() {
      return data;
    },
    get saving() {
      return saving;
    },
    syncCatalogs() {
      syncAlbumGenres(data.albums, data.genres);
      syncAlbumInstruments(data.albums, data.instruments);
      for (const album of data.albums)
        for (const credit of album.artists) {
          const artist = data.artists.find((item) => item.id === credit.id);
          if (artist) Object.assign(credit, artist);
        }
    },
    async save(): Promise<SaveResult> {
      if (!initial) {
        return {
          status: saveAlbums(
            data.albums,
            data.instruments,
            data.artists,
            data.genres,
          )
            ? "saved"
            : "volatile",
        };
      }
      if (saving)
        return {
          status: "rejected",
          message: "A save is already in progress.",
        };
      const pending = structuredClone(data);
      revision++;
      data = structuredClone(committed);
      saving = true;
      try {
        data = await saveAccount(committed, pending);
        committed = structuredClone(data);
        return { status: "saved" };
      } catch (error) {
        return {
          status: "rejected",
          message:
            (error as { message?: string })?.message || "Please try again.",
        };
      } finally {
        saving = false;
      }
    },
  };
}

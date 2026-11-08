import type { LibraryData } from "../types/library";
import type { Json } from "../types/database.types";
import { supabase } from "./supabase";

import { libraryDelta } from "./libraryDelta";
type Row = Record<string, string | number | boolean | null>;

// Send a delta, never a replacement of the user's entire library. The RPC
// applies it atomically under the caller's existing row-level policies.
export async function saveLibraryChanges(
  before: LibraryData,
  next: LibraryData,
): Promise<LibraryData> {
  const changes = libraryDelta(before, next);
  const { data, error } = await supabase.rpc("save_library_changes", {
    changes: changes as Json,
  });
  if (error) throw error;
  const result = data as Record<string, Row[]>;
  // Keep server-generated timestamps in the local model without a second read
  // that could fail after the transaction has already committed.
  const savedAlbums = new Map(
    (result.albums ?? []).map((row) => [row.id, row]),
  );
  const savedEntries = new Map(
    (result.listening_entries ?? []).map((row) => [row.id, row]),
  );
  for (const album of next.albums) {
    const saved = savedAlbums.get(album.id);
    if (saved) {
      album.createdAt = String(saved.created_at);
      album.updatedAt = String(saved.updated_at);
    }
    for (const entry of album.listeningEntries) {
      const saved = savedEntries.get(entry.id);
      if (saved) {
        entry.createdAt = String(saved.created_at);
        entry.updatedAt = String(saved.updated_at);
        entry.listenedAt = String(saved.listened_at);
      }
    }
  }
  return next;
}

import { supabase } from "./supabase";
import { getAlbums } from "./albums";
import type { LibraryData } from "../app/controller";

import { readAll } from "./readAll";

// RLS scopes all of these reads to the authenticated user's records.
export async function getLibrary(): Promise<LibraryData> {
  const [albums, artistRows, genreRows, instrumentRows] = await Promise.all([
    getAlbums(),
    readAll((from, to) =>
      supabase
        .from("artists")
        .select("id,name,sort_name,country,musicbrainz_id,photo_url")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("genres")
        .select("id,name,parent_genre_id")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("instruments")
        .select("id,name,image_url,instrument_categories(category)")
        .order("id")
        .range(from, to),
    ),
  ]);
  return {
    albums,
    artists: artistRows.map((row) => ({
      id: row.id,
      name: row.name,
      sortName: row.sort_name,
      photoUrl: row.photo_url,
      country: row.country,
      musicbrainzId: row.musicbrainz_id,
    })),
    genres: genreRows.map((row) => ({
      id: row.id,
      name: row.name,
      parentGenreId: row.parent_genre_id,
    })),
    instruments: instrumentRows.map((row) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      categories: row.instrument_categories.map((entry) => entry.category),
    })),
  };
}

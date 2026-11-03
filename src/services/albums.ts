import { supabase } from "./supabase";
import { getCurrentUser } from "./auth";
import type { Tables, TablesInsert, TablesUpdate } from "../types/database.types";

// A complete album record as stored in the database.
export type Album = Tables<"albums">;

// Fields a caller may provide when creating an album. Ownership and
// database-managed fields are assigned by the service/database.
export type NewAlbum = Pick<
    TablesInsert<"albums">,
    | "title"
    | "sort_title"
    | "release_year"
    | "artwork_url"
    | "musicbrainz_release_group_id"
>;

// Fields a caller may edit on an existing album.
export type AlbumUpdates = Pick<
    TablesUpdate<"albums">,
    | "title"
    | "sort_title"
    | "release_year"
    | "artwork_url"
    | "musicbrainz_release_group_id"
>;

// Retrieve the current user's albums.
export async function getAlbums(): Promise<Album[]> {
    const { data, error } = await supabase
        .from("albums")
        .select("*")
        .order("sort_title", { ascending: true })
        .order("title", { ascending: true });

    if (error) throw error;
    return data;
}

// Retrieve one album.
export async function getAlbumById(id: string): Promise<Album | null> {
    const { data, error } = await supabase
        .from("albums")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    return data;
}

// Insert an album owned by the current user.
export async function createAlbum(album: NewAlbum): Promise<Album> {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("You must be signed in to create an album.");
    }

    const { data, error } = await supabase
        .from("albums")
        .insert({ ...album, user_id: user.id })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Update editable album fields.
export async function updateAlbum(
    id: string,
    updates: AlbumUpdates
): Promise<Album> {
    const { data, error } = await supabase
        .from("albums")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Delete an album.
export async function deleteAlbum(id: string): Promise<void> {
    const { error } = await supabase
        .from("albums")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

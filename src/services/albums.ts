import { supabase } from "./supabase";
import { getCurrentUser } from "./auth";
import type { Tables, TablesUpdate } from "../types/database.types";
import type { Album, AlbumUpdates, NewAlbum } from "../types/albums";

type AlbumRow = Tables<"albums">;
type ArtistRow = Tables<"artists">;
type AlbumArtistRow = Tables<"album_artists"> & {
    artists: ArtistRow | null;
};
type AlbumGenreRow = Tables<"album_genres"> & {
    genres: Tables<"genres"> | null;
};
type InstrumentRow = Tables<"instruments"> & {
    instrument_categories: Tables<"instrument_categories">[];
};
type AlbumInstrumentRow = Tables<"album_instruments"> & {
    instruments: InstrumentRow | null;
};

type AlbumQueryRow = AlbumRow & {
    album_artists: AlbumArtistRow[];
    album_genres: AlbumGenreRow[];
    album_instruments: AlbumInstrumentRow[];
    album_links: Tables<"album_links">[];
    listening_entries: Tables<"listening_entries">[];
};

const ALBUM_SELECT = `
    id,
    title,
    sort_title,
    release_year,
    artwork_url,
    musicbrainz_release_group_id,
    created_at,
    updated_at,
    album_artists (
        role,
        position,
        artists (
            id,
            musicbrainz_id,
            name,
            sort_name,
            country
        )
    ),
    album_genres (
        is_primary,
        genres (
            id,
            name,
            parent_genre_id
        )
    ),
    album_instruments (
        notes,
        instruments (
            id,
            name,
            instrument_categories (
                category
            )
        )
    ),
    album_links (
        id,
        url,
        label
    ),
    listening_entries (
        id,
        rating,
        listened_at,
        notes,
        created_at,
        updated_at
    )
`;

// Convert a joined database row into the application-level album shape.
function mapAlbum(row: AlbumQueryRow): Album {
    const artists = row.album_artists
        .flatMap((entry) =>
            entry.artists
                ? [{ entry, artist: entry.artists }]
                : []
        )
        .sort((a, b) => a.entry.position - b.entry.position)
        .map(({ entry, artist }) => ({
            id: artist.id,
            musicbrainzId: artist.musicbrainz_id,
            name: artist.name,
            sortName: artist.sort_name,
            country: artist.country,
            role: entry.role,
            position: entry.position,
        }));

    const genres = row.album_genres
        .flatMap((entry) =>
            entry.genres
                ? [{ entry, genre: entry.genres }]
                : []
        )
        .sort(
            (a, b) =>
                Number(b.entry.is_primary) -
                Number(a.entry.is_primary) ||
                a.genre.name.localeCompare(b.genre.name)
        )
        .map(({ entry, genre }) => ({
            id: genre.id,
            name: genre.name,
            parentGenreId: genre.parent_genre_id,
            isPrimary: entry.is_primary,
        }));

    const instruments = row.album_instruments
        .flatMap((entry) =>
            entry.instruments
                ? [{ entry, instrument: entry.instruments }]
                : []
        )
        .sort((a, b) =>
            a.instrument.name.localeCompare(b.instrument.name)
        )
        .map(({ entry, instrument }) => ({
            id: instrument.id,
            name: instrument.name,
            notes: entry.notes,
            categories: instrument.instrument_categories.map(
                (category) => category.category
            ),
        }));

    const links = row.album_links.map((link) => ({
        id: link.id,
        url: link.url,
        label: link.label,
    }));

    const listeningEntries = [...row.listening_entries]
        .sort(
            (a, b) =>
                Date.parse(b.listened_at) -
                Date.parse(a.listened_at)
        )
        .map((entry) => ({
            id: entry.id,
            rating: entry.rating,
            listenedAt: entry.listened_at,
            notes: entry.notes,
            createdAt: entry.created_at,
            updatedAt: entry.updated_at,
        }));

    return {
        id: row.id,
        title: row.title,
        sortTitle: row.sort_title,
        releaseYear: row.release_year,
        artworkUrl: row.artwork_url,
        musicbrainzReleaseGroupId: row.musicbrainz_release_group_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        artists,
        genres,
        instruments,
        links,
        listeningEntries,
    };
}

// Retrieve the current user's albums with their related records.
export async function getAlbums(): Promise<Album[]> {
    const { data, error } = await supabase
        .from("albums")
        .select(ALBUM_SELECT)
        .order("sort_title", { ascending: true })
        .order("title", { ascending: true });

    if (error) throw error;
    return (data as unknown as AlbumQueryRow[]).map(mapAlbum);
}

// Retrieve one album with its related records.
export async function getAlbumById(
    id: string
): Promise<Album | null> {
    const { data, error } = await supabase
        .from("albums")
        .select(ALBUM_SELECT)
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    return data
        ? mapAlbum(data as unknown as AlbumQueryRow)
        : null;
}

// Insert an album owned by the current user and return its full representation.
export async function createAlbum(album: NewAlbum): Promise<Album> {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("You must be signed in to create an album.");
    }

    const { data, error } = await supabase
        .from("albums")
        .insert({
            title: album.title,
            sort_title: album.sortTitle ?? null,
            release_year: album.releaseYear ?? null,
            artwork_url: album.artworkUrl ?? null,
            musicbrainz_release_group_id:
                album.musicbrainzReleaseGroupId ?? null,
            user_id: user.id,
        })
        .select("id")
        .single();

    if (error) throw error;

    const created = await getAlbumById(data.id);

    if (!created) {
        throw new Error("Failed to load the created album.");
    }

    return created;
}

// Update editable album fields and return the full representation.
export async function updateAlbum(
    id: string,
    updates: AlbumUpdates
): Promise<Album> {
    const dbUpdates: TablesUpdate<"albums"> = {};

    if (updates.title !== undefined) {
        dbUpdates.title = updates.title;
    }
    if (updates.sortTitle !== undefined) {
        dbUpdates.sort_title = updates.sortTitle;
    }
    if (updates.releaseYear !== undefined) {
        dbUpdates.release_year = updates.releaseYear;
    }
    if (updates.artworkUrl !== undefined) {
        dbUpdates.artwork_url = updates.artworkUrl;
    }
    if (updates.musicbrainzReleaseGroupId !== undefined) {
        dbUpdates.musicbrainz_release_group_id =
            updates.musicbrainzReleaseGroupId;
    }

    if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
            .from("albums")
            .update(dbUpdates)
            .eq("id", id)
            .select("id")
            .single();

        if (error) throw error;
    }

    const album = await getAlbumById(id);

    if (!album) {
        throw new Error("Album not found.");
    }

    return album;
}

// Delete an album.
export async function deleteAlbum(id: string): Promise<void> {
    const { error } = await supabase
        .from("albums")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

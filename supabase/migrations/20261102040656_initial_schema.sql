
-- ============================================================
-- 1. PROFILES
-- ============================================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    created_at timestamptz not null default now()
);


-- ============================================================
-- 2. ARTISTS
-- ============================================================

create table public.artists (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    name text not null check (length(btrim(name)) > 0),
    sort_name text,
    country text,
    musicbrainz_id uuid,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (id, user_id),
    unique (user_id, musicbrainz_id)
);


-- ============================================================
-- 3. ALBUMS
-- ============================================================

create table public.albums (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    title text not null check (length(btrim(title)) > 0),
    sort_title text,
    release_year smallint check (
        release_year between 1000 and 9999
    ),

    artwork_url text,
    musicbrainz_release_group_id uuid,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (id, user_id),
    unique (user_id, musicbrainz_release_group_id)
);


-- ============================================================
-- 4. ALBUM ARTISTS
-- ============================================================

create type public.artist_role as enum (
    'primary',
    'featured',
    'other'
);

create table public.album_artists (
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    album_id uuid not null,
    artist_id uuid not null,

    role public.artist_role not null default 'primary',

    position smallint not null default 0
        check (position >= 0),

    created_at timestamptz not null default now(),

    primary key (album_id, artist_id),

    -- Each artist has a distinct credit position per album.
    unique (album_id, position),

    -- Ensure album and artist belong to the same user.
    foreign key (album_id, user_id)
        references public.albums(id, user_id)
        on delete cascade,

    foreign key (artist_id, user_id)
        references public.artists(id, user_id)
        on delete cascade
);


-- ============================================================
-- 5. LISTENING ENTRIES
-- ============================================================

create table public.listening_entries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    album_id uuid not null,

    rating smallint not null
        check (rating between 1 and 10),

    listened_at timestamptz not null default now(),
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    foreign key (album_id, user_id)
        references public.albums(id, user_id)
        on delete cascade
);


-- ============================================================
-- 6. GENRES
-- ============================================================

create table public.genres (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    name text not null check (length(btrim(name)) > 0),
    parent_genre_id uuid,

    created_at timestamptz not null default now(),

    unique (id, user_id),

    -- Parent genre must belong to the same user.
    foreign key (parent_genre_id, user_id)
        references public.genres(id, user_id)
        on delete restrict,

    -- Prevent a genre from being its own parent.
    check (parent_genre_id is null or parent_genre_id <> id)
);

-- A user cannot create duplicate genre names.
create unique index genres_user_name_unique_idx
    on public.genres (user_id, lower(name));


-- ============================================================
-- 7. ALBUM GENRES
-- ============================================================

create table public.album_genres (
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    album_id uuid not null,
    genre_id uuid not null,

    is_primary boolean not null default false,
    created_at timestamptz not null default now(),

    primary key (album_id, genre_id),

    foreign key (album_id, user_id)
        references public.albums(id, user_id)
        on delete cascade,

    foreign key (genre_id, user_id)
        references public.genres(id, user_id)
        on delete cascade
);

-- An album can have at most one primary genre.
create unique index album_genres_one_primary_idx
    on public.album_genres (album_id)
    where is_primary = true;


-- ============================================================
-- 8. INSTRUMENTS
-- ============================================================

create table public.instruments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    name text not null check (length(btrim(name)) > 0),

    created_at timestamptz not null default now(),

    unique (id, user_id)
);

create unique index instruments_user_name_unique_idx
    on public.instruments (user_id, lower(name));


-- ============================================================
-- 9. INSTRUMENT CATEGORIES
-- ============================================================

create type public.instrument_category as enum (
    'percussion',
    'strings',
    'woodwind',
    'brass',
    'keyboard',
    'electronic',
    'voice',
    'other'
);

create table public.instrument_categories (
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    instrument_id uuid not null,
    category public.instrument_category not null,

    primary key (instrument_id, category),

    foreign key (instrument_id, user_id)
        references public.instruments(id, user_id)
        on delete cascade
);


-- ============================================================
-- 10. ALBUM INSTRUMENTS
-- ============================================================

create table public.album_instruments (
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    album_id uuid not null,
    instrument_id uuid not null,

    notes text,
    created_at timestamptz not null default now(),

    primary key (album_id, instrument_id),

    foreign key (album_id, user_id)
        references public.albums(id, user_id)
        on delete cascade,

    foreign key (instrument_id, user_id)
        references public.instruments(id, user_id)
        on delete cascade
);


-- ============================================================
-- 11. UPDATED_AT TRIGGER
-- ============================================================

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger set_artists_updated_at
    before update on public.artists
    for each row execute function public.set_updated_at();

create trigger set_albums_updated_at
    before update on public.albums
    for each row execute function public.set_updated_at();

create trigger set_listening_entries_updated_at
    before update on public.listening_entries
    for each row execute function public.set_updated_at();


-- ============================================================
-- 12. AUTOMATIC PROFILE CREATION
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        new.raw_user_meta_data ->> 'display_name'
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- ============================================================
-- 13. INDEXES
-- ============================================================

create index album_artists_user_id_idx
    on public.album_artists (user_id);

create index listening_entries_user_listened_at_idx
    on public.listening_entries (user_id, listened_at desc);

create index listening_entries_album_listened_at_idx
    on public.listening_entries (album_id, listened_at desc);

create index genres_parent_genre_id_idx
    on public.genres (parent_genre_id);

create index album_genres_user_id_idx
    on public.album_genres (user_id);

create index album_genres_genre_id_idx
    on public.album_genres (genre_id);

create index instrument_categories_user_id_idx
    on public.instrument_categories (user_id);

create index instrument_categories_category_idx
    on public.instrument_categories (category);

create index album_instruments_user_id_idx
    on public.album_instruments (user_id);

create index album_instruments_instrument_id_idx
    on public.album_instruments (instrument_id);


-- ============================================================
-- 14. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.album_artists enable row level security;
alter table public.listening_entries enable row level security;
alter table public.genres enable row level security;
alter table public.album_genres enable row level security;
alter table public.instruments enable row level security;
alter table public.instrument_categories enable row level security;
alter table public.album_instruments enable row level security;


-- Profiles: users can read and update their own profile.

create policy "Users can view their own profile"
    on public.profiles
    for select
    to authenticated
    using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
    on public.profiles
    for insert
    to authenticated
    with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
    on public.profiles
    for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);


-- User-owned tables: users can only access their own rows.

create policy "Users manage their own artists"
    on public.artists
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users manage their own albums"
    on public.albums
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users manage their own album artists"
    on public.album_artists
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users manage their own listening entries"
    on public.listening_entries
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users manage their own genres"
    on public.genres
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users manage their own album genres"
    on public.album_genres
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users manage their own instruments"
    on public.instruments
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users manage their own instrument categories"
    on public.instrument_categories
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users manage their own album instruments"
    on public.album_instruments
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);


-- ============================================================
-- 15. TABLE PERMISSIONS
-- ============================================================

-- Remove anonymous access to application tables.
revoke all on public.profiles from anon;
revoke all on public.artists from anon;
revoke all on public.albums from anon;
revoke all on public.album_artists from anon;
revoke all on public.listening_entries from anon;
revoke all on public.genres from anon;
revoke all on public.album_genres from anon;
revoke all on public.instruments from anon;
revoke all on public.instrument_categories from anon;
revoke all on public.album_instruments from anon;

-- Authenticated users receive table permissions.
-- RLS determines which rows they can actually access.

grant select, insert, update, delete
    on public.profiles to authenticated;

grant select, insert, update, delete
    on public.artists to authenticated;

grant select, insert, update, delete
    on public.albums to authenticated;

grant select, insert, update, delete
    on public.album_artists to authenticated;

grant select, insert, update, delete
    on public.listening_entries to authenticated;

grant select, insert, update, delete
    on public.genres to authenticated;

grant select, insert, update, delete
    on public.album_genres to authenticated;

grant select, insert, update, delete
    on public.instruments to authenticated;

grant select, insert, update, delete
    on public.instrument_categories to authenticated;

grant select, insert, update, delete
    on public.album_instruments to authenticated;

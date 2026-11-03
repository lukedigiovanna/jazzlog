
-- ============================================================
-- JAZZLOG MIGRATION: ADD ALBUM LINKS
-- ============================================================

-- ============================================================
-- 1. ALBUM LINKS
-- ============================================================

create table public.album_links (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,

    album_id uuid not null,

    url text not null
        check (
            length(btrim(url)) > 0
            and url ~* '^https?://'
        ),

    -- Optional description to distinguish multiple links
    -- to the same provider (e.g. original, remaster, live).
    label text
        check (label is null or length(btrim(label)) > 0),

    created_at timestamptz not null default now(),

    -- Prevent duplicate links for the same album.
    unique (album_id, url),

    -- Ensure the link belongs to an album owned by the same user.
    foreign key (album_id, user_id)
        references public.albums(id, user_id)
        on delete cascade
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

create index album_links_user_id_idx
    on public.album_links (user_id);

create index album_links_album_id_idx
    on public.album_links (album_id);


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table public.album_links enable row level security;


-- Users can only access links belonging to their own albums.

create policy "Users manage their own album links"
    on public.album_links
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

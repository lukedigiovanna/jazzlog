-- Optional user-provided catalog images. Existing entries retain their fallbacks.
alter table public.artists add column photo_url text;
alter table public.instruments add column image_url text;

create or replace function public.save_library_changes(changes jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    result jsonb := '{}'::jsonb;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;
    delete from public.listening_entries t
    using jsonb_populate_recordset(null::public.listening_entries, coalesce(changes->'listening_entries'->'deleted', '[]'::jsonb)) r
    where t.id = r.id;
    delete from public.album_links t
    using jsonb_populate_recordset(null::public.album_links, coalesce(changes->'album_links'->'deleted', '[]'::jsonb)) r
    where t.id = r.id;
    delete from public.album_instruments t
    using jsonb_populate_recordset(null::public.album_instruments, coalesce(changes->'album_instruments'->'deleted', '[]'::jsonb)) r
    where t.album_id = r.album_id and t.instrument_id = r.instrument_id;
    delete from public.album_genres t
    using jsonb_populate_recordset(null::public.album_genres, coalesce(changes->'album_genres'->'deleted', '[]'::jsonb)) r
    where t.album_id = r.album_id and t.genre_id = r.genre_id;
    delete from public.album_artists t
    using jsonb_populate_recordset(null::public.album_artists, coalesce(changes->'album_artists'->'deleted', '[]'::jsonb)) r
    where t.album_id = r.album_id and t.artist_id = r.artist_id;
    delete from public.instrument_categories t
    using jsonb_populate_recordset(null::public.instrument_categories, coalesce(changes->'instrument_categories'->'deleted', '[]'::jsonb)) r
    where t.instrument_id = r.instrument_id and t.category = r.category;
    delete from public.albums t
    using jsonb_populate_recordset(null::public.albums, coalesce(changes->'albums'->'deleted', '[]'::jsonb)) r
    where t.id = r.id;
    delete from public.instruments t
    using jsonb_populate_recordset(null::public.instruments, coalesce(changes->'instruments'->'deleted', '[]'::jsonb)) r
    where t.id = r.id;
    delete from public.genres t
    using jsonb_populate_recordset(null::public.genres, coalesce(changes->'genres'->'deleted', '[]'::jsonb)) r
    where t.id = r.id;
    delete from public.artists t
    using jsonb_populate_recordset(null::public.artists, coalesce(changes->'artists'->'deleted', '[]'::jsonb)) r
    where t.id = r.id;
    with saved as (
        insert into public.artists (id, name, sort_name, country, musicbrainz_id, photo_url, user_id)
        select r.id, r.name, r.sort_name, r.country, r.musicbrainz_id, r.photo_url, auth.uid()
        from jsonb_populate_recordset(null::public.artists, coalesce(changes->'artists'->'saved', '[]'::jsonb)) r
        on conflict (id) do update set name = excluded.name, sort_name = excluded.sort_name, country = excluded.country, musicbrainz_id = excluded.musicbrainz_id, photo_url = excluded.photo_url
        returning *
    ) select result || jsonb_build_object('artists', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    with saved as (
        insert into public.genres (id, name, parent_genre_id, user_id)
        select r.id, r.name, r.parent_genre_id, auth.uid()
        from jsonb_populate_recordset(null::public.genres, coalesce(changes->'genres'->'saved', '[]'::jsonb)) r
        on conflict (id) do update set name = excluded.name, parent_genre_id = excluded.parent_genre_id
        returning *
    ) select result || jsonb_build_object('genres', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    with saved as (
        insert into public.instruments (id, name, image_url, user_id)
        select r.id, r.name, r.image_url, auth.uid()
        from jsonb_populate_recordset(null::public.instruments, coalesce(changes->'instruments'->'saved', '[]'::jsonb)) r
        on conflict (id) do update set name = excluded.name, image_url = excluded.image_url
        returning *
    ) select result || jsonb_build_object('instruments', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    with saved as (
        insert into public.albums (id, title, sort_title, release_year, artwork_url, musicbrainz_release_group_id, record_label, user_id)
        select r.id, r.title, r.sort_title, r.release_year, r.artwork_url, r.musicbrainz_release_group_id, r.record_label, auth.uid()
        from jsonb_populate_recordset(null::public.albums, coalesce(changes->'albums'->'saved', '[]'::jsonb)) r
        on conflict (id) do update set title = excluded.title, sort_title = excluded.sort_title, release_year = excluded.release_year, artwork_url = excluded.artwork_url, musicbrainz_release_group_id = excluded.musicbrainz_release_group_id, record_label = excluded.record_label
        returning *
    ) select result || jsonb_build_object('albums', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    with saved as (
        insert into public.instrument_categories (instrument_id, category, user_id)
        select r.instrument_id, r.category, auth.uid()
        from jsonb_populate_recordset(null::public.instrument_categories, coalesce(changes->'instrument_categories'->'saved', '[]'::jsonb)) r
        on conflict (instrument_id, category) do nothing
        returning *
    ) select result || jsonb_build_object('instrument_categories', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    with saved as (
        insert into public.album_artists (album_id, artist_id, role, position, user_id)
        select r.album_id, r.artist_id, r.role, r.position, auth.uid()
        from jsonb_populate_recordset(null::public.album_artists, coalesce(changes->'album_artists'->'saved', '[]'::jsonb)) r
        on conflict (album_id, artist_id) do update set role = excluded.role, position = excluded.position
        returning *
    ) select result || jsonb_build_object('album_artists', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    with saved as (
        insert into public.album_genres (album_id, genre_id, is_primary, user_id)
        select r.album_id, r.genre_id, r.is_primary, auth.uid()
        from jsonb_populate_recordset(null::public.album_genres, coalesce(changes->'album_genres'->'saved', '[]'::jsonb)) r
        on conflict (album_id, genre_id) do update set is_primary = excluded.is_primary
        returning *
    ) select result || jsonb_build_object('album_genres', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    with saved as (
        insert into public.album_instruments (album_id, instrument_id, notes, user_id)
        select r.album_id, r.instrument_id, r.notes, auth.uid()
        from jsonb_populate_recordset(null::public.album_instruments, coalesce(changes->'album_instruments'->'saved', '[]'::jsonb)) r
        on conflict (album_id, instrument_id) do update set notes = excluded.notes
        returning *
    ) select result || jsonb_build_object('album_instruments', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    with saved as (
        insert into public.album_links (id, album_id, url, label, user_id)
        select r.id, r.album_id, r.url, r.label, auth.uid()
        from jsonb_populate_recordset(null::public.album_links, coalesce(changes->'album_links'->'saved', '[]'::jsonb)) r
        on conflict (id) do update set album_id = excluded.album_id, url = excluded.url, label = excluded.label
        returning *
    ) select result || jsonb_build_object('album_links', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    with saved as (
        insert into public.listening_entries (id, album_id, rating, listened_at, notes, user_id)
        select r.id, r.album_id, r.rating, r.listened_at, r.notes, auth.uid()
        from jsonb_populate_recordset(null::public.listening_entries, coalesce(changes->'listening_entries'->'saved', '[]'::jsonb)) r
        on conflict (id) do update set album_id = excluded.album_id, rating = excluded.rating, listened_at = excluded.listened_at, notes = excluded.notes
        returning *
    ) select result || jsonb_build_object('listening_entries', coalesce(jsonb_agg(to_jsonb(saved)), '[]'::jsonb)) into result from saved;
    -- Related edits also change the album's last-modified time.
    with touched as (
        update public.albums a set updated_at = now()
        where a.id in (
            select (entry->>'album_id')::uuid
            from jsonb_each(changes) change
            cross join lateral jsonb_array_elements(
                coalesce(change.value->'saved', '[]'::jsonb) ||
                coalesce(change.value->'deleted', '[]'::jsonb)
            ) entry
            where change.key in ('album_artists', 'album_genres',
                'album_instruments', 'album_links', 'listening_entries')
        )
        returning a.*
    ) select jsonb_set(result, '{albums}',
        (result->'albums') || coalesce(jsonb_agg(to_jsonb(touched)), '[]'::jsonb))
      into result from touched;

    if exists (
        with recursive parents as (
            select id, parent_genre_id, array[id] as path, false as cycle
            from public.genres
            union all
            select p.id, g.parent_genre_id, p.path || g.id, g.id = any(p.path)
            from parents p join public.genres g on g.id = p.parent_genre_id
            where not p.cycle
        ) select 1 from parents where cycle
    ) then
        raise exception 'Genre parents cannot create a cycle';
    end if;
    return result;
end;
$$;
revoke all on function public.save_library_changes(jsonb) from public, anon;
grant execute on function public.save_library_changes(jsonb) to authenticated;

-- Run against a disposable, migrated database:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/save_library_changes.sql
-- All fixture data and changes are rolled back.
begin;

create function pg_temp.assert_true(ok boolean, message text)
returns void language plpgsql as $$
begin
    if ok is distinct from true then raise exception '%', message; end if;
end;
$$;

insert into auth.users (id) values
    ('11111111-1111-4111-8111-111111111111'),
    ('22222222-2222-4222-8222-222222222222');
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select public.save_library_changes('{
    "artists": {"saved": [{"id": "00000000-0000-4000-8000-000000000001", "name": "Artist"}]},
    "genres": {"saved": [
        {"id": "00000000-0000-4000-8000-000000000002", "name": "Child", "parent_genre_id": "00000000-0000-4000-8000-000000000003"},
        {"id": "00000000-0000-4000-8000-000000000003", "name": "Parent"}
    ]},
    "instruments": {"saved": [{"id": "00000000-0000-4000-8000-000000000004", "name": "Sax"}]},
    "albums": {"saved": [{"id": "00000000-0000-4000-8000-000000000005", "title": "Album", "record_label": "Blue Note"}]},
    "album_artists": {"saved": [{"album_id": "00000000-0000-4000-8000-000000000005", "artist_id": "00000000-0000-4000-8000-000000000001", "position": 0, "role": "primary"}]},
    "album_genres": {"saved": [{"album_id": "00000000-0000-4000-8000-000000000005", "genre_id": "00000000-0000-4000-8000-000000000002", "is_primary": true}]},
    "album_instruments": {"saved": [{"album_id": "00000000-0000-4000-8000-000000000005", "instrument_id": "00000000-0000-4000-8000-000000000004", "notes": "Solo"}]},
    "instrument_categories": {"saved": [{"instrument_id": "00000000-0000-4000-8000-000000000004", "category": "woodwind"}]},
    "album_links": {"saved": [{"id": "00000000-0000-4000-8000-000000000006", "album_id": "00000000-0000-4000-8000-000000000005", "url": "https://example.com"}]},
    "listening_entries": {"saved": [{"id": "00000000-0000-4000-8000-000000000007", "album_id": "00000000-0000-4000-8000-000000000005", "rating": 9, "listened_at": "2026-11-07"}]}
}'::jsonb);
set constraints all immediate;
select pg_temp.assert_true((select record_label = 'Blue Note' from public.albums), 'Record label missing');
select pg_temp.assert_true(
    (select count(*) = 1 from public.album_links), 'Related album records were not saved');
select pg_temp.assert_true(
    (select created_at is not null and updated_at is not null from public.listening_entries), 'Server timestamps missing');

select public.save_library_changes('{
    "artists": {"saved": [{"id": "00000000-0000-4000-8000-000000000001", "name": "Renamed"}]},
    "listening_entries": {"saved": [{"id": "00000000-0000-4000-8000-000000000007", "album_id": "00000000-0000-4000-8000-000000000005", "rating": 10, "listened_at": "2026-11-06"}]}
}'::jsonb);
select pg_temp.assert_true((select name = 'Renamed' from public.artists), 'Artist update missing');
select pg_temp.assert_true((select rating = 10 from public.listening_entries), 'Listen update missing');

do $$
begin
    begin
        perform public.save_library_changes('{
            "albums": {"saved": [{"id": "00000000-0000-4000-8000-000000000005", "title": "Must roll back"}]},
            "listening_entries": {"saved": [{"id": "00000000-0000-4000-8000-000000000007", "album_id": "00000000-0000-4000-8000-000000000005", "rating": 99, "listened_at": "2026-11-07"}]}
        }'::jsonb);
        raise exception 'Invalid rating was accepted';
    exception when check_violation then null;
    end;
    begin
        perform public.save_library_changes('{
            "genres": {"saved": [{"id": "00000000-0000-4000-8000-000000000003", "name": "Parent", "parent_genre_id": "00000000-0000-4000-8000-000000000002"}]}
        }'::jsonb);
        raise exception 'Cycle was accepted';
    exception when raise_exception then
        if sqlerrm <> 'Genre parents cannot create a cycle' then raise; end if;
    end;
end;
$$;
select pg_temp.assert_true((select title = 'Album' from public.albums), 'Failed save did not roll back');

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select pg_temp.assert_true((select count(*) = 0 from public.albums), 'RLS exposed another user album');
do $$
begin
    begin
        perform public.save_library_changes('{
            "albums": {"saved": [{"id": "00000000-0000-4000-8000-000000000005", "title": "Stolen"}]}
        }'::jsonb);
        raise exception 'Cross-user write was accepted';
    exception when insufficient_privilege then null;
    end;
end;
$$;
select public.save_library_changes('{
    "albums": {"deleted": [{"id": "00000000-0000-4000-8000-000000000005"}]}
}'::jsonb);
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select pg_temp.assert_true((select title = 'Album' from public.albums), 'Cross-user delete succeeded');
rollback;
